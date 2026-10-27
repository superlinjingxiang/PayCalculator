---
title: '搜索增长、国内广告与真实浏览量'
type: 'feature'
created: '2026-10-27'
status: 'in-review'
execution_state: 'paused-by-user'
route: 'dispatch'
review_loop_iteration: 0
context: ['AGENTS.md', '_bmad-output/growth-2026-10-27/design.md']
revision: 2
approved: '2026-10-27 用户：按修订版继续'
baseline_commit: '04f91f2b4afd16cb53b8a582a5d47268eea96305'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**问题：** 广告仅有空容器，线上关闭访问日志，HTTP/IP预览禁止索引。

**方案：** 四角色评估已完成。先改进工具与搜索内容、部署第一方PV并交付可打开的真实报告；正式域名与联盟账号具备后，再完成搜索上线和真实广告验收。

**用户决定（2026-10-27）：** 当前没有正式域名、备案和获批联盟账号；先完成代码和真实PV统计。本版按评估修订，尚未批准实施。

## Boundaries & Constraints

**始终：** 保留现有修改、静态导出、本地计算与界面。依据本次检索设计关键词，不编造搜索量或排名。广告标识、同意门禁及拒绝后正常计算。PV仅记固定页面与时间，供站长查看。

**禁止：** 本机计数冒充全站PV；空广告位冒充接入；批量重复城市页；擅自购买域名或签协议；无域名时解除noindex。广告未获批保持关闭，总目标不标完成。

## 交付顺序与搜索取舍

1. **先交付代码与真实PV。** 仍部署到现有IP预览，保留noindex；报告明确标识预览环境。准备正式SEO代码不等于已获得搜索曝光。
2. **搜索收窄。** 新上海页承接「上海税后工资计算器2026」「上海7月社保基数调整到手工资」；全国工具页承接「2026累计预扣个税计算器」；既有方法页回答「工资一样为什么每个月个税不一样」。已有竞争，均为待验证机会；暂不扩写文章/金额页。
3. **广告后续。** 本轮修同意机制、交付百度网站业务优先及360备选申请清单。取得域名、适用备案与获批Web代码后，实施真实适配、披露和投放验收；不猜SDK接口或伪造代码位。

## I/O & Edge-Case Matrix

| 场景 | 输入/状态 | 结果 | 异常处理 |
|---|---|---|---|
| 页面浏览 | 首屏/客户端导航/刷新 | 各上报一次路径PV；no-store，仅成功GET计数 | 重渲染不重复；失败不阻塞 |
| 非法统计 | 非白名单路径、HEAD、静态资源 | 不计PV | 拒绝或忽略 |
| 报告 | 合法日志及指定日期 | 上海时区每日/页面PV、起点/覆盖；首日注明不完整 | 无数据明确显示；无UV承诺 |
| 广告 | 拒绝/无有效平台代码 | 无联盟网络请求 | 计算、CSV可用 |
| 广告生效 | 获批配置并同意 | 真实加载且明确标识 | 失败可恢复；本站适配器不读取表单 |
| 搜索 | 正式HTTPS域名/预览 | 独立canonical与sitemap/继续noindex | 无占位域名 |

</frozen-after-approval>

## Code Map

- `src/lib/seo.ts`：复用真实域名校验；`src/app/sitemap.ts`：页面清单。
- `src/app/{page.tsx,salary-calculator/page.tsx,methodology/page.tsx}`：搜索入口及内容。
- `src/components/SalaryCalculator.tsx`：复用计算器，保留已测内核；统一预设说明。
- `src/components/{AdSlot,AdConsent}.tsx`、`src/lib/{ads,ads-consent}.ts`：现有同意门禁，尚无SDK。
- `deploy/nginx-preview.conf`：线上独立Nginx模板；现有云助手可安全执行指定实例命令，不创建新凭据。
- `src/app/privacy/page.tsx`：按实际采集与广告实现更新。

## Tasks & Acceptance

**执行：**
- [ ] `SEO_STRATEGY.md`：引用本轮调研与限制，记录上述页面词条映射。
- [ ] 现有页面、`src/app/shanghai-salary-calculator/page.tsx`：主词标题、问题说明、上海独有来源内容及站内链接；同步sitemap。
- [ ] `src/components/SalaryCalculator.tsx`及说明：切到未核实城市清空费率并要求填写；返回上海恢复上海预设。上海7%与工资联动基数明示为可修改估算预设，方法页、结果与README一致。补充切换回归。
- [ ] `src/lib/ads-consent.ts`：修复存储读取/写入被拒时当前页面选择失效，拒绝与撤回同步生效；补异常回归。
- [ ] `src/components/PageViews.tsx`、`src/lib/page-views.ts`：固定路径首屏/导航PV采集。
- [ ] `deploy/`、`scripts/pv-report.py`：PV专用日志仅时间/页面，原始日志保留30天并轮转、限制权限；无工资、IP、UA、referrer、query。日志与报告不放公开目录。日报展示采集起点、覆盖区间/不完整日、每日与页面PV，兼容轮转不重读；注明JS漏报、自动化/伪造请求影响，不报告UV/真人数。
- [ ] `scripts/get-pv-report.ps1`：现有云助手取回汇总，生成本地HTML/JSON；今日、近7/30日及页面明细，标明预览、上海时区、生成时间；无数据显式提示。
- [ ] `docs/ADS_READINESS.md`：本轮明确尚未接入SDK及实际准入依赖；后续凭正式获批代码实施适配并做平台验收，保持为未完成任务。
- [ ] `.env.example`、隐私、部署文档：配置、采集起点、报告入口、回滚与广告实际状态。
- [ ] `tests/`：统计边界、导航去重、同秒独立浏览均计数、无金额泄露、广告拒绝与异常；全量回归与独立评审。日志防重按文件/范围处理，不按时间+路径合并。

