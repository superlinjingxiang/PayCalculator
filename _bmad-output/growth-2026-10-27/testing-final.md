# 搜索 / PV / 广告准备独立验证（2026-10-27）

验证人：独立测试 agent。工作目录：`E:/信息流广告/工资计算器`。依据 revision 2 spec 与当前 `TEST_REPORT.md`；已阅读本地 Next.js `use-pathname.md`、`static-exports.md` 指南。

本次仅测试既有静态导出 `out/`，没有重新构建，没有修改业务源码。预览配置由主实施方提供：PV=true、SITE_URL 空、ADS=false；浏览器确实观察到 PV 请求，广告条件场景按关闭跳过。

## 实际命令结果

| 命令 / 检查 | 结果 |
| --- | --- |
| `npm run lint` | 退出 0，通过 |
| `npm run typecheck` | 退出 0，通过 |
| `npm run test` | 退出 0，12 文件、108 项通过（本机 22:27:39 开始） |
| `npm run test:pv` | 退出 0，Python unittest 6 项通过（修复后独立复跑） |
| `$env:NEXT_PUBLIC_PV_ENABLED='true'; $env:PLAYWRIGHT_ADS_ENABLED='false'; npm run test:e2e` | 退出 0，本机 Chrome 两项目共 14 通过、2 条广告条件用例跳过 |
| Python 直接检查导出 HTML / sitemap | 四页面 title 各异；全部 noindex/nofollow；无 canonical；sitemap 无 loc |
| PV 时间并发最小重现 | 先证实 P2，实施方修复后独立复现确认闭环 |

`npm run build` 本次未运行：按任务要求复用主实施方已构建的最终 out，避免并发构建及覆盖配置。上述通过仅证明本机现有源代码 / out 的对应能力。

## 已核验覆盖

- **前端 PV 去重与导航**：StrictMode effect、组件重渲染、query/hash 变化不重复；切页再返回会计数；独立 tracker 同秒各记一次。Chrome 验证首屏 → 计算后导航 → 后退 → 刷新精确 4 次 GET；仅固定路径，无请求体、无 referer、无表单 99999。`fetch` no-store / omit credentials 在组件测试断言。
- **日志同秒、增量与轮转**：相同秒相同页面两行计 2 次；重复扫描不增加；rename 轮转后新文件增加 1；inode 别名不重复；临时缺失再出现保留 checkpoint；半行完成后才计；非法路径、工资 query 拒绝；上海日期跨日及无数据提示均通过。
- **外省费率**：上海切浙江杭州后养老、医疗、失业和上下半年公积金费率全部清空，未填写不能出结果；返回上海恢复 7% 预设并可计算。完整手填外地参数、CSV 与详细计算既有回归通过。
- **广告 storage 异常**：getItem / setItem 抛 SecurityError 时，同意当前页仍生效；重新设置拒绝后容器消失；其他标签页 rejection 同步。默认关闭无横幅/容器；假 provider / slot 单元用例仅验证门禁。
- **Chrome UI 与离线**：360px 上海计算、7 月调整内容、无文档横向溢出、桌面首屏输入、离线计算及 CSV、详细模式年中调基与编辑后清除结果均通过。

## 发现：P2 — 扫描起点之后的合法 PV 被永久丢弃

状态：**已修复并独立闭环。** 初测常规套件未覆盖，实施方已增加第 6 条 Python 回归；独立复跑 6 项通过。

位置：`scripts/pv-report.py:80`（`moment > now` 判非法）、`:89`（保存扫描后的 offset）。`main()` 在开始扫描前固定 now。若扫描较慢、等待锁或扫描期间日志追加越过下一秒，新合法 PV 时间可能晚于该 now；该行会 rejected 且 checkpoint 前移，之后统计时间赶上也不会再读取。

独立最小重现（临时目录，不改源码）：写 `2026-10-27T12:00:01+08:00\t/\n`；先以 now=12:00:00 aggregate，再以 now=12:00:02 对同 state aggregate。第一次 `counts={}`、`rejected_lines=1`、offset=29；第二次仍 `counts={}`、`rejected_lines=1`、offset=29。预期该合法独立浏览最终应计入 1。

修复后遇到 moment > now 会 seek 回该行起点并 break，保留待下次读取。独立原最小重现：首次 counts={}、offset=0、rejected=0；now=12:00:02 第二扫计入 1；12:00:03 第三扫仍为 1。现有 Python 6 项全部通过，问题闭环。前端和 out 未改变，无需重复已通过的 UI 套件。

## 仍需服务器 / 外部验收

本地静态服务器没有真实 Nginx PV 接口，E2E 拦截 PV 端点返回 204，不能证明服务器已采集。下列项目需由部署方提供真实执行证据：

1. 安装后 `nginx -t`；受控浏览两页 / 刷新产生对应固定路径计数；HEAD、非白名单、静态资源与失败响应不计；GET 204 带 no-store；保留 noindex。
2. 原始日志仅时间与白名单页面，不含 IP、UA、referer、query / 工资。检查专用目录权限、日志 0640、状态 / JSON / HTML 0600，全部在 document root 外。
3. 真实 Python 3.6 执行、锁与小时 cron、rename / USR1 日志重开、30 天轮转与清理；重复生成报告不重读，同秒独立浏览都计数。部署本报告 P2 修复后的脚本并验证。
4. 从服务器取回实际汇总并打开 HTML / JSON：明确预览、Asia/Shanghai、生成时间、采集起点、启用区间、不完整日、今日 / 近7日 / 近30日与页面明细；不能补造启用前历史，不承诺 UV / 真人数。
5. 正式域名与适用备案、联盟审批、真实 Web SDK / 广告位尚未提供，**真实广告接入与投放未完成**。本轮 2 条条件跳过与假 slot 单元通过不能当作真实接入证据。需获批配置后验平台响应、同意前/拒绝/撤回网络行为、失败恢复、明确广告标识及本站不主动传工资字段。

`docs/ADS_READINESS.md` 已明确没有第三方 SDK、空容器不能当接入证明；与本次测试边界一致。

