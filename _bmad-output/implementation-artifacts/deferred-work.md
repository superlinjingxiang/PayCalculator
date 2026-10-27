- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 补齐重庆02分组区县选择。
  evidence: 最终BH1核对数据存在12县，areas.ts固定01且实现前快照相同，未由本轮增长引入。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 负实发场景改用可表达负数的收入构成展示，避免无效饼图。
  evidence: BH2/EH1确认amount置零且扣除可超过毛收入；图表实现前已存在，当前结果数值本身仍显示带符号。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 将核心基数验证错误映射到当前可见表单与焦点目标。
  evidence: BH3确认socialInsuranceBase错误无同名控件，summary仅数量；原工作区catch已如此。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 关闭专项扣除组时清理隐藏字段错误。
  evidence: BH4确认toggle只清组键；下次提交会纠正，但当前提示可能指向隐藏控件，属于既有交互问题。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 区县数据加载失败与真实空名单分开提示并允许重试。
  evidence: BH5确认import catch将options置空；该路径在实现前已存在。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 手动地区结果区分用户参数与国家个税来源，不显示空官方来源行。
  evidence: BH6确认custom sourceUrls空且仍显示模板核对日；结果已另有手动未核实警示，属既有说明一致性问题。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 为既有广告容器门禁加入单独配置的CI浏览器任务，真实SDK另待审批。
  evidence: BH9确认原CI未启用PLAYWRIGHT_ADS_ENABLED；组件覆盖已验证存储异常，默认关闭场景不能替代已配置浏览器回归。
- source_spec: `spec-growth-seo-ads-pv.md`
  summary: 结构化专项扣除合计超额时提供可见字段错误与焦点。
  evidence: EH3确认各项合法但总和超核心上限时使用隐藏aggregate字段错误；原UI与异常映射在实现前已存在。
