# 静态站部署说明

## 成熟统计切换（Umami 3.4.1）

工资工具仍静态导出、本地计算；新增统计应用/数据库由独立部署管理。官方镜像锁定 `ghcr.io/umami-software/umami:3.4.1`（无v，不用latest），PostgreSQL仅容器内可达，应用后台仅loopback。不得改既有容器、新购SLS/RUM或开放新公网端口。设置PRIVATE_MODE=1并关闭遥测、外部更新/MCP，私有凭证不进入仓库、`NEXT_PUBLIC_*`或前端。

前端只有下列公开构建参数；改动须重建：

```dotenv
NEXT_PUBLIC_ANALYTICS_PROVIDER=umami
NEXT_PUBLIC_ANALYTICS_WEBSITE_ID=已创建网站的公开UUID
NEXT_PUBLIC_PV_ENABLED=false
NEXT_PUBLIC_ADS_ENABLED=false
NEXT_PUBLIC_SITE_URL=
```

公开代理仅精确匹配 `/analytics/script.js` → `/script.js` 和 `/analytics/api/send` → `/api/send`，其余后台/API路径不可公网访问。两路由关闭普通访问日志；转发前剥离Cookie、Authorization、Referer，不将任意客户端转发头当作可信IP。站点referrer元数据为no-referrer；追踪器上报配置credentials=omit，但脚本GET本身可能附带同源Cookie，须用真实请求核验代理边界。数据库/后台保留实际字段与匿名IP处理说明，不宣称完全不处理IP。服务启动、账号改密、资源实测、备份恢复及安全私有通道由云端部署验收确认；本节不是部署成功证明。

采用[锁定源码](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/tracker/index.ts)核对的手动 `umami.track(object)`，禁用自动初始化/自动PV；前端只发送固定7页面的路径、静态标题、主机、语言、屏幕及搜索来源根域名。脚本延迟队列保持导航时归属，不重复播放；无自动点击、回放、identify、自定义ID、查询或表单字段。浏览器测试使用随MIT许可证保存的锁定源码夹具，不以手写SDK冒充真实接口。

先验收真实首页、站内往返、后退/前进和刷新各1次，工资输入、计算、CSV不增加；检查payload与Cookie/Referer等请求头，后台API和登录界面可核对页面明细后才关闭旧PV的新采集。旧匿名PV历史保留，不倒灌已有21次测试信号，也不把两个数据源合计。Umami开始时间以实际新采集为准。

后台使用阿里云官方Session Manager端口转发，不公开后台端口；账号尚未开启时，先部署并验收服务，再由用户开启该安全能力，不擅自代改、不声称后台已经可访问。前端回滚只需清空provider/UUID并重新构建；保留数据库和私有备份。HTTP/IP预览继续noindex，正式域名/备案及广告审批仍未完成。

本工具不需要业务后端。`npm run build` 后把 `out/` 交给支持静态文件、HTTPS 和自定义域名的托管服务即可；对象存储加 CDN、静态页面托管或下方的 Nginx 都可作为部署形态。托管服务需要正确处理目录形式的 URL（例如 `/salary-calculator/` 对应 `salary-calculator/index.html`）和 `404.html`。Node.js 只在构建时需要，线上不必运行工资计算 API 或数据库。

2026-10-11 已将 v0.2.0 **预览版**部署到网站所有者授权的上海 ECS，并通过公网手机与桌面浏览器共 10 项验收。当前使用 HTTP/IP 访问，禁止搜索引擎索引；尚未配置正式域名和 HTTPS。实际访问地址、实例和验收记录保存在不纳入 Git 的 `release/DEPLOYMENT_REPORT.md`。正式发布前请完成 [部署前检查清单](PRE_DEPLOY_CHECKLIST.md)。国内 ECS 面向大陆公开访问时，网站所有者应核实并完成适用的 ICP 备案等手续。下文 `your-domain.example`、服务器用户名和路径均是文档占位符，不能原样用于正式站点。

## 当前 ECS 预览服务

