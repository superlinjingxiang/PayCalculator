---
title: '接入成熟开源网站统计'
status: 'done'
execution_state: 'complete'
baseline_commit: '2df33ec1056c5372ab867042c99a835275be26ee'
resumed: '2026-10-28 用户：继续'
created: '2026-10-27'
authorization: '用户明确要求：这个浏览量应该有开源方案，调研然后接入，阿里云肯定有现成的'
context: ['AGENTS.md', '_bmad-output/growth-2026-10-27/analytics-selection/opensource.md', '_bmad-output/growth-2026-10-27/analytics-selection/aliyun.md']
---

## 意图与取舍

用户要求用成熟统计产品提供后台，而非只看自制离线PV。现有搜索、工资计算与广告延期目标保持。官方调研比较SLS/RUM、Umami/Matomo/Plausible后，选**Umami v3.4.1**自托管到现有阿里云ECS，不新购统计云服务；SLS/RUM现成但商业按量，尚无付费开通授权。

Umami为主统计，原匿名PV保留作切换期间核对与既有历史，不倒灌21次测试信号。服务仅loopback暴露后台，公网仅同源两个精确采集/脚本路由；后台用阿里云官方加密通道。制定方案时账号尚未开启Session Manager，2026-10-28已按用户明确授权开启并实测登录。不开新公网端口，不创建云密钥，不影响既有容器。

## 分工与边界

主agent负责：Docker官方镜像、PostgreSQL、Nginx部署、私有凭证、云端采集与后台、官方隧道、数据备份及资源实测。实现agent本轮**只负责前端接入、测试和对应文档**；不改服务器或release/内的部署脚本，不改其他既有工作。

静态导出与本地工资计算不变。Umami官方GHCR镜像tag是3.4.1（无v），不采用latest或不明镜像。资源约2核2GiB且可用1.33GiB，应用/DB设置上限并实测。PRIVATE_MODE=1、关闭遥测和外部更新/MCP。

## 前端任务

- 新增成熟统计组件和配置模块，RootLayout加载一次。`NEXT_PUBLIC_ANALYTICS_PROVIDER=umami`与公开website UUID启用；未配置默认不加载。脚本固定同源 `/analytics/script.js`，接收 `/analytics/api/send`，不允许环境变量塞任意脚本URL。
- 按v3.4.1官方tracker接口核对实现，**禁用自动pageview**，使用官方 `umami.track` 的受支持方法与Next `usePathname`处理首屏、SPA导航、后退/前进、刷新，避免自动+手动双计。不得猜测SDK接口。脚本延迟加载时不重复或错归路径；失败不阻塞计算。
- 白名单仅现有7个公开页面。URL仅规范路径，title为静态映射；不含query/hash、工资或表单/结果。referrer只保留安全来源域名，不上传来源路径或查询；不用自定义个人ID、自动事件属性、表单回放。SDK请求不得带本网站cookie或工资值；如同源脚本fetch默认带cookie，需通过Nginx转发剥离并据实披露，不伪称浏览器完全无cookie。
- 旧PageViews继续由NEXT_PUBLIC_PV_ENABLED控制，验收切换后默认正式预览构建用PV=false与Umami启用；不删除旧历史，防止两个数据源混淆。
- 更新 `.env.example`、隐私、README、DEPLOY及测试报告。隐私写明自托管Umami、无cookie跟踪/自定义用户ID，浏览器/系统/语言/屏幕和来源域名等实际字段；服务端为匿名会话可能短暂处理IP，不承诺“完全不处理IP”，不发送工资。字段以锁版本源码和真实请求验收为准。

## 验收

Given 未配置，When 浏览，Then 无Umami脚本/请求。
Given 已配置，When 首屏、站内往返、刷新，Then Umami各有一次pageview，输入/计算/CSV不增加，URL/title/referrer不泄露金额、query、hash或任意文本。
Given 脚本延迟或失败，When 继续计算，Then 工具可用、导航归属正确且无重复。
Given 部署成功，When 受控真实访问，Then 后台API/界面可见真实PV和页面明细；未开启隧道时不宣称用户已能访问后台。

本地lint/typecheck/Vitest/build/Chrome测试按改动验证；真实后台、资源、备份和安全访问由主agent完成。域名/备案/广告实际接入仍是后续事项，不因本次统计替换标为全部完成。

## 2026-10-28 运维实现与验证

