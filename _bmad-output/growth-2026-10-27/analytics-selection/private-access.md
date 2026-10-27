# Umami 后台私有访问可行性（2026-10-27）

结论：**阿里云官方 Session Manager CLI 的 TCP 端口转发适合本次要求，具有实施可行性；尚未验证当前账号是否已启用会话管理以及现有 AK 的必要权限。** 可以让 Umami 后台仅监听 ECS 回环地址，通过 Windows 本机端口访问；无需 SSH 密钥、域名、TLS 证书、新公网入站端口或新购云产品。跨网络传输由会话管理 WSS 加密。这里的 localhost HTTP 只走本机回环，不能把后台登录反向代理到现有公网 HTTP。官方说明见[会话管理](https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-session-manager-2/)。

## 官方工具与最小命令

官方下载入口：[安装说明](https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-ali-instance-cli/)。该页 Windows 下载链接实际指向：

```text
https://aliyun-client-assist.oss-accelerate.aliyuncs.com/session-manager/windows/ali-instance-cli.exe
```

文档提供的是随服务更新的官方 OSS 二进制链接，未提供对应 GitHub Release 标签或摘要，不能声称已核对版本/签名。此调研未下载、运行二进制。

完成既有凭证适配后，官方端口转发语法为：

```powershell
.\ali-instance-cli.exe portforward -i INSTANCE_ID -r 3002 -l 13002
# 等待 Waiting for connections 后，在浏览器打开 http://127.0.0.1:13002
```

