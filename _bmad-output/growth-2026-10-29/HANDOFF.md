# 2026-10-29 交付与后续入口

用户要求继续完成目标、给出足够便宜的域名方案，并将本轮成果提交推送。保留前期工作，未购买域名、开通收费产品或冒充广告已获批。

## 已完成

- 成熟开源统计子目标完成：Umami 3.4.1及PostgreSQL在原ECS运行，公网仅脚本/发送两路由，管理与秘密路径404。应用/数据库无OOM，原有cqp healthy。
- 真实Chrome受控5次采集与后台/数据库一致；输入、计算、CSV不增加，无工资/query/hash/来源查询入库。5是测试PV，不是自然流量，旧21次快照未导入。
- 官方镜像锁摘要，内部网络/固定IP/原生回环代理；默认密码失效，随机密码与秘密文件留在受限位置，不进入Git。
- 用户授权后开启阿里云会话管理。Workbench两个发布版本转发未实现；官方直接portforward因全接口监听未交付，改为Windows OpenSSH的回环转发加官方stdio加密通道，复用现有公钥60秒临时认证，严格校验host key，不增加公网端口或安全组规则。
- 私有后台登录/Overview、关闭与重新开启通道、实际应用重启、备份及隔离恢复均验收。2026-10-29复查上海03:15定时备份已自动成功，manifest记录网站1/事件5/会话1。
- 三层最终review完成并逐项修复。真实代理43项、Nginx2项及失败变异、PostgreSQL三个fixture、安装前缀8项、Windows PS5/PS7权限与通道负向测试通过。前端未新增变更，既有115项Vitest/Chrome证据按原运行日期保存，未冒充今天重跑。
- 低预算域名方案写入 `docs/DOMAIN_BUDGET.md`，经独立review并修正ICP/公安备案时序。优先普通.cn，阿里日常价三年预算123元，腾讯保守预算115元，建议上限150元；免费DNSPod和Let's Encrypt，不为小额广告预期买附加资源。候选域名尚未查可注册/溢价/商标。
- 只读核对现有ECS为包年包月、2核2GiB、有公网IPv4，2027-09-05到期；初步符合服务器时长/公网条件，备案名额、主体和最终资格仍待备案控制台确认。

## 用户入口

- 后台：`http://127.0.0.1:18081`；私有通道中断后，在项目根目录运行 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-analytics.ps1`。关闭用 `scripts/close-analytics.ps1`。
- 登录信息：本机 `%LOCALAPPDATA%/PayToolsAnalytics/umami-login.json`，仅在受限本机保存。不要打印密码、AK/SK、会话URL或加入仓库。
- 详细操作：`docs/ANALYTICS.md`、`DEPLOY.md`、`TEST_REPORT.md`、成熟统计spec。实际实例/运维辅助脚本/原始验收证据仍在忽略的 `release/`。

## 仍未完成的总目标

正式域名购买、实名认证、适用备案、DNS/HTTPS与正式SEO发布，以及国内联盟主体审核、真实代码和实际投放验收。仍保持预览noindex和广告关闭。个人主体与广告变现适用性必须按实际接入商/管局及联盟审核确认，不保证收益、排名或获批。

后续顺序：选择一个普通价可注册.cn → 确认真实主体及备案资格 → 购买一年并办理 → DNS/免费证书/正式SEO → 按获批联盟代码实施投放。既有UI延期缺陷仍见 `implementation-artifacts/deferred-work.md`，本次未将它们冒充完成。

## 清理限制

自动审批以 `blocked by policy` 拒绝了Windows临时测试目录的递归和逐文件清理，未绕过。仅残留无凭据测试文本/脚本/非密连接期望，准确路径见 `growth-2026-10-28/access-negative-tests.md`。云端隔离fixture数据库/监听已清空，生产数据和服务不受影响。
