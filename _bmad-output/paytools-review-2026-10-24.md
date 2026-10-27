# PayTools 工资计算器审查报告

审查日期：2026-10-24

## 项目定位

PayTools 是一个纯前端、静态导出的 2026 年中国大陆工资税后估算工具。目标用户是居民个人，场景限定为同一扣缴单位、按月发放工资。用户输入税前工资、入职月份、地区、社保/公积金基数和扣除项，工具按累计预扣法输出逐月个税、个人缴费与全年估算实发。

产品的商业目标是通过“工资计算器”“税后工资”“五险一金”等搜索意图获得流量，再通过合规广告或相关转化实现收益。目前代码已经形成计算器原型，但搜索获客、数据反馈和变现闭环尚未落地。

## BMad 审查摘要

- 对抗性审查：14 个问题。
- 边界审查：没有发现额外未处理分支。
- 验证缺口审查：5 个真实测试覆盖缺口。
- OCR：已尝试评审完整功能提交 `0807ae7`，但本机没有 OCR LLM provider，命令在解析 endpoint 阶段退出；本报告不把 BMad 结果冒充 OCR 结果。

### OCR delegation 结果

随后使用 OCR delegation workflow 完成了无 LLM 的 OCR 范围和规则评审：

- 提交：`0807ae7`
- 总文件：68
- OCR 判定可评审：42
- OCR 排除：26（文档、锁文件、生成数据、测试默认排除项等）
- 覆盖率：42/42，可评审文件全部检查，无跳过文件
- OCR 负责了文件筛选和规则解析，以下问题由宿主按 OCR 规则逐项核查

OCR delegation 额外发现：

1. `.github/workflows/ci.yml:7-20` 没有显式声明最小 `permissions`，也没有 job 超时和并发取消策略；建议设置 `permissions: contents: read`、`timeout-minutes` 和 `concurrency`。
2. `src/app/globals.css:119-134` 在 550px 以下隐藏整个 `hero-note`，移动端用户看不到适用范围、累计预扣口径和计算方法入口；建议保留一段折叠或简短提示。
3. `scripts/update-regions.mjs:17-20` 只检查城市数量不少于 330，没有检查城市代码唯一性、每个城市是否属于有效省份，也没有要求生成结果仍为预期的 337 条；建议把这些约束加入更新脚本和 CI。
4. `src/lib/seo.ts:4-24` 只排除少量保留域名，`staging.local` 等内部域名仍可能生成 canonical、sitemap 并允许抓取；建议用显式生产域名配置或发布环境门禁。

OCR delegation 没有发现 `eval`、`innerHTML`、硬编码密钥、React Hooks 违规或明显的死代码问题。

## 优先问题

| 优先级 | 问题 | 证据 | 建议 |
| --- | --- | --- | --- |
| P0 | 上海缴费基数超出上下限时被静默截断 | `src/lib/calculation/contributions.ts:23` | 返回实际计算基数，结果中显示用户输入、有效基数、是否触发上下限，并写入 CSV |
| P0 | 结果页无法复核缴费依据 | `src/components/SalaryResults.tsx:57` | 展示基数、费率、上下限、政策版本、来源链接和核对日期 |
| P0 | 生产构建被 Next.js 安全检查阻止 | `package.json`、`next@16.4.0` | 先升级 Next.js，再重新运行 build 和 E2E |
| P1 | 详细模式要求填写未使用的上下半年参数 | `src/components/SalaryCalculator.tsx:67` | 根据入职月份只要求会参与计算的参数 |
| P1 | 详细模式不允许表达 0 元基数或无公积金情形 | `src/lib/calculation/salary.ts:96` | 增加明确的“无该项缴费”选项，并在结果中标明适用限制 |
| P1 | CSV 缺少输入快照，无法独立复算 | `src/lib/export/salary-csv.ts:10` | 导出月薪、入职月份、基数、费率、扣除项和每月实际参数 |
| P1 | 首页和计算器页内容重复 | `src/app/page.tsx:32`、`src/app/salary-calculator/page.tsx:13` | 首页做搜索落地页，工具页做计算工作台，减少重复内容 |
| P1 | SEO 缺少结构化数据和分享元数据 | `src/app/layout.tsx:6` | 增加 FAQ、WebApplication、Breadcrumb、Open Graph 和 Twitter metadata |
| P1 | 正式域名分支没有自动保护 | `src/app/robots.ts:6`、`src/app/sitemap.ts:8` | 在 CI 中测试真实域名的 allow、canonical 和 sitemap 内容；正式构建缺少域名时失败 |
| P1 | 没有实际变现和转化入口 | `src/components/AdSlot.tsx:3` | 先定义结果页后的广告/相关转化位置，再接入匿名事件和隐私同意机制 |
| P1 | 政策核对日期多处硬编码 | `src/app/sitemap.ts:11`、`src/app/policy-sources/page.tsx:13` | 从政策配置生成更新时间，过期时阻止发布或显示明显警告 |

## 测试缺口

1. 逐月工资集成测试只检查输入框值，没有提交并验证年度和月份结果。
2. 专项附加扣除、其他扣除、免税收入没有覆盖 UI 到计算内核的提交路径。
3. 详细模式没有端到端 CSV 下载验证。
4. robots/sitemap 只检查 HTTP 200，没有检查正式域名分支的内容。
5. 404 测试没有断言响应状态码确实是 404。

## 面向流量和盈利的建议顺序

1. 先修复计算透明度：有效基数、费率、政策来源必须在结果页可见。
2. 补齐上述测试缺口，并修复 Next.js 安全版本导致的发布阻塞。
3. 将首页定位为搜索落地页，围绕累计预扣、上海 7 月调基、年中入职和工资案例建设独特内容；避免批量复制城市页。
4. 增加结构化数据、真实联系渠道、维护者/更新信息和政策变更日志，提升税务类内容的可信度。
5. 在用户看到结果之后放置广告或相关转化位，统计开始计算、完成计算、查看政策、下载 CSV 等事件；不要发送工资金额。

## 验证记录

- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run test`：8 个文件、79 个测试通过。
- `npm run build`：静态路由生成成功，但因 Next.js 16.4.0 已知安全漏洞检查退出 1。
- 业务代码：审查结束时无未提交改动；本报告是新增的审查产物。

## OCR 状态

OCR 的常规 LLM 模式仍需要 provider。当前没有以下环境变量，也没有 `~/.opencodereview/config.json`：

- `OCR_LLM_URL`
- `OCR_LLM_TOKEN`
- `OCR_LLM_MODEL`

用户已选择暂不配置常规 OCR provider。本报告已包含 OCR delegation 的文件范围、规则解析和宿主评审结果；没有把宿主评审冒充成 OCR LLM 生成的结论。
