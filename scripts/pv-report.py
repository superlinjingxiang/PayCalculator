#!/usr/bin/env python3
"""Anonymous PV aggregation, Python 3.6+, no external dependencies.

Track file identity plus byte offset, never deduplicate by timestamp/path. Rotation
must rename (not copytruncate), nocompress; read/aggregate under an exclusive lock.
The state, logs and reports must remain outside the public document root.
"""
import argparse
from collections import Counter
from datetime import datetime, timedelta, timezone
import html
import json
import os
from pathlib import Path
import tempfile

SHANGHAI = timezone(timedelta(hours=8), "Asia/Shanghai")
PAGES = ("/", "/salary-calculator/", "/shanghai-salary-calculator/",
         "/methodology/", "/policy-sources/", "/privacy/", "/about/")
LIMITS = "JS禁用、拦截或故障会漏报；自动化和伪造请求可能增加PV。PV不是UV，也不代表真人数或搜索曝光。"


def private_destination(path):
    destination = Path(path).resolve()
    root = Path(__file__).resolve().parent.parent
    for name in ("public", "out"):
        public_root = (root / name).resolve()
        if destination == public_root or public_root in destination.parents:
            raise ValueError("PV state and reports must remain outside public/ and out/: {}".format(path))
    return destination


def timestamp(value):
    # Python 3.6 strptime supports numeric offsets without the colon.
    value = value.strip().replace("Z", "+0000")
    if len(value) >= 6 and value[-3] == ":":
        value = value[:-3] + value[-2:]
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%S%z").astimezone(SHANGHAI)


