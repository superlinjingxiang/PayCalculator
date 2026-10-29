# Workbench CLI 私有 TCP 转发核验（2026-10-28）

## 后续实测更正：关闭 Workbench 转发路线

主执行者已分别实际运行 v1.0.1 与 v1.0.4 的 `forward` 命令，均返回 `Code2 / port-forward is not available yet, stay tuned`。因此下面保留的 help、静态字符串与官方 skill 描述**只证明存在未发布入口，不证明可用**。本项目应关闭该路线，不再尝试通过升级、重启 daemon 或修改账号权限解决此明确的未实现错误。

另据主执行者实测，官方 `ali-instance-cli` v1.1.0.93 的 `portforward` 在 Windows 默认监听全部接口；把 `--local-port` 改成 `127.0.0.1:18081` 会出现 `:127.0.0.1:18081 too many colons`。未找到受支持的 bind-address 参数，不能把本机防火墙限制当成回环监听。

后续候选是官方 `ali-instance-cli ssh` 标准输入/输出代理，加 Windows 自带 OpenSSH 的显式回环 `-L`。本机 `ssh --help` 已验证 `ssh --instance … --port …`，阿里云[官方云起实验文章](https://developer.aliyun.com/article/1327179)明确给出它作为 `ProxyCommand` 的配置实例。若既有 SSH 公钥已经在目标用户的 authorized_keys 中，可复用现有私钥并固定服务器主机公钥；此路线不需要注册新公钥或开放入站安全组规则。未核验既有授权匹配前不能宣称此候选已连接成功。

以下内容为实测更正前的只读发现，留作证据，不再视为实施建议。

已安装的 `C:/Users/76358/AppData/Local/Programs/workbench/workbench.exe` 是 v1.0.1（commit `86c0aff`，2026-08-24 构建）。它**已有隐藏的原生 `forward` 子命令，无需为了检查该能力升级或重装**。顶层 `--help` 未列出该命令，必须执行 `workbench help forward` 才能看到。

本次仅运行本地 `version`、help，读取官方 installer 文本与官方文档；未启动 daemon、建立转发、读取 profile、修改云设置/安全组或重新安装。

## 已通过本地 help 核实的命令

```powershell
& 'C:/Users/76358/AppData/Local/Programs/workbench/workbench.exe' forward start `
  -i INSTANCE_ID -r cn-shanghai --remote-port 3001 --local-port 18081 -o json

& 'C:/Users/76358/AppData/Local/Programs/workbench/workbench.exe' forward list -o json

& 'C:/Users/76358/AppData/Local/Programs/workbench/workbench.exe' forward stop FORWARD_ID -o json
```

`start` 参数只有 instance-id、local-port、remote-port，加上 region/profile/output 全局参数。`local-port=0` 表示自动分配；无公开的 local-host / remote-host flag。账号已有 AK 配置可由该官方 CLI 自行复用，不需要把密钥传入命令行。

本地 `help forward` 的行为说明：通过云助手转发本地端口到实例端口；隧道由 daemon 管理，CLI 退出后继续；每个接入的 TCP 连接单独建立安全 WebSocket；要求云助手 Agent 在线。它与 `connect -p` 的 SSH 端口不是同一种能力。

**验收不能止于 forward start 成功或 list 显示记录。** 因为 WSS 按 TCP 连接创建，仍须实际请求 `http://127.0.0.1:18081` 并核对 Umami 响应，且检查本机只监听回环地址。

## 开关与副作用证据的边界

本地二进制静态符号含 `internal/portforward` 和 `internal/cloud.(*ECSClient).startTerminalSession`。这支持其使用云助手端口通道，但单凭符号不能证明完整调用序列、是否自动开通服务。

[官方 Workbench 文档](https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-through-workbench-cli/)说明普通首次连接可能自动添加来自 `100.104.0.0/16` 的内网 TCP 22 安全组规则。该说明针对 Workbench 连接整体，不能据此断言 `forward` 同样会改规则，也不能保证 `forward` 没有任何云端设置副作用。[官方凭证文档](https://help.aliyun.com/zh/ecs/user-guide/install-and-configure-workbench-cli-credentials)把 `ecs:StartTerminalSession` 列为所需权限。

官方 GitHub 的 [Workbench skill](https://github.com/aliyun/alibabacloud-aiops-skills/blob/master/skills/developertools/solutions/alibabacloud-workbench-cli/SKILL.md)在描述中声明支持 TCP forwarding，但正文没有命令或开关依赖说明；[官方命令文档](https://help.aliyun.com/zh/ecs/user-guide/use-workbench-cli-to-manage-ecs-instances)也未收录隐藏 forward。因此尚不能以官方文档保证在 SessionManager=false 时连接成功，或保证隐式修改设置绝不会发生。

主执行者若进行已获授权的真实验证，应保留开关/安全组前后状态，出现开通或授权提示时先停止；无额外授权时不调用 ModifyCloudAssistantSettings。既有回环 Umami 端口可保持不变。

## installer 与可选隔离版本

已读取（未执行）用户提供的[官方 installer](https://workbench-cli.oss-cn-hangzhou.aliyuncs.com/install.ps1)。它按 `$env:VERSION` 选择 `/releases/<version>/`，未指定时用 `/latest/`；下载 zip、尝试 SHA256 校验、替换二进制并配置 PATH。脚本在下载不到摘要时会跳过校验，因此若需要隔离下载版本应自行强制核对摘要，避免运行完整安装脚本覆盖现有版本。

v1.0.4 官方精确包已 HEAD 核实为 HTTP 200，大小 5,585,377 bytes，Last-Modified 为 2026-10-13：

```text
https://workbench-cli.oss-cn-hangzhou.aliyuncs.com/releases/v1.0.4/workbench-windows-amd64.zip
https://workbench-cli.oss-cn-hangzhou.aliyuncs.com/releases/v1.0.4/checksums.sha256
SHA256: 8637da8ed8133ffdb4cfba88e60e809003ea6c39f0cc601d325c871c726d3e41
```

此新版本未由本调研者下载或执行；现有 v1.0.1 的隐藏 forward 已足以继续验证，不需为取得该命令而升级。
