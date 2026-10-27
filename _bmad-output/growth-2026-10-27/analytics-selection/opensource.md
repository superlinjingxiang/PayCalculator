---
type: technical
shape: select
topic: 现有ECS上的成熟开源访问统计
decision: 选择不新增付费服务和公网端口、带报表后台的浏览量统计
source: 本轮官方文档与锁定版本源码
status: complete
updated: 2026-10-27
verification: 官方单一发布方证据；未做独立发布方交叉核验或服务器部署验证
ledger_verified: 0
ledger_unverified: 3
---

# 建议

优先试部署 **Umami v3.4.1 + PostgreSQL**：复用现有 ECS，Nginx 同源代理采集脚本与上报接口，后台经已配置的安全端口转发访问。它已有登录、页面浏览与来源/设备/地域等报表，不必继续自建报表。官方稳定版于 2026-10-23 发布，包含安全修复；不要照搬旧教程的 v2/MySQL 组合。[1][2][3][4]

这是基于依赖数量与接入方式的选型推断，尚未证明现有实例资源足够或大陆可直接拉取镜像。若要求“任何设备直接打开一个公网后台网址”，当前 HTTP/IP 环境还需解决后台凭证传输方式；有SSH凭据时可通过SSH隧道获得完整后台，当前调用方确认没有可直接使用的SSH凭据，阿里云Session Manager端口转发另待主调研核查。成熟软件免费自托管不等于 CPU、数据库、磁盘、备份和维护免费。

# 要求与候选筛选

项目约束来自调用方：静态导出 Next 工资计算器、上海 ECS/Nginx、目前 HTTP/IP 预览、没有域名/HTTPS/备案、工资在浏览器本地计算。以下属于需求，不能当作外部事实证据。

硬门槛：有成熟报表后台；自托管；不新增付费云服务；数据库不暴露公网；工资/输入/计算结果不进入统计。偏好评分 1–5，权重为部署维护 35%、本项目接入 30%、隐私配置 20%、现成报表 15%。评分是本研究判断，不是产品性能基准。

| 候选 | 当前稳定版及依赖 | 维护/接入判断 | 评分与结果 |
|---|---|---|---|
| Umami | v3.4.1；Node 应用 + PostgreSQL；官方 Compose 使用 PG15。[1][2][3] | 两个服务；自动支持 SPA 导航；预构建镜像的完整子目录后台需要额外构建，但仅代理采集可绕开。[5][6][7] | 4 / 4 / 4 / 4 → **4.00，首选** |
| Matomo | 5.14.2；PHP8 + MySQL/MariaDB；6.0 仍是 Beta。[8][9] | 正式反代子目录文档与完整分析后台；需处理 PHP、数据库、生产归档定时任务，SPA 要配历史变化触发器或手动 PV。[10][11][12] | 3 / 3 / 4 / 5 → **3.45，备选** |
| Plausible CE | v3.2.1；应用 + PG16 + ClickHouse24.12；官方推荐至少2GB RAM、CPU支持SSE4.2/NEON。[13][14][15] | 三个服务及两种数据库，相较当前只需PV/来源报表增加维护面；早期筛除，未深挖子路径兼容性。 | 2 / 3 / 4 / 4 → **2.95，暂不选** |

Matomo 若胜出，条件是未来确实需要更全面的分析体系、已有 PHP/MySQL 运维或必须直接部署完整的子目录后台。其官方对月10万PV以内给出单机2CPU/2GB/50GB SSD的建议，这不是对本机可用性的承诺，也不是Umami更省内存的测量证据。[9]

许可分别为 Umami MIT、Matomo GPLv3、Plausible 应用 AGPLv3。Plausible 的 Compose 示例仓库 MIT 不代表分析应用也是 MIT。本轮仅核对许可文件，不作衍生作品法律判断。[16][17][18]

# Umami 的具体落地边界

## 拓扑与后台

建议应用容器仅绑定 ECS 的 `127.0.0.1:3000`；PostgreSQL 仅在容器网络内互通并使用持久卷。上游 Compose 默认 `3000:3000`、示例数据库密码及 `APP_SECRET` 必须在实际部署中替换，不能直接原样公网运行。[3][5]

