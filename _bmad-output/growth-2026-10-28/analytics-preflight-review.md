# Umami 恢复后的部署前复核

日期：2026-10-28。独立只读复核；未提交云端命令、启动容器、修改产品或部署脚本。读取规格、昨天的HANDOFF、安装器、精确代理、后台打开脚本及新增备份/恢复脚本，没有重新做选型研究。

## 结论

**当前脚本未发现必须再改代码才能进行隔离试部署的阻塞。** 官方镜像须完整下载并通过实际RepoDigests检查；服务健康、默认密码更换、备份恢复、资源余量和用户隧道尚待真实验收，不能视作已经完成。Session Manager仍关闭是用户后台访问的明确外部依赖。

## 镜像摘要与别名：已指出并在当前代码闭环

初读时安装器固定GHCR引用，而新下载脚本使用 `docker.umami.is` 官方镜像站；相同内容不保证Docker自动创建另一registry的RepoDigest别名，可能导致安装器inspect报不存在。

主agent随后将当前 `release/install-umami.sh` 的app_image改为官方镜像站的同一锁定摘要，并增加RepoDigests包含完整预期引用的检查。已复读确认：

```text
docker.umami.is/umami-software/umami@sha256:e69d1a7932e9dab0fc523edc7be1f3a53f3c261f57856fc2167ae74a8fc022e8
```

不需要伪造GHCR摘要别名或重新构建镜像。PostgreSQL仍用Docker官方ECR缓存镜像；安装器记录实际RepoDigests。镜像完整性与平台架构仍由实机inspect/pull结果确认。

## Python、初始化与资源