- 使用阿里云 Linux 发行版软件仓库的 Nginx；没有启动应用后端或数据库。
- 独立 systemd 服务为 `paytools-nginx`，已启用开机启动；宝塔面板、现有容器不由此服务管理。
- 发布目录为 `/srv/paytools/releases/20261011-2145-v0.2.0`，`/srv/paytools/current` 指向它。
- 主配置为 `/srv/paytools/config/nginx.conf`，服务文件为 `/etc/systemd/system/paytools-nginx.service`；仓库 `deploy/` 保存预览配置模板。
- 预览监听 TCP 80。确认安全组仅关联目标实例后新增了一条 TCP 80 入站规则；没有修改原有规则，443 尚未开放。
- HTML 不缓存，哈希资源长期缓存，返回真实 404；全部响应带 `X-Robots-Tag: noindex, nofollow`，robots 禁止抓取。
- 普通访问日志关闭，错误日志为 `/var/log/paytools/error.log`。启用本次PV配置后，只有固定端点的成功GET写入仅时间/页面的专用日志；工资金额只在浏览器中计算。

检查与重载当前服务：

```bash
systemctl status paytools-nginx
nginx -t -c /srv/paytools/config/nginx.conf
systemctl reload paytools-nginx
```

后续切换发布目录仍按第 3 节操作，但配置检查须带上 `-c /srv/paytools/config/nginx.conf`，重载对象使用 `paytools-nginx`。首次部署没有旧版本，撤销预览可执行 `systemctl disable --now paytools-nginx`；不要停止宝塔或现有容器。配置正式域名时需要重新构建静态文件、去掉服务器的预览 noindex 响应头、配置证书和 HTTP 跳转，再验收 robots、sitemap、canonical 与 HTTPS。

## 1. 本地构建与验收

新增上海页面 `/shanghai-salary-calculator/` 也须检查。PV预览发布在构建前设置 `NEXT_PUBLIC_PV_ENABLED=true`，`NEXT_PUBLIC_SITE_URL` 留空、`NEXT_PUBLIC_ADS_ENABLED=false`；保留HTTP/IP预览的noindex。通用静态托管若未配置采集端点，PV开关保持false，不能仅上传前端就声称真实统计已启用。

本地 `release/paytools-0.2.0-static-preview.zip` 是无正式域名的预览交付包，内部直接包含静态站文件。当前 robots 禁止索引；正式发布前应设置真实域名并重新构建，不能把预览包当作正式 SEO 发布包。配套 `manifest.json` 记录文件摘要与验证状态。