Nginx 只将公开的 `/analytics/script.js` 转到应用 `/script.js`，将 `/analytics/api/send` 转到 `/api/send`。锁tag追踪器默认从脚本 URL 所在目录推导 host，因此这个组合可行，属于基于源码的集成推断，部署后仍须验证HTTP状态与收到事件。固定 website ID 是公开采集标识，不是后台密码。[6]

后台在已具备SSH凭据时可用 `ssh -N -L 127.0.0.1:13000:127.0.0.1:3000 <已授权SSH目标>`，本地浏览器打开 `http://127.0.0.1:13000`。这是条件建议，未执行，当前没有可直接使用的SSH凭据；不能将它描述成已交付访问方式。首次默认账户 `admin / umami`，应在首次登录立即更改；可另配置 2FA。后台仍使用软件自身认证，不启用公开分享链接。[19]

若要完整 `/analytics/` 后台：`BASE_PATH` 是 **构建时参数**，官方 Dockerfile 有 `ARG BASE_PATH`，Next 配置也将其写入 `basePath`；不能只给已构建的官方镜像设置运行时环境变量便宣称支持。需构建带此前缀的镜像并验证登录、静态资源、API及跳转路径。[5][7]

官方安装例子使用 HTTP localhost，追踪器配置例子也明确允许 HTTP URL；同IP部署可以对照 `window.location.hostname` 配置采集范围。这里证明技术可行性，不代表HTTP公网后台传输已安全，也不替代阿里云网络/备案限制的单独核查。[2][4]

## Next 路由统计与工资数据保护

先用追踪器自动 PV，不再叠加一个每次路由变化都调用 `track()` 的组件，以免重复。官方 FAQ 声明支持 SPA；锁tag代码明确包装 `pushState` 和 `replaceState`，但本轮未看到 `popstate` 监听，因此浏览器后退/前进不能跳过验收。[6][20]

脚本至少配置 `data-exclude-search="true"` 与 `data-exclude-hash="true"`。源码对当前URL和referrer都调用相同标准化逻辑；仍推荐使用 `data-before-send` 钩子仅保留预定义页面路径、固定标题，referrer仅留允许的来源域名或直接清空。不要把工资藏在路径或页面标题后又称已去除查询参数就足够。[4][6]

本期只统计浏览量。不开启 session replay、工资点击事件、`identify()`、Distinct ID、表单属性或计算结果事件。官方 `track()` 可发送自定义属性，默认页面字段也含标题与referrer，因此“计算本地完成”本身不能证明新埋点没有泄露数据，必须观察实际请求。[21]

自动排除所有 search 参数会同时舍弃UTM活动参数。当前优先最小采集；未来广告归因如确有需要，仅在发送前显式重建批准的UTM参数白名单，绝不放行全部URL。HTTP `Referer` 请求头、Nginx access log 和应用错误日志也要检查；payload清理不等于这些层自动清理。

Umami 追踪器不使用cookie，但服务器仍处理IP和User-Agent以派生带盐标识、可推导地理位置；普通统计记录不直接存IP字段。基础设施日志仍可能记录IP。不要写成“不接触IP”“绝对匿名”或“自动免除所有告知义务”。自托管默认数据长期保存，需要另定保留与清理策略。[20][22]

# 成本、维护和退出

没有新增软件许可订阅需求；复用已有机器是否无需扩容取决于实际可用资源。本轮官方Umami安装页没有足以引用的明确最小RAM保证。部署前查 CPU/内存/磁盘、Docker与端口占用，运行后观察RSS、数据库增长、负载与重启行为。使用固定版本/镜像摘要，备份 PostgreSQL 持久数据和密钥，升级先备份再迁移；不要长期使用漂移的 `latest`。[1][2][3]

