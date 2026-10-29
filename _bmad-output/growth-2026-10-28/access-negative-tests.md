# 统计后台私有访问负向测试

于 2026-10-28 在用户的 Windows 电脑上执行。全部功能断言通过。测试仅读取和运行产品脚本，未修改产品源代码，未输出或记录凭据、主机公钥内容。

## ACL 修复：Windows PowerShell 5 和 PowerShell 7

分别为两种运行时在本次专用的系统临时目录中创建新目录和文件。先为各对象显式添加 Everyone（`S-1-1-0`）Allow FullControl 规则，并确认授权已存在；再调用 `Set-AnalyticsOwnerOnlyAcl`，检查最终 DACL。

| 运行时 | 对象 | DACL 禁止继承 | 规则数 | 最终规则 | 结果 |
| --- | --- | --- | --- | --- | --- |
| Windows PowerShell 5.1.26100.9711 / Desktop | 目录 | true | 1 | 仅当前用户 SID，显式 Allow FullControl | 通过 |
| Windows PowerShell 5.1.26100.9711 / Desktop | 文件 | true | 1 | 仅当前用户 SID，显式 Allow FullControl | 通过 |
| PowerShell 7.6.5 / Core | 目录 | true | 1 | 仅当前用户 SID，显式 Allow FullControl | 通过 |
| PowerShell 7.6.5 / Core | 文件 | true | 1 | 仅当前用户 SID，显式 Allow FullControl | 通过 |

上述测试对象均未保留继承规则或其他显式访问规则。

## 已有隧道运行时申请第二个本机端口

测试前：`tunnel.pid` 记录的 PID 为 **37052**，18081 的监听进程与该 PID 一致；`/api/heartbeat` 返回 HTTP **200**；18082 没有监听。

执行 `scripts/open-analytics.ps1 -LocalPort 18082` 后，请求被拒绝，原始错误为：

```text
Another analytics connection is already active. Close it before changing instance or local port.
```

拒绝后，PID 文件的字节内容及 SHA256 均未改变；18081 仍由 PID 37052 监听，心跳仍返回 HTTP 200；18082 的监听数为 **0**。**通过**，未创建第二条隧道。

## 主机公钥信任与实际执行的实例、地域绑定

通过临时 ConnectionConfig 文件分别设置错误的实例 ID 和错误的地域，未修改真实连接配置或 known_hosts 内容。每次调用仅使用已有认证 helper 的只读命令获取远端 SSH 主机公钥，两种不匹配情况独立测试。

| 临时期望配置 | 结果 | known_hosts SHA256 |
| --- | --- | --- |
| 不同但格式有效的实例 ID；实际地域 | 拒绝 | 未改变 |
| 实际实例 ID；其他有效地域 | 拒绝 | 未改变 |

两次调用均返回预期的原始错误：

```text
Cloud helper executed on a different or unverified instance/region. Trust was not changed.
```

这验证了 `EXECUTED_INSTANCE_ID` / `EXECUTED_REGION` 检查在处理信任记录之前生效。两种独立的不匹配情况均**通过**。

## 最终功能状态

- 已有隧道 PID：**37052**，未改变。
- `http://127.0.0.1:18081/api/heartbeat`：HTTP **200**。
- 18082 端口：监听数为 **0**。
- 原 known_hosts 内容哈希：未改变。
- 本次测试未修改会话管理设置、安全组、密钥或产品源代码。

## 临时文件清理限制

自动执行审批在命令启动前，分别拒绝了已校验范围的递归清理，以及范围更小、逐个指定文件的非递归清理；两次原始原因均为 `blocked by policy`。未使用其他 shell 或文件系统 API 绕过拒绝。因此，临时测试文件仍保留，清理**尚未完成**。功能验证完成后，不再尝试清理。

本次专用测试目录的准确路径：

```text
C:/Users/76358/AppData/Local/Temp/paytools-access-negative-5fd709ee27a04be3bfc28c25f0c7c179
```

目录内保留：`acl-ps5/test-only.txt`、`acl-ps7/test-only.txt`、`acl-test.ps1`、`different-instance.json`、`different-region.json`。另有指针文件保留在 `C:/Users/76358/AppData/Local/Temp/paytools-current-negative-root.txt`。这些文件仅包含测试代码、测试文本及不含密钥的连接期望信息，不包含密钥材料或凭据。
