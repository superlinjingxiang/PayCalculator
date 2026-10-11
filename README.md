# PayTools 工资计算器

面向中国大陆居民个人的免费工资税后估算工具。P0 只支持 **2026 年、同一扣缴单位、按月发放的工资薪金**。按累计预扣法逐月估算个人所得税，区分工资、社保缴费基数和住房公积金缴存基数。工资输入在浏览器内参与计算，无账号或后端工资数据服务。

## 本版包含

- 2026 年 12 个月累计预扣个税、个人养老/医疗/失业保险及普通住房公积金估算、全年汇总。
- 中国大陆 31 个省级地区、337 个地级及省直管地区选项；全国个税规则通用，地方参数按核实状态处理。
- 上海 2026 年上半年与下半年分期规则；单位实际缴费基数与公积金比例仍由用户确认。
- 支持单位 7 月起调整社保和公积金基数；修改参数时清除旧结果，计算完成后定位到结果。
- 可下载含全部月份、年度合计和规则口径的 CSV，文件仅在本地生成。
- 其他省市使用手动参数模式；不提供未经核实的地方默认费率或上下限。
- 静态 HTML 页面、政策来源和方法说明、隐私说明、404、robots 与 sitemap。
- 单元、组件和浏览器端测试；真实广告 SDK 默认没有接入。

年终奖单独计税、Offer 对比、雇主成本、其他城市的自动政策包、账号和海外税制不在 P0 范围。结果用于估算，不能替代工资条、扣缴申报或个人所得税年度汇算。

## 环境与运行

- Node.js **20.9 或以上**（[Next.js 16 官方要求](https://nextjs.org/docs/app/getting-started/installation)）。
- npm 随 Node.js 安装；建议使用与 lockfile 对应的 `npm ci`。
- 浏览器测试需要本机安装 Google Chrome；日常单元测试不需要 Chrome。

```bash
npm ci
npm run dev
```

开发服务器默认位于 `http://localhost:3000`。代码采用 Next.js App Router、TypeScript、React、decimal.js 和静态导出；无数据库、登录服务或 Node.js 生产常驻进程。

| 命令 | 用途 |
| --- | --- |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 严格类型检查 |
| `npm run test` | Vitest 单元与组件测试 |
| `npm run test:e2e` | 先构建，再由 Playwright 使用本机 Google Chrome 检验导出的静态文件 |
| `npm run build` | 构建静态站点到 `out/` |

CI 执行 lint、typecheck、test 和 build；浏览器测试需先执行 `npm run build`，再在安装 Chrome 的环境中运行。`next build` 不自动执行 ESLint，应分别运行上述命令。

## 页面

| 路径 | 内容 |
| --- | --- |
| `/` | 工具入口及说明 |
| `/salary-calculator/` | 详细工资计算器 |
| `/methodology/` | 公式、示例和边界 |
| `/policy-sources/` | 官方来源、适用日期与状态 |
| `/privacy/` | 隐私说明 |
| `/about/` | 站点用途与免责声明 |
| `/404.html` | 静态错误页 |

## 规则和精度

规则文件位于 `src/config/policies/`，按地区和生效期独立保存。税率和基本减除费用见 `cn-2026-national.json`；上海 1–6 月取 `shanghai-2025-07.json`，7–12 月取 `shanghai-2026-07.json`。选择自定义地区时由用户填写费率和基数，规则文件不提供假定的地方上下限。所有规则来源、核验时间和缺项详见 [POLICY_SOURCES.md](POLICY_SOURCES.md)。

省市列表来自 2026-10-09 发布的 `@province-city-china` 9.0.0；本地快照在 `src/data/mainland-regions.json`，许可证与来源见 [REGION_DATA_LICENSE.md](src/data/REGION_DATA_LICENSE.md)。更新名单可运行 `npm run update:regions`。区划名单不等于地方缴费政策包。

计算内核使用十进制金额运算，社保各个人分项和个税按人民币分四舍五入；上海普通公积金个人缴存额按元四舍五入。社保按分的处理是本工具的估算假设，实际缴费口径以单位及当地经办记录为准。上海失业保险个人 0.5% 是依据前后官方材料作的连续性推断，需与实际工资条核对。完整算法见 `/methodology/`。

详细模式默认沿用全年相同的用户基数，也可指定 7 月起的新基数。其他月份的基数变更、地方固定附加费、补缴和首次参加工作首月公积金特殊安排尚未自动计算。手动地区当前采用基数乘费率模型，不能把含有这些特殊扣款的结果当作完整工资条。

政策集合在加载与构建时校验整月有效期、重叠和全年缺月；国家税率表检查逐档递增和边界税额连续。已收集但未启用的下一城市资料见 [政策研究记录](docs/POLICY_RESEARCH.md)。

## SEO 与部署

`next.config.ts` 使用 `output: "export"` 和 `trailingSlash: true`；构建后的 `out/` 可由 Nginx 托管。只有在构建前设置真实、可用的 HTTPS `NEXT_PUBLIC_SITE_URL` 时才生成 canonical 和带真实域名的 sitemap 条目。留空或使用 `example.com` 等占位域名时，页面不会输出占位 canonical，robots 禁止索引。正式部署步骤、配置样例与回滚方式见 [DEPLOY.md](DEPLOY.md)。

本仓库当前仅提供代码和部署说明，未部署到生产环境。上线前请逐项完成 [部署前检查清单](PRE_DEPLOY_CHECKLIST.md)，并阅读 [测试报告](TEST_REPORT.md) 与 [版本记录](CHANGELOG.md)。

关键词与内容竞争的定性调研、页面策略及不批量制造同质城市页的原则见 [SEO_STRATEGY.md](SEO_STRATEGY.md)。

## 官方参考

- [国家税务总局：居民工资薪金累计预扣法及税率表](https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html)
- [上海税务：2026 年社保缴费基数](https://shanghai.chinatax.gov.cn/tax/bsfw/nszx/hdfk/202609/t481435.html)
- [上海住房公积金管理委员会：2026 年度基数与比例](https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html)
- [Next.js：静态导出](https://nextjs.org/docs/app/guides/static-exports)
