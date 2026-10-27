# 2026-10-27 暂停与提交交接

用户已明确“今天先到这，上传推送提交”。持续目标已暂停；本文件记录截至暂停时的事实，不代表全部目标已完成。

## 已完成并验证

- 设计、调研、独立review与测试分工完成；搜索内容已增加上海独立页、累计预扣解释和页面词条映射，不承诺低竞争/排名。
- 外省未核实费率清空、返回上海恢复预设、上海估算说明与广告storage异常修复。
- 原第一方匿名PV已在既有HTTP/IP预览运行，保留noindex与广告关闭；22:32:57 Asia/Shanghai开始采集。公开路径无法下载日志/state，原始日志仅页面与时间，权限与真实轮转均验收。
- 原PV最终review补丁已部署；Linux/Python3.6实际12项全部通过（含真实隔离Nginx、CLI持久化、元信息缺失、目的地保护与轮转竞态）。旧21次是含测试的历史快照，后来汇总22次，不是自然访客人数。
- Umami选型完成：自托管3.4.1优于本次直接开通商业SLS/RUM；后者有现成报表但会涉及按量收费。3份研究与独立review在 analytics-selection/。
- Umami前端接入已实现，使用锁版本真实SDK夹具；115项Vitest通过，启用构建Chrome18项通过、默认关闭专项2项通过。工资/CSV/URL查询不进入统计，SPA导航去重与延迟队列已测试。

## 暂停时尚未完成

- **Umami后台尚未部署或激活，不能宣称已经能看成熟后台。** PostgreSQL官方镜像已缓存；Umami官方镜像下载较慢，用户要求暂停后已停止本任务拉取客户端，保留已完成缓存。未启动Umami/数据库容器。
- 前端 `out/` 是预留网站UUID的Umami启用构建，**尚未发布到线上**。UUID不等于服务已经创建。当前线上仍是上一版匿名PV，不要误把repo静态包当作线上版本。
- 需完成官方镜像摘要校验、私有DB/应用、默认密码替换、精确Nginx代理、真实PV后台对照、资源与备份恢复验收。
- 阿里云只读检查：实例支持会话管理，但账号开关关闭。后台只计划监听loopback，不开放公网管理端口；官方本机端口转发需用户在控制台启用该账号级安全能力后实际验收。
- `scripts/open-analytics.ps1` 已写并做PowerShell语法检查，但尚未运行真实隧道。官方CLI在本机LOCALAPPDATA/PayToolsAnalytics（不纳入仓库）；不要把AK/SK、会话URL或后台密码写入Git。云端部署脚本与实际实例信息仍在忽略的release/。
- 正式域名、适用备案、HTTPS、联盟审批与真实广告代码仍缺，真实广告接入未完成。既有UI边界问题已记入 implementation-artifacts/deferred-work.md。

## 恢复入口

先读 `../implementation-artifacts/spec-mature-analytics.md`、analytics-selection/review.md 和忽略目录 release/DEPLOYMENT_REPORT.md，核对真实服务器状态再继续。不要重新做已完成调研，不重复新建云凭据，不启用付费SLS/RUM，不覆盖既有工作或改cqp-monitoring。所有后续动作仍受用户暂停请求约束，须待用户明确恢复。