构建机器安装 Node.js 20.9+；生产服务器只托管 `out/` 静态文件，不必运行 Node.js。Next.js [静态导出文档](https://nextjs.org/docs/app/guides/static-exports)说明 `output: "export"` 构建会生成 `out/`。

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
```

若已安装 Google Chrome，再运行 `npm run test:e2e`。检查 `out/index.html`、`out/salary-calculator/index.html`、`out/methodology/index.html`、`out/policy-sources/index.html`、`out/privacy/index.html`、`out/about/index.html`、`out/404.html`、`out/robots.txt` 与 `out/sitemap.xml`。

正式构建前，先把真实生产 HTTPS 源站写入 `.env.local` 的 `NEXT_PUBLIC_SITE_URL`（例如 `https://实际域名`，仅包括协议与域名，不含路径）。它是公开构建配置，不能放密钥。该变量在 **构建时** 生效；改域名后必须重新运行 `npm run build`。未配置或仍使用 `example.com`、`.example`、localhost 时，不会生成有效 canonical 或 sitemap URL，robots 将禁止抓取，适合本地与预发布检查，不适合正式公开站点。

信息流广告默认关闭。取得平台批准后再配置 `NEXT_PUBLIC_ADS_ENABLED=true`、`NEXT_PUBLIC_AD_PROVIDER`、`NEXT_PUBLIC_AD_RESULT_SLOT` 和 `NEXT_PUBLIC_AD_CONTENT_SLOT`，并按 [信息流广告接入准备](docs/ADS_READINESS.md) 完成供应商脚本、隐私披露、域名白名单和网络请求验收。这些变量同样是公开构建配置。

## 2. Nginx 静态站配置示例

取得真实域名、完成备案和 TLS 证书配置后，将下列占位域名、证书路径和站点目录替换为实际值。服务器上以 `/srv/paytools/current` 指向当前发布目录。`trailingSlash: true` 导出的页面是目录中的 `index.html`，`try_files $uri $uri/` 可服务该路径；[Nginx 官方指令文档](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)。

```nginx
server {
    listen 80;
    server_name your-domain.example;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.example;
    root /srv/paytools/current;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

    access_log /var/log/nginx/paytools.access.log;
    error_log  /var/log/nginx/paytools.error.log warn;

    error_page 404 /404.html;

    location /_next/static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ =404;
    }
}
```

先由网站所有者按实际证书服务商配置证书签发与自动续期，再执行 `sudo nginx -t` 和 `sudo systemctl reload nginx`。开启阿里云安全组与主机防火墙所需的 80/443 端口，并确认 HTTP 自动跳转 HTTPS。静态站无需配置反向代理到 `next start`。

## 3. 上传、切换与回滚

建议在服务器保留独立的发布目录，例如 `/srv/paytools/releases/2026-10-11-01/`，以便回滚。下例中的 `deploy@your-host` 是占位符；由网站所有者使用已配置的登录方式执行，不要把 SSH 密钥、实际 IP、口令或令牌写进仓库。

```bash
# 在本地构建机执行；先于服务器创建目标发布目录并设置合适权限
rsync -a out/ deploy@your-host:/srv/paytools/releases/2026-10-11-01/

# 在服务器检查发布内容，再以 current 符号链接指向新目录
test -f /srv/paytools/releases/2026-10-11-01/index.html
ln -s /srv/paytools/releases/2026-10-11-01 /srv/paytools/current.next
mv -Tf /srv/paytools/current.next /srv/paytools/current
sudo nginx -t && sudo systemctl reload nginx
```

若 `current` 首次不存在，先创建相同形式的符号链接。切换前记下 `readlink -f /srv/paytools/current` 指向的旧目录；回滚时将 `current.next` 指向旧目录，再执行同样的 `mv -Tf`、配置检查和 reload。不要直接在当前目录覆盖文件，以免发布中途出现新旧资源混用。保留至少一份已验证的旧发布目录，并定期备份 Nginx 配置、证书续期配置和规则发布记录；部署包可由源码和 lockfile 重新生成。

## 4. 上线后检查

- 用真实手机及桌面浏览器访问首页、计算器和全部说明页，核查表单、键盘操作、360px 宽度、跨 6/7 月结果和 404。
- 查看 `https://实际域名/robots.txt`、`/sitemap.xml` 与页面 canonical，确认仅包含正式域名；检查页面源代码能直接读到说明内容。
- 核对 Nginx 日志不写入工资表单金额；设置最小日志权限、轮转和保存期限，按实际情况更新隐私说明。
- 对 HTML 与政策页面采用可复核的新鲜度策略；`/_next/static/` 的哈希资源可长期缓存。更新政策后重新构建并验证缓存没有保留旧规则。
- 上线前复核 [政策参数来源](POLICY_SOURCES.md)。尚未核实的失业费率连续性和舍入假设应与单位实际扣缴核对。
- 真实广告 SDK 仍须保持关闭，直至网站所有者完成适用的资质、平台审核及隐私披露。

## 5. 第一方PV与站长本地报告

采集契约：浏览器首屏、刷新、客户端导航各发一个同源GET；固定端点由Nginx映射到固定页面。重渲染、查询/锚点变化和工资修改不重复发出。专用日志只含 `$time_iso8601` 与白名单页面；仅GET且响应204计数，HEAD/POST/未知端点不计数，响应 `Cache-Control: no-store`。不采集工资、IP、UA、referrer、query、cookie或唯一标识；无UV或真人数。JS禁用、断网、拦截会漏报，自动化和伪造请求可能增加PV。

服务器复用已有Python3.6.8即可，无第三方包、数据库或新凭据。把 `scripts/pv-report.py` 安装为 `/usr/local/lib/paytools/pv-report.py`（root:root 0644），把 `deploy/paytools-pv.logrotate` 安装为 `/etc/logrotate.d/paytools-pv`（root:root 0644），把 `deploy/paytools-pv.cron` 安装为 `/etc/cron.d/paytools-pv`（root:root 0644）。合并或采用 `deploy/nginx-preview.conf`；保持独立 `paytools-nginx`，不要修改其他服务。

首次启用前创建受限目录；采集起点文件只创建一次，不伪造以前的数据：

```bash
install -d -m 0750 -o root -g nginx /var/log/paytools/pv
install -d -m 0700 -o root -g root /var/lib/paytools/pv
install -d -m 0755 -o root -g root /usr/local/lib/paytools
touch /var/log/paytools/pv/pageviews.log
chown nginx:nginx /var/log/paytools/pv/pageviews.log
chmod 0640 /var/log/paytools/pv/pageviews.log
if [ ! -f /var/lib/paytools/pv/collection-start ]; then
  umask 077
  date -u +%Y-%m-%dT%H:%M:%SZ > /var/lib/paytools/pv/collection-start
fi
nginx -t -c /srv/paytools/config/nginx.conf
systemctl reload paytools-nginx
logrotate --debug /etc/logrotate.d/paytools-pv
```

原始日志每日按rename方式轮转，`rotate 30`、`maxage 30`、不压缩、不使用copytruncate；即使没有新请求也每日检查到期日志。日志不放静态根目录，Nginx仅写权限所需的文件，state/起点root专用。小时cron将新增字节汇总为页面/日期计数，源文件device/inode及读取offset用于防重，轮转前后同秒同路径的独立行仍全部计数。聚合锁防止并发重复读取；汇总state只保存路径、日期、计数及文件位置，无用户标识。默认保留匿名汇总，原始日志30天；`state.json`需备份，丢失后只能重建仍留存的原始数据，不应声称完整历史。

取回报告（已有云助手helper不纳入Git，必须复用其现有认证和固定目标）：

```powershell
./scripts/get-pv-report.ps1 -CloudCommandHelper ./release/cloud-command.ps1 -Python python
```

helper契约是 `-CommandFile <UTF8 shell文件> -WaitSeconds 30`，调用现有ECS云助手并输出解码stdout和 `STATUS=Success EXIT_CODE=0`。报告脚本不读凭据，仅提交固定汇总命令，从标记间解析JSON；云助手输出缺失/截断则明确报错。默认写入忽略的 `release/pv-reports/pv-时间.html` 与 `.json`，使用浏览器打开HTML；今日、近7/30日、每日与页面明细均按Asia/Shanghai展示，并标记预览、生成时间、采集起点、启用区间、首日/今日不完整、暂无数据。启用区间不证明连续采集正常，停机/JS故障可能漏报；缺数据不补造历史，不以零代表采集成功。

本机可用Python3.6+从已取回JSON重做HTML：`python scripts/pv-report.py --input-json <报告.json> --output-html <本地报告.html>`。日志/报告都不能复制到 `public/` 或 `out/`。脚本使用固定上海UTC+8，无zoneinfo依赖。独立回归：`python -m unittest discover -s tests -p test_pv_report.py`。

发布验收应记录真实起点及生成的报告位置到忽略的 `release/DEPLOYMENT_REPORT.md`：浏览首页/上海页各一次、刷新和站内跳转，核对服务端增量；无效路径/HEAD/静态文件不增，连续同秒请求不合并，确认日志不含请求头或query，公网无法下载日志和state。测试流量会如实进入PV，报告不可称自然用户量。

PV回滚：构建时设置 `NEXT_PUBLIC_PV_ENABLED=false` 并发布；关闭端点专用日志或恢复已备份的Nginx配置、检查后reload，移除PV小时cron。保留已收集的受限数据和轮转规则直至到期删除。若须删除，显式限定 `/var/log/paytools/pv/` 和 `/var/lib/paytools/pv/` 并先核对目标，不能清理其他服务日志。回滚静态发布和PV配置分别记录，HTTP/IP预览始终保留noindex。广告仍未接入真实SDK，后续按 [ADS_READINESS.md](docs/ADS_READINESS.md) 完成正式准入与投放验收。