def private_write(path, value):
    path = private_destination(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=str(path.parent), prefix=".pv-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(value)
        os.chmod(name, 0o600)
        os.replace(name, str(path))
    finally:
        if os.path.exists(name):
            os.unlink(name)


def aggregate(log_dir, state, now):
    counts = Counter(state.get("counts", {}))
    files = state.setdefault("files", {})
    seen = set()
    first = state.get("first_event")
    last = state.get("last_event")
    rejected = state.get("rejected_lines", 0)
    paths = sorted(Path(log_dir).glob("pageviews.log*"))
    for path in paths:
        if not path.is_file() or path.suffix == ".gz":
            continue
        try:
            source = path.open("rb")
        except FileNotFoundError:
            # Rotation can rename this path after is_file(). Keep its existing
            # checkpoint; a later scan can discover the new rotated name.
            continue
        with source:
            stat = os.fstat(source.fileno())
            identity = "{}:{}".format(stat.st_dev, stat.st_ino)
            if identity in seen:
                continue
            seen.add(identity)
            record = files.get(identity, {"offset": 0})
            offset = record["offset"]
            # Detect inode reuse / truncation with a prefix fingerprint, too.
            prefix = source.read(min(64, stat.st_size)).hex()
            if stat.st_size < offset or (record.get("prefix") and not prefix.startswith(record["prefix"])):
                offset = 0
            source.seek(offset)
            while True:
                start = source.tell()
                line = source.readline()
                if not line:
                    break
                if not line.endswith(b"\n"):
                    source.seek(start)  # A concurrent append may finish this line later.
                    break
                try:
                    raw_time, page = line.decode("utf-8").strip().split("\t")
                    moment = timestamp(raw_time)
                    if page not in PAGES:
                        raise ValueError("invalid page")
                except (ValueError, UnicodeDecodeError):
                    rejected += 1
                    continue
                if moment > now:
                    # Collection may append the next second while this scan is
                    # running. Leave this line and the following range unread
                    # so the next report can count them without losing events.
                    source.seek(start)
                    break
                stamp = moment.isoformat()
                first = min(first, stamp) if first else stamp
                last = max(last, stamp) if last else stamp
                counts[moment.date().isoformat() + "|" + page] += 1
            files[identity] = {"offset": source.tell(), "prefix": prefix}
    # Keep checkpoints across a scan/rename race; an inode briefly absent from
    # this glob must not be replayed from zero when its rotated name reappears.
    state.update(counts=dict(counts), first_event=first, last_event=last,
                 rejected_lines=rejected, files=files)
    return state


def report(state, collection_start, now, environment):
    start = timestamp(collection_start) if collection_start else None
    today = now.date()
    daily = []
    counts = state.get("counts", {})
    for index in range(29, -1, -1):
        date = today - timedelta(days=index)
        pages = {page: counts.get(date.isoformat() + "|" + page, 0) for page in PAGES}
        covered = bool(start and date >= start.date())
        daily.append({"date": date.isoformat(), "pv": sum(pages.values()), "pages": pages,
                      "covered": covered, "partial": covered and (date == start.date() or date == today)})
    windows = {}
    for days, label in ((1, "today"), (7, "last7"), (30, "last30")):
        rows = daily[-days:]
        pages = {page: sum(row["pages"][page] for row in rows) for page in PAGES}
        windows[label] = {"pv": sum(pages.values()), "pages": pages,
                          "covered_days": sum(row["covered"] for row in rows), "requested_days": days}
    return {"environment": environment, "timezone": "Asia/Shanghai", "generated_at": now.isoformat(),
            "collection_start": start.isoformat() if start else None,
            "coverage_start": max(start.date(), today - timedelta(days=29)).isoformat() if start else None,
            "coverage_end": now.isoformat() if start else None,
            "first_event": state.get("first_event"), "last_event": state.get("last_event"),
            "no_data": not bool(state.get("first_event")), "windows": windows, "daily": daily,
            "rejected_lines": state.get("rejected_lines", 0), "limitations": LIMITS}


def render_html(data):
    esc = lambda value: html.escape(str(value))
    label = "预览环境（HTTP/IP，noindex）" if data["environment"] == "preview" else "正式环境"
    cards = "".join("<li>{}：{} PV（覆盖 {}/{} 天）</li>".format(
        title, data["windows"][key]["pv"], data["windows"][key]["covered_days"], days)
        for key, title, days in (("today", "今日", 1), ("last7", "近7日", 7), ("last30", "近30日", 30)))
    rows = "".join("<tr><td>{}</td><td>{}</td><td>{}</td></tr>".format(
        row["date"], row["pv"] if row["covered"] else "—",
        "未覆盖" if not row["covered"] else "不完整日" if row["partial"] else "已覆盖") for row in data["daily"])
    pages = "".join("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>".format(
        esc(page), *(data["windows"][key]["pages"][page] for key in ("today", "last7", "last30"))) for page in PAGES)
    return """<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PayTools 浏览量报告</title><style>body{{font:16px/1.7 system-ui;max-width:1000px;margin:32px auto;padding:0 20px;color:#17203a}}table{{border-collapse:collapse;width:100%;margin:24px 0}}td,th{{border:1px solid #ddd;padding:8px;text-align:left;overflow-wrap:anywhere}}.notice{{padding:16px;background:#fff3d1}}h1{{font-size:28px}}</style>
<h1>PayTools 页面浏览量</h1><p>{label} · Asia/Shanghai</p><p>生成时间：{generated}</p>{empty}
<p>采集起点：{start}<br>本报告启用区间：{coverage} 至 {end}<br>首日及今日为不完整日；启用前数据未采集。启用区间不证明持续正常运行，停机或漏报可能造成空缺。</p>
<p>首条成功记录：{first}<br>最近成功记录：{last}</p><ul>{cards}</ul>
<h2>每日PV</h2><table><tr><th>上海日期</th><th>PV</th><th>覆盖</th></tr>{rows}</table>
<h2>页面明细</h2><table><tr><th>页面</th><th>今日</th><th>近7日</th><th>近30日</th></tr>{pages}</table>
<p>{limits}</p><p>仅采集成功GET的固定页面与时间；原始日志保留30天。报告为站长本地文件，请勿放入公开站点目录。</p></html>""".format(
        label=label, generated=esc(data["generated_at"]), empty='<p class="notice">暂无采集数据。请核对采集是否启用；零值不代表采集成功。</p>' if data["no_data"] else "",
        start=esc(data["collection_start"] or "未记录"), coverage=esc(data["coverage_start"] or "无"),
        end=esc(data["coverage_end"] or "无"), first=esc(data["first_event"] or "暂无"), last=esc(data["last_event"] or "暂无"),
        cards=cards, rows=rows, pages=pages, limits=esc(data["limitations"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--log-dir")
    parser.add_argument("--state")
    parser.add_argument("--collection-start-file")
    parser.add_argument("--environment", choices=("preview", "production"), default="preview")
    parser.add_argument("--output-json")
    parser.add_argument("--output-html")
    parser.add_argument("--input-json", help="Render a previously retrieved aggregate locally")
    parser.add_argument("--stdout-json", action="store_true")
    parser.add_argument("--now", help="ISO timestamp; deterministic verification only")
    args = parser.parse_args()
    try:
        for name in ("state", "output_json", "output_html"):
            value = getattr(args, name)
            if value:
                setattr(args, name, private_destination(value))
    except ValueError as error:
        parser.error(str(error))
    if args.input_json:
        data = json.loads(Path(args.input_json).read_text(encoding="utf-8-sig"))
    else:
        if not args.log_dir or not args.state or not args.collection_start_file:
            parser.error("--log-dir, --state and --collection-start-file required")
        if not Path(args.log_dir).is_dir():
            parser.error("log directory missing; collection is not configured")
        now = timestamp(args.now) if args.now else datetime.now(SHANGHAI).replace(microsecond=0)
        # Required deployment metadata must be valid before creating a lock,
        # reading logs or changing any persisted aggregate.
        try:
            start = Path(args.collection_start_file).read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            parser.error("required collection-start file missing; collection is not configured")
        try:
            collection_start = timestamp(start)
        except ValueError:
            parser.error("collection-start file must contain a valid ISO timestamp")
        if collection_start > now:
            parser.error("collection start is in the future")
        state_path = Path(args.state)
        state_path.parent.mkdir(parents=True, exist_ok=True)
        # flock is available on the Linux server. Windows is only used to render a retrieved report.
        import fcntl
        with open(str(state_path) + ".lock", "a") as lock:
            os.chmod(str(state_path) + ".lock", 0o600)
            fcntl.flock(lock, fcntl.LOCK_EX)
            state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}
            state = aggregate(args.log_dir, state, now)
            data = report(state, start, now, args.environment)
            private_write(state_path, json.dumps(state, ensure_ascii=False))
    serialized = json.dumps(data, ensure_ascii=False, indent=2)
    if args.output_json:
        private_write(args.output_json, serialized)
    if args.output_html:
        private_write(args.output_html, render_html(data))
    if args.stdout_json:
        print(serialized)


if __name__ == "__main__":
    main()
