# 2026 工资计算器搜索内容策略

更新日期：2026-10-27。本轮依据[增长调研](./_bmad-output/growth-2026-10-27/research/research.md)及其检索摘要，修订为上海场景优先、全国累计预扣次级。原始观察含 [StockStep](https://stockstepup.com/zh/life/cn/salary/)、[上海税务工具](https://shanghai.chinatax.gov.cn/znzx/wap/znzx/main)、[丰收分期工具](https://www.inmoment.vip/net)、[素材阁逐月FAQ](https://www.sucaige.cn/tools/tax-calculator)。这些主题已有竞争，不代表低难度或独有功能。本文件不含未经验证的搜索量、点击率或排名承诺。

当前无正式域名、备案和联盟审批，仅向现有HTTP/IP预览部署并保留noindex。准备SEO代码不等于获得搜索曝光；真实PV不能代替搜索查询、索引或排名数据。本轮只新增一个上海页，改善既有方法页，暂不扩写文章或金额页。

## 竞争与差异

“工资计算器”“税后工资计算器”“五险一金计算器”等大词已有[通用在线工具](https://www.haogongjua.cn/tool/salary-calculator/)、[职场工具合集](https://www.51gongzi.cn/)和[招聘平台工具](https://www.job5156.com/gongzijisuanqi/)参与。仅重复“输入月薪，输出税后金额”的页面缺乏区分度。本项目的可验证价值是：2026 年累计预扣的 12 个月明细、入职月份、上海 7 月政策切换、政策版本与原始来源，以及全国其他城市明确的手动参数边界。

## 页面与检索意图

| 页面 | 主要检索意图 | 页面必须提供的独有价值 |
| --- | --- | --- |
| `/` | 2026工资到手多少 | 首屏可输入，全国地区选择、上海入口、年度概览与限制 |
| `/shanghai-salary-calculator/` | 上海税后工资计算器2026；上海7月社保基数调整到手工资 | 上海默认工具、上下半年有效期、单位基数与工资不同、个人比例与官方来源 |
| `/salary-calculator/` | 2026累计预扣个税计算器 | 12个月明细、入职月份、不同月薪、手动地方参数及CSV |
| `/methodology/` | 工资一样为什么每个月个税不一样；年中入职个税怎么算 | 跨税档可复算示例、累计公式、入职锚点、舍入与不退款边界 |
| `/policy-sources/` | 2026 上海社保基数、公积金比例、工资计算器政策依据 | 1—6 月及 7—12 月有效期、官方原文、已核实与推断状态 |

页面中的时间、城市、比例和示例必须与实际规则文件一致。标题和说明围绕用户问题自然表述，不堆砌关键词。首页和工具页各自有完整解释、官方来源与 FAQ，不依赖仅靠跳转链接才看得到的信息。

## 全国城市页发布门槛

地区下拉框覆盖全国，并不自动产生相应城市的独立搜索页面。只有某个城市的 2026 年社保、公积金规则具有可核对的官方原文、明确生效日期、独特的本地说明和测试后，才考虑发布该城市的独立页面并纳入 sitemap。若页面只是换城市名、复用同一段计算说明，则不发布。

这遵循 [Google 搜索中心对实用、可靠、以人为本内容的建议](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)和[百度搜索关于内容质量与作弊问题的规范](https://zy.baidu.com/act/guide?isResponsible=1)。重复或高度相似的 URL 还会产生规范页选择问题；见 [Google 的 canonical 说明](https://developers.google.com/search/docs/crawling-indexing/canonicalization)。

## 上线后的验证

1. 构建时设置真实 HTTPS 站点地址，检查静态 HTML 中的独立 title、description、canonical、`lang=zh-CN`，并验证 sitemap、robots、404。
2. 以手机为主检查首次可交互输入、结果表格、速度和页面可读性。
3. 由网站所有者接入搜索资源平台后，按真实曝光、查询、索引和转化数据调整内容；当前尚无站点数据，不能宣称某关键词低竞争或已获得排名。
4. 每次地方政策更新同步原始链接、有效期、规则配置、页面日期和回归测试。过期页面应更新或撤下，不沿用旧年份标题引流。