- 用户明确恢复，保留已提交前端实现；Umami官方镜像和PostgreSQL官方镜像均按固定摘要在原ECS部署。Docker26 internal网络不编程host端口，已改为显式内部子网/固定IP与原生systemd-socket-proxyd回环转接。无公网管理端口，原有cqp服务保持healthy。
- 真实Chrome受控5次，私有后台API与数据库从0到5，首页2/方法页3；改工资/计算/CSV不增加。默认HeadlessChrome被官方机器人检查过滤，未关该检查、未倒灌旧21次快照。
- 真实隔离Nginx发现URI尾`?`不足以去掉query，修为清空`$args`后43项通过；页面响应头改no-referrer，解决预加载早于meta导致的脚本Referer。工资/URL查询/来源查询未入库。
- 默认密码实际失效、随机密码可登录。数据库备份摘要、隔离恢复及app重启后5条数据保留均验证；每日上海03:15备份、同盘14天及最新成功备份，尚未配置异地容灾。
- 用户建议Workbench CLI；v1.0.1和官方独立下载v1.0.4均实测转发命令返回尚未可用。用户继而明确“你开启一下”，已通过官方API开启SessionManager（全地域），投递设置未改。
- 官方ali-instance-cli直接portforward监听全接口，已由guard停止；带IP的local-port不受支持。改用Windows OpenSSH显式回环LocalForward与官方CLI的stdio SSH通道。复用现有本机RSA公钥按官方60秒临时元数据认证，不创建新密钥、不写永久authorized_keys、不改安全组；可信host公钥经既有云助手取得，StrictHostKeyChecking=yes，禁用agent转发。已实测本机127.0.0.1:18081及heartbeat200，真实后台UI登录并显示Views=5；已在受限独立Chrome配置中为用户打开。关闭脚本实际停止本任务进程树、监听消失，重新开启及heartbeat再次通过。

## Review Triage Log

最终三层全部返回后逐项裁定。BH为blind、EH为edge、VG为verification；重复根因保留各行并统一修复。

|编号|裁定|证据与路由|
|---|---|---|
|BH1|high|缺secrets但残留env/卷时可覆盖凭证；初始化增加全部残留拒绝，保留恢复数据。patch。|
|BH2|medium|LocalPort可变而PID/config共享，第二通道会遗失旧PID；限制单一活动连接并串行化open/close。patch。|
|BH3|medium|原helper结果未绑定ConnectionConfig，可能错记host key；要求认证调用结果实例/地域marker吻合后才保存。patch。|
|BH4|high|grant:r与去继承不会删除其他显式授权；设置仅当前SID的完整DACL，亦保护已存配置/日志文件。patch。|
|BH5|medium|实际cron已安装但源码缺失；纳入同一cron配置及首次安装步骤。patch。|
|BH6|medium|dump先成为最新候选再写摘要，故中断会阻塞恢复；只以最后原子发布的manifest选择备份。patch，同EH1。|
|BH7|medium|输出counts不是断言；以同一导出快照生成源清单，恢复后严格比对站点UUID/网站/事件/会话。patch，同VG2。|
|BH8|false|建议新增日期选择参数，不是现有“最新完成备份验证”的错误或已承诺能力；生产恢复说明可人工指定旧归档，不扩展脚本公共参数。|
|BH9|low|补生产恢复说明可降低误操作，直接文档修正。patch。|
|EH1|medium|同BH6，完成标记最后发布，未完成dump不可被restore选择。patch。|
|EH2|medium|同BH3；验证实际实例/地域，不用配置标签冒充执行身份。patch。|
|EH3|high|两个首次安装可同时通过空状态检查，覆盖密钥且失败互停；第一步取得排他安装锁。patch。|
|EH4|medium|复用分支只验ssh路径，PID循环可误认其他隧道；增加专用配置命令行与实例匹配。patch。|
|EH5|high|createdb失败仍触发预装cleanup可删除非本轮库；唯一随机验证库，只有创建成功才获得清理权。patch。|
|VG1|medium|真实HTML referrer响应无持续断言；新增真实Nginx首页no-referrer测试及隔离变异。patch。|
|VG2|medium|same BH7，新增有数据fixture及schema-only变异，缺失记录必须fail。patch。|

## 最终验收（2026-10-29）

- 三层评审已全部返回并逐项修复；定向复核确认BH1–5及VG1–2关闭。没有将原站的延期UI问题混入本次统计完成状态。
- PostgreSQL隔离fixture三项实际通过：有数据恢复、schema-only缺记录拒绝、更新但未完成归档不遮住成功归档；源快照网站UUID/网站1/事件5/会话1与真实生产恢复一致。
- 真实Nginx两项通过；把隔离模板变回旧referrer策略时新测试确实失败，恢复后通过。代理43项验证通过。
- 首次安装前缀8项隔离验证通过：无残留可继续、env/卷/网络/两容器残留均拒绝、并发锁拒绝。发现Bash的`! command`不触发errexit，已改用明确if/exit，测试未运行秘密生成或真实Docker命令。
- Windows PS5/PS7显式Everyone授权均被移除；第二端口拒绝且旧通道不变，实例或地域不匹配不改变host key信任。
- 今天只读复查：原cqp healthy，Umami/数据库无OOM，公开管理/秘密路径404，只有loopback3001，临时测试数据库与监听均为0。2026-10-29上海03:15定时备份自动完成，manifest保留源事件5。
- Windows无凭据临时测试文本未能清理：自动审批拒绝了递归及逐文件命令（blocked by policy），未绕过；准确目录见本轮负向测试报告。这不影响统计服务或凭据安全。
- 成熟统计子目标完成；正式域名、HTTPS/适用备案与国内联盟审批/真实广告投放仍在总目标后续阶段。
