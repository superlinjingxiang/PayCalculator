# 浏览量后台使用

当前使用自托管Umami 3.4.1。浏览网站会发送匿名页面统计；输入工资、计算与CSV导出不会发送工资或增加浏览量。浏览量是PV，访客是Umami推导的匿名会话指标，均不能直接当真人数。2026-10-28验收时的5次浏览是受控测试；旧报告的21次快照未导入，两个统计源不合计。

## 查看与关闭

当前电脑已建立私有通道，并在独立的受限Chrome配置中打开后台。普通浏览器也可打开 [统计后台](http://127.0.0.1:18081)，用户名与随机密码保存在 `%LOCALAPPDATA%\PayToolsAnalytics\umami-login.json`，不要发到聊天或提交Git。

下次通道关闭后，在项目根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-analytics.ps1
```

此参数仅适用于本次PowerShell进程。脚本复用本机已有阿里云凭证和SSH身份，不创建密钥；按官方机制注册既有公钥的60秒临时认证，再使用Windows OpenSSH的显式回环转发与官方CLI加密通道。只允许一个活动后台通道，换本机端口或实例前先关闭原通道，避免遗失旧进程。服务器主机公钥已通过现有云助手取得，严格校验；首次准备可运行 `scripts/get-analytics-host-key.ps1`，helper须在认证执行结果提供`EXECUTED_INSTANCE_ID`与`EXECUTED_REGION`且吻合连接配置，否则不会保存信任；不能使用未知helper或关闭host key校验。私钥有口令而当前不能解锁时，脚本会失败，不能移除口令来解决。

关闭本机通道：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/close-analytics.ps1
```

只会停止经PID、程序路径与专用配置核验的本任务进程树，停止后localhost无法访问；网站继续采集。阿里云会话管理已按所有者2026-10-28“你开启一下”的授权开启（全地域）；未开启会话操作记录投递或新建公网管理端口。

## 数据与运维

Umami/PostgreSQL仅在既有ECS运行，内部网络无公网出站。宿主机原生TCP代理只监听127.0.0.1:3001，公网Nginx仅开放脚本与采集两个精确路径，其余后台/API不开放。`deploy/install-umami.sh`是首次安装脚本，不用于覆盖既有数据库或恢复失败现场；升级/恢复必须保留env、秘密文件和数据库卷。

每天上海03:15生成同盘数据库备份，受限目录/文件权限为0700/0600，保留14天及最新成功备份；完成manifest最后发布，恢复后比对同一源快照的站点/事件/会话清单。已实际恢复到隔离数据库验证，当前没有异地备份。详细部署、镜像摘要、生产恢复步骤及源脚本见 [DEPLOY.md](../DEPLOY.md)。正式域名、HTTPS、备案及广告联盟审批仍待后续完成。