官方安装页目前给出 `docker.umami.is/umami-software/umami:latest`，锁tag Compose 使用 `ghcr.io/umami-software/umami:latest`，数据库来自 Docker Hub。[2][3] **官方GitHub Packages确认锁定tag为 `ghcr.io/umami-software/umami:3.4.1`，镜像tag没有 `v` 前缀**；多架构index摘要为 `sha256:e69d1a7932e9dab0fc523edc7be1f3a53f3c261f57856fc2167ae74a8fc022e8`。本研究在本地通过官方GHCR匿名token读取该manifest为HTTP200且相同摘要；错误tag `v3.4.1` 返回404。元数据检查不是上海ECS完整pull验证。[26]

调用方随后提供实机只读证据：2CPU，内存总量约1.83GiB、available约1.33GiB、Docker26.1.3，已有约105MiB的 `cqp-monitoring` 容器不可改；GHCR根接口HEAD405说明可达但不证明能拉镜像；DockerHub registry连接失败。这让数据库镜像获取成为实际部署关卡，且不宜在该小机上进行Umami完整源码构建。证据由调用方保管，本子研究未独立重跑。

不能承诺国内拉取畅通；若受限，需要从可达环境拉取官方镜像、核对来源与摘要、导出再传输导入，或使用用户已经拥有的可信镜像仓库。不能因此擅自新增付费仓库或随意使用不明第三方镜像。另一个可信路线是**发行版原生PostgreSQL或PostgreSQL官方PGDG包**：官方提供Ubuntu APT与RHEL家族YUM仓库。但需先确认实际OS与包版本支持，Alibaba Cloud Linux不能仅因兼容RHEL就当作PGDG明确支持；不应猜发行版标识或强装不匹配仓库。[27]

最强反对理由：为一个低流量工具新增常驻Node应用和数据库，会增加升级、备份和故障排查工作。如果现有自制方案已满足只看总PV，成熟后台的价值要超过这笔维护成本。可逆试点为单站、仅PV，隔离容器与持久卷；前端移除脚本即可停止后续采集，数据库备份可独立保留。本次不建议把旧PV历史伪造成Umami原生会话数据。

# 必须验收与未决问题

1. ECS资源和镜像可达性实测；指定stable tag确实存在，落盘摘要。
2. 同IP HTTP下脚本加载、采集成功，首次刷新仅1次PV；Next站内跳转、后退前进各符合预期。
3. 工资输入/结果变化不产生额外事件；查询/片段/标题/referrer及网络请求头不包含工资或分享状态，日志不泄漏这些字段。
4. 后台登录看到真实PV趋势和页面/来源报表；未登录无法查看；默认密码已改；不暴露3000/5432公网端口。
5. 容器重启后保留数据；一次备份恢复验证；新采集失败时工资计算仍可用。

Matomo 已确认可反代子路径，并能配置无cookie和IP掩码；这些功能并非默认全部不采集，需要逐项配置。Plausible CE 已确认可本地HTTP部署、使用后台会话密钥并限制注册；其子目录后台在本轮早筛后未验证，不能据此宣称不支持。[10][23][24][25]

# 来源与时效

全部访问日期为2026-10-27；除注明发布日期外网页未标注日期。置信度为“中”：官方文档和对应tag源码可互相核对，但同一产品仍属于同一发布方，本轮没有独立第三方确认。版本、安全公告与镜像tag在实际部署当天重查；选型超过两个季度需刷新。计分为架构判断，没有把未经测量的性能数字当作依据。

`recon_kit.py staleness` 计算：版本与锁tag集成证据2026-11-23重查；数据边界文档2027-10-27重查，若升级版本则提前重查。最早日期2026-11-23。`tally` 统计3条关键账本判断均为unverified、verified为0，意指缺少独立发布方核验；不是源码/官方文档没有证据。引用检查27组编号全部对应，无悬空编号。后台通道、服务器资源与实际pull属于部署实测关卡，不被文档结论替代。