3002 是示例 ECS Umami 监听端口，应按最终部署替换。官方也支持 `-r TARGET_IP:TARGET_PORT`；可在实际运行时验证 `-r 127.0.0.1:3002`。进程退出则转发关闭。见[官方端口转发说明](https://help.aliyun.com/zh/ecs/user-guide/perform-port-forwarding-by-using-ali-instance-cli/)。

Windows 隐藏窗口可由启动脚本使用 `Start-Process -WindowStyle Hidden -PassThru` 实现；这是本机进程管理方案，需记录 PID、日志并检查隧道就绪后再打开页面。文档的“窗口关闭结束会话”意味着进程必须持续存活，不能启动后立即销毁其执行环境。不要把 AK/SK 拼进可见命令行或日志。

## 现有 AK 复用与尚待验证的边界

CLI 官方明确支持已有 AK、STS Token、CredentialsURI 三种配置，AK 的交互命令为 `ali-instance-cli.exe configure --mode AK`。官方另有直接传参的端口转发例子，包含 `--mode AK --access-key-id … --access-key-secret=… --region …`，见[计算巢官方示例](https://help.aliyun.com/zh/compute-nest/use-cases/use-the-session-management-feature-to-implement-local-vpc-access)。因此无需创建新 AK，但仍需安全地让该工具读取现有凭证。

**没有找到 ali-instance-cli 自身直接读取 `~/.workbench/config.json` 或 `ALIBABA_CLOUD_*` 环境变量的官方保证。** [阿里云 CLI 的环境变量说明](https://help.aliyun.com/zh/cli/environment-variables)适用于 `aliyun`，不能直接套用到 `ali-instance-cli`。实施者应先运行无凭证的 `--help`、`portforward --help`、`configure --help`，确认版本支持的配置路径/环境变量；不要为了通过测试创建新凭证或覆盖已有配置。若帮助信息不支持，官方 CredentialsURI 是可研究的凭证桥接路径，但本调研未验证协议和实现。

## Linux 实例与账号前提

- 实例状态 Running；`DescribeCloudAssistantStatus` 返回云助手正常且 `SupportSessionManager=true`。
- Linux 云助手 Agent 支持门槛为 2.2.3.256（API 文档写高于此版本）；以返回的 SupportSessionManager 为准。
- 当前账号已启用会话管理。CLI 安装文档称首次开启只能在控制台完成；已有云助手可执行命令不代表会话管理必然已启用。
- 既有凭证具备 `ecs:StartTerminalSession`。控制台校验可能还需要 `ecs:DescribeCloudAssistantStatus`、`ecs:DescribeUserBusinessBehavior`；未开启服务时另涉及 `ecs:ModifyCloudAssistantSettings`。只调研，不代改 RAM 权限。
- 云助手可出站访问服务；普通安全组默认允许出站，无需改动。若出站受限，应核对官方列出的 TCP 443 到 100.100.0.0/16、DNS 等要求，不能以增加公网入站代替。

上述条件见[安装与前提](https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-ali-instance-cli/)和[会话管理权限、安全性](https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-session-manager-2/)。

## API 契约（供已有 AK SDK 复用）

阿里云对应 API 名是 **StartTerminalSession**，不是 AWS 的 StartSession。

建立隧道前，可用已有签名 helper 调用以下**只读** API；无须用 StartTerminalSession 试探开关：

```text
Version=2014-05-26
Action=DescribeCloudAssistantStatus
RegionId=当前地域
InstanceId.1=当前实例 ID
读 InstanceCloudAssistantStatusSet.InstanceCloudAssistantStatus[0]:
  CloudAssistantStatus（string，应为 "true"）
  SupportSessionManager（boolean，应为 true）
  CloudAssistantVersion

Version=2014-05-26
Action=DescribeCloudAssistantSettings
RegionId=当前地域
SettingType.1=SessionManagerConfig
读 SessionManagerConfig.SessionManagerEnabled（boolean；全地域开关）
```

对应文档：[DescribeCloudAssistantStatus](https://help.aliyun.com/en/ecs/developer-reference/api-ecs-2014-05-26-describecloudassistantstatus)、[DescribeCloudAssistantSettings](https://help.aliyun.com/en/ecs/developer-reference/api-ecs-2014-05-26-describecloudassistantsettings)。没有找到 `DescribeSessionManagerStatus` 的官方证据；`DescribeUserBusinessBehavior` 虽有公开接口，但 `statusKey` 参数未解释，不推荐猜值。查询失败应保留失败事实，不替换成修改设置请求。云助手最低版本在两份官方 API 文档中分别写 189 和 256，因此以较保守版本及实际 SupportSessionManager 返回共同判断。

```text
ECS API version: 2014-05-26
Action: StartTerminalSession
RegionId: 当前实例地域
InstanceId.1: 当前实例 ID
PortNumber: 3002
TargetServer: 可选目标地址；仅访问本实例时可省略
ConnectionType: Internet（本机客户端访问云端 WSS，并非开放 ECS 公网端口）
不传 CommandLine（它与 PortNumber/TargetServer 互斥）
返回：RequestId、SessionId、SecurityToken、WebSocketUrl
结束：EndTerminalSession
```

WebSocketUrl 含短期会话令牌，应按凭证处理；官方写有效期 10 分钟、建立后无数据 3 分钟会断开。返回 URL 不能当普通网页打开，也不能仅调用 API 就声称已有 TCP 隧道；仍需完成云助手 WebSocket 数据协议和本机 TCP 转发。优先使用官方 CLI 实现该部分。见[StartTerminalSession 官方 API](https://help.aliyun.com/zh/ecs/developer-reference/api-ecs-2014-05-26-startterminalsession)。

## 费用、性能和其他入口

会话管理本身免费；若主动启用会话记录投递，会产生数据存储费用。本方案不需要开启投递或购买堡垒机。Umami/PostgreSQL 占用既有 ECS 的计算、内存、磁盘，现有资源是否足够由部署负责人验证。官方文档给出单会话带宽限制（中英文对 KB/kb 记法不同），后台首次加载可能较慢，不能把它作为高吞吐公网接入方案。[费用与限制说明](https://help.aliyun.com/zh/ecs/user-guide/connect-to-an-instance-by-using-session-manager-2/)

未找到当前 Workbench 对任意 ECS 内部 Web 服务提供受账号保护预览的明确官方证据，因此不将其作为交付依赖。阿里云 Cloud Shell 的网页预览确有官方资料，但作用于 Cloud Shell 虚拟机内的服务，不能据此声称 Workbench 自动能预览当前 ECS 的 Umami。[Cloud Shell 官方历史手册](https://static-aliyun-doc.oss-cn-hangzhou.aliyuncs.com/download%2Fpdf%2F90389%2F%25E4%25BD%25BF%25E7%2594%25A8%25E6%2589%258B%25E5%2586%258C_intl_zh-CN.pdf)

## 交付验收边界

1. 公网 80 只开放统计脚本/事件接收所需路径，后台路由、登录 API 不可从公网 HTTP 访问。
2. Umami 后台经隧道可在 `http://127.0.0.1:13002` 登录、看到真实数据；不启用公开分享替代后台账号。
3. 关闭本机隧道后 localhost 页面失联，公网仍无法访问后台。
4. 最终核验本机监听地址仅为 127.0.0.1/::1；若 CLI 默认监听全部接口，必须采用其受支持参数限制，未解决前不交付。
5. 不把 AK、SK、会话 URL、管理员密码写入仓库、命令输出或调研文档。

本报告仅查阅官方资料并写入此调研文件，未读取账号配置、改动服务器/安全组/RAM、下载执行程序或建立会话。