**验收：**
- Given 静态构建，When 读取页面与360px浏览，Then 搜索意图独立、上海内容有来源且计算可用。
- Given 预览部署并受控浏览两页，When 汇总服务器日志，Then 展示真实PV及采集起点，不补造历史。
- Given 广告获批且同意，When 检查请求，Then 平台真实响应、无本站主动传入工资字段；缺审批不得宣布完成。
- Given 完整实现，When lint/typecheck/unit/build/Chrome E2E与独立review，Then 通过且高优先级问题关闭。

## Implementation Notes

- 2026-10-27：用户已明确“按修订版继续”。冻结块中的“尚未批准”是修订时的历史描述；当前批准以此记录和frontmatter为准。保留现有全部修改。用户批准的预览PV部署按其明确授权执行，不创建新云凭据、不改安全组、不购买资源；先完成本地验证再发布。
- 本轮实现前快照：`C:/Users/76358/AppData/Local/Temp/paytools-before-growth-685959eeabec40948f12dfc53258fe1f`；完整基线diff与增长专用diff均在系统临时目录，未stage既有工作。
- 第一阶段已发布到既有预览：服务器Python3.6实跑、Nginx/权限/方法过滤、真实Chrome浏览与PV、轮转与报告取回均通过。启用：2026-10-27 22:32:57 Asia/Shanghai。公网Chrome14通过，2广告配置用例跳过；108 Vitest、Python6通过。采集样本包含受控测试流量，不代表自然访客。
- 用户已将正式域名、适用备案和广告获批材料置于后续阶段。冻结矩阵“广告生效”行和相应真实投放验收尚未执行，不能将容器测试当作通过，总目标仍未完成；本轮review针对已授权的代码/PV阶段。

## Spec Change Log

- 2026-10-27 rev2：依用户先做代码/PV、先调整方案的答复修订。研究→上海场景优先；评审A4/A5→清空外地费率、明示上海预设；A6→存储异常回归；PV→无缓存/成功GET/30天轮转/环境与覆盖/离线报告。广告外部激活保留待办；等待本版批准。
- 2026-10-27 用户追加“浏览量应该有开源方案，调研然后接入，阿里云肯定有现成的”。新增独立成熟统计实施记录 `spec-mature-analytics.md`，优先以Umami自托管替代自制报告作为主入口；原PV只保留历史/切换核对。付费SLS/RUM未激活，域名与真实广告延期不变。新统计数据边界以新版实际披露为准，原严格时间/路径条款继续适用于原匿名PV，不拿它冒充Umami字段说明。

## Review Triage Log

2026-10-27，最终三层已全部返回后逐项裁定；实现前工作区快照用于区分既有修改。以下每条保留独立裁定，随后仅按同一根因合并。

|编号|裁定|证据与路由|
|---|---|---|
|BH1|medium|`areas.ts`把直辖市限定01，数据存在重庆02的12县；实现前快照相同。defer。|
|BH2|medium|图表amount把负实发置零，SVG仍按毛收入分母可能超过100%；该函数与快照相同。defer，与EH1同根因。|
|BH3|medium|核心socialInsuranceBase错误键与现有自定义控件ID不对应，summary只显示数量；原catch与快照相同。defer。|
|BH4|low|关闭专项组只删除includeSpecialDeductions键，隐藏字段错误留到下次提交；快照已有。defer。|
|BH5|medium|区县import失败置空options，被表现为空地区；快照已有。defer。|
|BH6|low|custom模板sourceUrls空，详细结果仍输出核对日和空来源行；已有明确未核实警示，影响说明一致性，快照已有。defer。|
|BH7|medium|main允许起点文件缺失，已有汇总可与daily未覆盖冲突；必须对丢失元信息明确失败。patch。|
|BH8|medium|文档直接Python渲染路径没有PS包装器的公开目录保护，能写入repo out/public。添加同等目的地保护。patch。|
|BH9|medium|CI未配置广告浏览器场景，原测试已有条件skip；当前无SDK且已验证storage组件，真实投放仍延期。pre-existing defer，不把skip当投放验收。|
|BH10|medium|普通CI用Node与mock PV，无法捕获Nginx配置回归；真实服务器方法/隐私/轮转已验收，但应补可复现Linux测试。patch，与VG1同根因。|
|EH1|medium|与BH2同一负数钳零/毛收入分母缺陷，已核对实现前快照。defer。|
|EH2|medium|is_file与open间可被logrotate改名，open抛FileNotFoundError导致本次报告失败；保留checkpoint后略过该次即可。patch。|
|EH3|medium|多个合法专项字段合计超额时核心additionalDeductionsMonthly错误无可见绑定；结构化输入与catch在快照已相同。defer。|
|VG1|medium|预验证证据确认Nginx生产者被mock绕过；线上真实过滤/权限/轮转测试通过不等于有持续回归。patch，同BH10。|
|VG2|medium|当前Python回归只在函数间传state，不经独立CLI进程；线上main多次与轮转已证明当前行为，仍缺未来持久化回归。patch。|

新功能需补的5组patch：起点缺失、公开输出路径、轮转open竞态、Nginx生产者回归（BH10/VG1）、跨CLI持久化回归。既有问题单独记录，不回滚或覆盖用户原工作。

## Verification

`npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`、`npm run test:e2e`；PV以专用临时日志测试并线上受控访问核对；广告实际投放另需真实平台验收。