| 编号 | 来源（发布方） | 日期/支持内容 |
|---|---|---|
| [1] | [Umami v3.4.1 release](https://github.com/umami-software/umami/releases/tag/v3.4.1) | Umami，2026-10-23；稳定安全更新 |
| [2] | [Umami Installation](https://docs.umami.is/docs/install) | Umami，未注明；安装/数据库/镜像 |
| [3] | [Umami tagged Compose](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/docker-compose.yml) | Umami，v3.4.1；服务、PG15、端口、卷 |
| [4] | [Tracker configuration](https://docs.umami.is/docs/tracker-configuration) | Umami，未注明；自动统计与过滤 |
| [5] | [Environment variables](https://docs.umami.is/docs/environment-variables) | Umami，未注明；构建/运行变量；含v3.5项须防跨版 |
| [6] | [v3.4.1 tracker source](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/tracker/index.ts) | Umami，v3.4.1；host、过滤、history、hook |
| [7] | [v3.4.1 Dockerfile](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/Dockerfile) / [Next config](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/next.config.ts) | Umami，v3.4.1；BASE_PATH编译 |
| [8] | [Matomo changelog](https://matomo.org/changelog/) / [Installation](https://www.matomo.com/docs/installation/) | Matomo，2026-10-22 / 未注明；5.14.2 |
| [9] | [Matomo requirements](https://matomo.org/faq/on-premise/matomo-requirements/) | Matomo，未注明；运行环境与建议规格 |
| [10] | [Matomo reverse proxy](https://matomo.org/faq/how-to-install/faq_98/) | Matomo，未注明；子路径反代 |
| [11] | [Official Docker](https://github.com/matomo-org/docker) / [Docker setup](https://matomo.org/faq/how-to-install/install-matomo-with-docker/) | Matomo，未注明；数据库/归档 |
| [12] | [SPA tracking](https://developer.matomo.org/guides/spa-tracking) | Matomo，未注明；历史触发或手动页浏览 |
| [13] | [Plausible CE v3.2.1](https://github.com/plausible/analytics/releases/tag/v3.2.1) | Plausible，2026-05-15；安全版本 |
| [14] | [CE setup](https://github.com/plausible/community-edition) | Plausible，未注明；推荐资源、HTTP本地 |
| [15] | [CE tagged Compose](https://raw.githubusercontent.com/plausible/community-edition/v3.2.1/compose.yml) | Plausible，v3.2.1；PG16/ClickHouse24.12 |
| [16] | [Umami license](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/LICENSE) | Umami，v3.4.1；MIT |
| [17] | [Matomo license](https://raw.githubusercontent.com/matomo-org/matomo/5.14.2/LICENSE) | Matomo，5.14.2；GPLv3 |
| [18] | [Plausible app license](https://raw.githubusercontent.com/plausible/analytics/v3.2.1/LICENSE.md) | Plausible，v3.2.1；AGPLv3 |
| [19] | [Umami login](https://docs.umami.is/docs/login) | Umami，未注明；初始凭证、改密/2FA |
| [20] | [Umami FAQ](https://docs.umami.is/docs/faq) | Umami，未注明；SPA、cookie、保留 |
| [21] | [Tracker functions](https://docs.umami.is/docs/tracker-functions) | Umami，未注明；默认字段和自定义payload |
| [22] | [Metric definitions](https://docs.umami.is/docs/metric-definitions) | Umami，未注明；IP处理/日志边界/指标 |
| [23] | [Matomo without cookies](https://matomo.org/faq/how-to/how-do-i-enforce-tracking-without-cookies/) | Matomo，未注明；禁用cookie |
| [24] | [Matomo privacy settings](https://matomo.org/faq/general/configure-privacy-settings-in-matomo/) | Matomo，未注明；IP掩码 |
| [25] | [Plausible CE configuration](https://github.com/plausible/community-edition/wiki/Configuration) | Plausible，2025-10-29；HTTP/会话/注册 |
| [26] | [Umami official Packages](https://github.com/umami-software/umami/pkgs/container/umami) | Umami，2026-10-23；镜像3.4.1及摘要，另直接读取GHCR manifest |
| [27] | [PostgreSQL Red Hat packages](https://www.postgresql.org/download/linux/redhat/) / [Ubuntu packages](https://www.postgresql.org/download/linux/ubuntu/) | PostgreSQL Global Development Group，未注明；原生官方包路线 |