- 对安装器内3段Python以3.6语法规则解析，全部通过；用到的secrets、subprocess.run及universal_newlines、urllib Request的method参数均未引入3.6之后API。Git Bash对安装器、backup和restore脚本的 `-n` 均通过。此处是本地语法/API检查，仍需目标Python3.6实际执行。
- 重新核对官方锁tag：[登录](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/app/api/auth/login/route.ts) 返回token与user.id；[用户更新](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/app/api/users/%5BuserId%5D/route.ts) 接受POST密码更新；[网站创建schema](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/app/api/websites/request-schema.ts) 允许显式UUID。当前请求方法、字段及更换密码后重新登录的步骤匹配；当前IP满足该版本域名校验表达式。所有源码访问日期为2026-10-28。
- 官方 [start-docker.sh](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/scripts/start-docker.sh) 顺序执行DB检查/迁移、tracker更新，再exec服务器；官方 [Dockerfile](https://raw.githubusercontent.com/umami-software/umami/v3.4.1/Dockerfile) 已包含运行依赖和迁移引擎。没有必要在现有小实例另做完整源码构建。
- `NODE_OPTIONS=--max-old-space-size=384`低于app的512MiB容器限制，DB限制256MiB/20连接/32MB shared_buffers；这是可试运行的资源约束，不是通过声明即可保证足够。检查启动迁移及受控访问后的RSS、OOMKilled、重启次数与既有cqp健康，确认机器仍有余量。
- 内部网络无DB主机端口，app只绑定127.0.0.1:3001。若某一步失败，安装器只停止新统计容器、保留受限数据供检查；它是首次安装流程，不应对失败残留直接重复覆盖或删除数据。

## 昨日代理问题已修复

当前app.env已包含 `CLIENT_IP_HEADER=x-real-ip` 和 `SKIP_LOCATION_HEADERS=1`；Nginx同时覆写X-Real-IP、X-Forwarded-For并新增清除Fastly/Netlify/DigitalOcean IP头，昨日U1在代码层关闭。只代理script/send，其他analytics路由404；Cookie、Authorization和Referer不向上游透传。真实容器env和公网路由仍需验收。

## 私有登录与备份交付边界

- 本机官方CLI版本1.1.0.93的只读 `--help` 已确认支持config-path、profile、region、local-port及remote-port的IP:port形式。未实际建立会话。脚本会检查本地监听仅loopback，不通过开放公网端口补救。
- `scripts/open-analytics.ps1`只输出LOCALAPPDATA下 `umami-login.json` 的路径，**不负责生成或取回该文件**。主agent应在服务改密成功后通过现有授权通道把凭据安全交付到受限本地目录，并确认文件存在，再称用户可登录；不能只交一个空路径。
- 当前用户开关仍关闭；应在服务ready后请用户开启，再实测官方隧道、后台登录和页面PV。没有实际隧道与登录，不称后台已可访问。
- `backup-umami.sh`使用受限目录/umask077、pg_dump自定义格式、归档检查、原子改名、摘要和受限范围的到期清理；`verify-umami-restore.sh`仅创建/删除预先确认不存在的 `paytools_restore_check` 临时数据库，不覆盖生产库。尚须实际备份/恢复执行记录，而非仅凭语法通过。

可推进步骤：完成官方镜像 → 私有安装及改密/同UUID站点 → 资源与备份恢复验收 → 真实采集代理与后台API验证 → 用户开启Session Manager并实测登录。正式域名、备案、HTTPS和真实广告仍是独立待办。

## publish-umami.sh 追加复核

只读检查当前发布器，未运行服务器命令。结论：**允许试部署，没有发现新的旧站保护或后台公开边界阻塞。**

- 本地ZIP实际SHA256为 `6467f7d117a6440a20122b6f6c5971b5bdcc5cd6b6b2b533b810f86f73dee937`，与脚本expected一致；ZIP无绝对或父目录跳转条目。包内snippet逐字节等于当前 `deploy/umami-locations.conf`；robots为Disallow:/。Git Bash `-n` 通过。
- 发布前检查私有heartbeat、旧config的固定hash与旧current目标；hash校验/解包发生在正式配置和指针变更前。正式修改前已备份config和旧目标，并安装ERR trap。
- 失败时恢复旧config/current，验证Nginx配置、reload、真实指针和active后才输出恢复成功；代理404、GET采集405以及noindex检查仍在trap保护内。新snippet只精确代理script/send，其余analytics路由404，没有公开管理API。
- 非阻塞收尾：collection-start当前在解除trap及published输出后写入，建议移至成功输出前，避免元信息写入失败时已先报published；失败回滚保留未引用snippet，下一次安装因`test ! -e snippet`拒绝，应明确归档该残留后再试。二者不影响成功部署的计数路径或回滚后的旧站私有边界。

## Docker26 internal端口修正建议（只读）

主agent提供实机结果：app运行无OOM但内部网的`-p`无映射，127.0.0.1:3001无监听；失败处理已停止新容器，原站未改。已核对 [Moby v26.1.3 endpoint.go](https://raw.githubusercontent.com/moby/moby/v26.1.3/libnetwork/endpoint.go)：仅非internal网络才编程外部连接，解释此现象；不应通过hostnetwork或开放出站绕过。

推荐最小路径：保留internal bridge和全部既有secrets/DB卷，让应用有固定容器IP，再用宿主机已有systemd-socket-proxyd只在loopback3001接受连接，转到固定appIP:3000。Docker文档说明bridge允许宿主机直达容器，internal限制外网；仍须在该实机先验证宿主机直接heartbeat成功，再加代理。[Docker bridge](https://docs.docker.com/engine/network/drivers/bridge/)、[internal网络配置](https://docs.docker.com/reference/cli/docker/network/create/)

1. **先保全失败现场。** 既有DB/role已可能初始化，不能重跑首次安装器生成新密码或再次CREATE USER。复用原env、secrets与具名卷，先检查容器与数据库状态。
2. **固定IP。** 若现有internal网络/IPAM可用，直接记录其subnet/gateway并在同网以显式`--ip`重建仅app即可；不必为了显式配置重建网络。若确需重建，仅处理本任务且已停止的两个容器/网络，预先核实该网只含它们、subnet与宿主路由/其他Docker网不重叠，卷不删除、env/secrets不覆盖。固定IP必须落在核实过的subnet内，不能猜地址。
3. **现成代理。** 配置同名.socket/.service；socket为 `ListenStream=127.0.0.1:3001`、`Accept=no`、WantedBy=sockets.target。service显式Requires/After该socket及docker.service，以实际存在的systemd-socket-proxyd路径和 `固定IP:3000` 为ExecStart；只启用socket，不配置裸3001监听。
4. **版本和网络命名空间。** 不给TCP代理service设PrivateNetwork=yes，否则自身发起连接时看不到宿主bridge。不要复制当前新手册的`--exit-idle-time`（systemd246才加入）或PROXY protocol选项（261才加入）；使用本机现有版本支持的基础目标参数。[官方systemd-socket-proxyd](https://www.freedesktop.org/software/systemd/man/latest/systemd-socket-proxyd.html)、[socket地址格式](https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html)
5. **验收。** 先host直达固定IP heartbeat，再127.0.0.1:3001 heartbeat；ss只能看到loopback3001；外网3001不可达；internal网络仍无外网路由、DB未发布；重启新app后固定IP和heartbeat保持。Nginx及官方本机隧道仍使用原127.0.0.1:3001，不改变其私有边界。失败时停止本次新增socket/service及新容器，保留DB数据与密钥。

这是基于官方接口与当前实机证据的修正设计，不是代理已经部署成功；本agent未执行服务器操作。

## 本机后台通道替代方案复核

主agent已记录：Workbench两个版本forward均为未实现入口；ali-instance-cli portforward默认全接口，回环地址参数不受支持，已由guard停止。不能继续把这两种方式交付为安全回环隧道。用户随后明确授权开启Session Manager，主agent报告账号开关已启用、日志投递未变；本agent没有操作该开关。

**方案级结论：可采用官方SSH标准输入/输出代理＋Windows OpenSSH显式回环-L，配合既有公钥的60秒临时注册。** 这是对拟议实现的判断，不代表最终新脚本或真实登录已验证。

- 阿里云帮助中心明确记录 [send_public_key临时密钥流程](https://help.aliyun.com/zh/ecs/user-guide/register-a-public-key-and-connect-to-an-instance-with-the-key-by-using-ali-instance-cli)：公钥注册后须在60秒内用对应私钥认证。可复用已存在的公私钥，不需要新建key，也不需要往永久authorized_keys追加。API链路只发送公钥，不应复制私钥到服务器或日志。文档访问2026-10-28。
- 主agent已从官方CLI ssh子命令收到远端SSH banner，说明标准流通道确实存在；文档中的 [ProxyCommand示例](https://developer.aliyun.com/article/1327179) 可佐证组合方式。该社区示例不能代替本机真实握手及认证验收。
- OpenSSH用 `-N -T -L127.0.0.1:18081:127.0.0.1:3001`；专用 `-F`配置或none避免用户全局配置叠加其它转发。显式ForwardAgent=no、GatewayPorts=no、BatchMode=yes、IdentitiesOnly=yes、IdentityAgent=none、ExitOnForwardFailure=yes；不使用-g。`-L`显式bind地址及ProxyCommand为 [OpenSSH受支持接口](https://man.openbsd.org/ssh)，相关选项见 [ssh_config](https://man.openbsd.org/ssh_config)。
- host公钥须从已认证云助手的准确实例取回，使用专用known_hosts和与实例对应的HostKeyAlias、StrictHostKeyChecking=yes；不使用ssh-keyscan结果作唯一信任依据、不accept-new、不绕过主机密钥变化。ProxyCommand仅传配置路径/实例/地域，不在命令行携带AK/SK。
- 当前已存在AuthorizedKeysCommand helper是有利条件，但应核对sshd对root连接的实际生效配置：公钥认证、AllowTcpForwarding和PermitOpen允许本目标。send_public_key在缺插件时有自动安装路径，不应仅因“临时公钥”就保证永不修改持久配置；已有有效helper时不应主动重装或改sshd/SG。
- 如果既有私钥有口令，BatchMode+无agent将拒绝认证，应明确交用户处理，不能移除口令、生成新key或开放密码认证；不为旧RSA密钥自动降级到SHA-1签名。
- 临时注册成功后立即认证；60秒是认证注册有效期，不是已经建立的SSH连接寿命。真实验收仍须检查监听仅127.0.0.1、heartbeat及后台登录/统计数据；ExitOnForwardFailure不能单独证明远端3001有服务。关闭隧道后本地地址不可达，公网后台仍404。

本agent仅阅读资料和既有本地脚本，没有注册公钥、读取私钥内容、登录远端或变更账号。
