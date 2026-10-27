# Umami接入前独立评审

评审日期：2026-10-27。范围：成熟统计规格、三份调研、当前Analytics组件/配置、锁版本tracker夹具与测试、隐私说明、`release/install-umami.sh`、`deploy/umami-locations.conf`。未修改产品或部署代码、未操作用户账号、未启动容器。

## 结论

**前端接入和私有后台架构可继续；公网采集启用前有1项代理信任边界需修复。** 目前镜像仍在下载，尚不能宣称后台已运行、默认密码已实际更换或用户已经能登录查看统计。Session Manager用户开关及真实后台/资源/备份验收仍是交付条件。

## U1：未清除的代理头仍能覆盖真实客户端IP和地区

- **位置：** `deploy/umami-locations.conf` 的采集代理头；`release/install-umami.sh` 生成app.env处。
- **触发：** 客户端向公开采集端点带入 `Fastly-Client-IP`、`X-Nf-Client-Connection-IP` 或 `Do-Connecting-IP`。这些头当前仍被Nginx原样转发。
- **证据：** 锁定v3.4.1的 [src/lib/ip.ts](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/lib/ip.ts) 按固定顺序取首个非空头，这三个头位于 `x-real-ip` 之前。因此仅覆写 `X-Real-IP` 与 `X-Forwarded-For` 不足以保证使用Nginx看到的客户端IP。此外 [src/lib/detect.ts](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/lib/detect.ts) 默认信任Cloudflare、Vercel、CloudFront与EdgeOne地区头；当前并未全部清除，伪造的country/region/city可进入地区统计。访问上述源码日期为2026-10-27。
- **影响：** 匿名会话标识/IP地域可被伪造；与规格“不能把任意客户端转发头当可信IP”不一致。该问题不是读取工资表单或公开后台密码。
- **最小修复：** app.env显式设置 `CLIENT_IP_HEADER=x-real-ip` 与 `SKIP_LOCATION_HEADERS=1`，继续在Nginx覆写 `X-Real-IP $remote_addr`；或按锁版本源码完整清除所有优先头与地区头。前一方案由锁版本源码直接支持，不应使用v3.5才加入的 `TRUSTED_PROXIES` 冒充v3.4配置。
- **验收：** 检查实际容器env/代理配置；带入以上伪造头发送受控页面浏览，核对实际匿名会话和地区按可信远端地址/本地GeoIP推导，不采信这些客户端头。受控流量需单独标注。

## 已核对、未发现新增阻塞的部分

- `getAnalyticsConfig` 只允许umami及合法公开UUID；脚本/端点固定同源，未配置不加载。公开UUID与后台密钥明确区分。
- 手动 `track(object)` 对应锁版本官方tracker的真实对象重载，直接发送对象而非合并document URL/title。禁用auto-track与auto-pageview避免双计；无自动点击、性能、identify、自定义个人ID。7条路径、固定title、搜索来源根域名白名单有效。
- 延迟队列保存路由快照；首屏、导航往返与刷新各计一次，重复渲染和重复ready不重复播放。脚本或track失败不阻塞计算/CSV。已阅读真实SDK夹具的E2E测试；本agent独立复跑相关Vitest共7项通过。没有把mock初始化调用当真实线上入库证据。
- metadata及script采用no-referrer；SDK上报credentials=omit；Nginx剥离Cookie、Authorization、Referer并隐藏Set-Cookie。脚本GET可能附带同源Cookie而上游剥离的区别已据实披露。
- Umami镜像使用官方摘要，PostgreSQL来自Docker官方ECR命名空间；内部Docker网络、DB无主机端口、应用只绑定127.0.0.1:3001。公网只代理精确script/send，`/analytics/`其余路由404，不代理登录、分享或管理API。
- 安装器先检查不存在同名容器/秘密文件，随机数据库与应用密钥写入0700目录/0600文件；仅新统计容器在失败后停止、数据保留，不停止既有cqp容器。应用512MiB/1CPU、DB256MiB/0.5CPU是限制而非已实测保证，需看实际RSS、重启和既有服务状态。
- 默认账号改密API方法与锁版本 [用户更新路由](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/app/api/users/%5BuserId%5D/route.ts) 相符；改密后重新登录；显式同UUID创建网站符合 [网站创建路由](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/app/api/websites/route.ts)。仍需部署后确认成功；不能把脚本中有改密步骤视为已更换。默认密码仅限私有loopback初始化窗口。
- PRIVATE_MODE、遥测/更新关闭、内部网络控制出站；未显式启用MCP。隐私说明已区分无Cookie追踪与服务器短暂处理IP/User-Agent，未承诺完全不接触IP；旧PV不倒灌且切换后默认关闭新采集。

## 上线验收尚待完成

1. 完整镜像摘要和服务健康、无OOM重启、既有cqp服务保持原状。
2. 默认密码实际失效、新密码登录及预留website UUID一致。
3. 公网script/send正常、其它后台/认证路径不可达；3001/5432不暴露公网。
4. 真实浏览→后台页面数据精确增量，字段与头不含工资/query/hash，旧PV不会合计。
5. PostgreSQL备份、一次恢复验证及受限备份权限；清理策略按实际数据留存维护，不把旧PV30天原始日志策略自动套用到Umami数据库。
6. 用户启用Session Manager后，以官方本地loopback隧道登录后台；未开启前仅可报告服务准备状态，不能称用户已能访问。

此轮评审允许在U1修复后进行隔离服务试部署与真实链路验收；正式域名/备案/广告联盟仍不因Umami接入而完成。
