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
- 信息流广告开关、同意门禁和固定广告位已预留；真实广告 SDK 默认关闭，未配置平台时不加载第三方脚本。

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
| `npm run test:pv` | Python无依赖日志/报告边界回归 |
| `npm run test:e2e` | 先构建，再由 Playwright 使用本机 Google Chrome 检验导出的静态文件 |
| `npm run build` | 构建静态站点到 `out/` |

CI 执行 lint、typecheck、test 和 build；浏览器测试需先执行 `npm run build`，再在安装 Chrome 的环境中运行。`next build` 不自动执行 ESLint，应分别运行上述命令。

## 页面

| 路径 | 内容 |
| --- | --- |
| `/` | 工具入口及说明 |
| `/salary-calculator/` | 详细工资计算器 |
| `/shanghai-salary-calculator/` | 上海2026税后工资与7月基数调整 |
| `/methodology/` | 公式、示例和边界 |
| `/policy-sources/` | 官方来源、适用日期与状态 |
| `/privacy/` | 隐私说明 |
| `/about/` | 站点用途与免责声明 |
| `/404.html` | 静态错误页 |

## 规则和精度

规则文件位于 `src/config/policies/`，按地区和生效期独立保存。税率和基本减除费用见 `cn-2026-national.json`；上海 1–6 月取 `shanghai-2025-07.json`，7–12 月取 `shanghai-2026-07.json`。选择自定义地区时由用户填写费率和基数，规则文件不提供假定的地方上下限。所有规则来源、核验时间和缺项详见 [POLICY_SOURCES.md](POLICY_SOURCES.md)。

省市列表来自 2026-10-09 发布的 `@province-city-china` 9.0.0；本地快照在 `src/data/mainland-regions.json`，许可证与来源见 [REGION_DATA_LICENSE.md](src/data/REGION_DATA_LICENSE.md)。更新名单可运行 `npm run update:regions`。区划名单不等于地方缴费政策包。

计算内核使用十进制金额运算，社保各个人分项和个税按人民币分四舍五入；上海普通公积金个人缴存额按元四舍五入。社保按分的处理是本工具的估算假设，实际缴费口径以单位及当地经办记录为准。上海失业保险个人 0.5% 是依据前后官方材料作的连续性推断，需与实际工资条核对。完整算法见 `/methodology/`。

上海公积金7%与工资联动基数是可修改的估算预设，不代表单位申报值；请核对工资条，公积金可改为5%、6%或7%。切换未核实城市会清空所有个人费率并要求填写，返回上海恢复上海预设。详细模式默认沿用全年相同基数，也可指定7月起的新基数。其他月份的变更、地方固定附加费、补缴和首次工作首月公积金特殊安排尚未自动计算。

政策集合在加载与构建时校验整月有效期、重叠和全年缺月；国家税率表检查逐档递增和边界税额连续。已收集但未启用的下一城市资料见 [政策研究记录](docs/POLICY_RESEARCH.md)。

## SEO 与部署

成熟统计使用自托管Umami **3.4.1**，开源选型依据见[调研](./_bmad-output/growth-2026-10-27/analytics-selection/opensource.md)。前端默认关闭；仅当 `NEXT_PUBLIC_ANALYTICS_PROVIDER=umami` 且 `NEXT_PUBLIC_ANALYTICS_WEBSITE_ID` 为有效网站UUID时，RootLayout加载一次固定同源脚本 `/analytics/script.js`，上报固定 `/analytics/api/send`。UUID是公开标识，不能填后台密码，也不能配置任意脚本地址。切换验收后使用 `NEXT_PUBLIC_PV_ENABLED=false`，旧21次测试信号及历史保留、不倒灌、不与Umami合计。

锁版本接口采用 `data-auto-track=false`、`data-auto-pageview=false` 和 `umami.track(object)`。Next pathname负责首屏、导航、后退/前进和刷新，每次快照包含白名单路径、静态标题、屏幕、语言、主机及允许的搜索来源根域名，不包含查询、锚点、工资或自定义用户ID。不开启点击、回放或性能事件；脚本延迟保留访问当时的路径，失败不影响本地计算。请求明确 `data-fetch-credentials=omit`；同源脚本GET可能携带浏览器Cookie，代理必须剥离后转发。隐私页写明匿名会话可能涉及短暂IP处理，不能承诺完全不处理IP。

统计后台、数据库、私有凭证、资源上限、备份及真实API验收由服务器部署单独交付。只公开两个精确采集路由，后台仅loopback，通过阿里云官方端口转发访问；Session Manager未开启时不能声称用户已经能打开后台，不新增公网端口或云密钥。现有域名/备案/真实广告待办不因统计接入而完成。

`next.config.ts` 使用 `output: "export"` 和 `trailingSlash: true`；构建后的 `out/` 可由 Nginx 托管。只有在构建前设置真实、可用的 HTTPS `NEXT_PUBLIC_SITE_URL` 时才生成 canonical 和带真实域名的 sitemap 条目。留空或使用 `example.com` 等占位域名时，页面不会输出占位 canonical，robots 禁止索引。正式部署步骤、配置样例与回滚方式见 [DEPLOY.md](DEPLOY.md)。

本仓库当前仅提供代码和部署说明，未部署到生产环境。上线前请逐项完成 [部署前检查清单](PRE_DEPLOY_CHECKLIST.md)，并阅读 [测试报告](TEST_REPORT.md) 与 [版本记录](CHANGELOG.md)。

关键词与内容竞争的定性调研、页面策略及不批量制造同质城市页的原则见 [SEO_STRATEGY.md](SEO_STRATEGY.md)。
信息流广告的当前接入状态、数据边界和平台上线清单见 [ADS_READINESS.md](docs/ADS_READINESS.md)。

第一方PV仅记录固定页面与时间，启用需要构建前设置 `NEXT_PUBLIC_PV_ENABLED=true` 并安装专用Nginx配置。原始日志保留30天，页面/日期汇总由站长通过现有云助手取回HTML/JSON，见 [DEPLOY.md](DEPLOY.md)。没有UV或真人数统计；本机计数不会冒充全站流量。报告在忽略的 `release/pv-reports/`，不进入 `out/` 或 `public/`。本机报告渲染及服务器汇总均使用Python3.6+，无第三方依赖；独立测试：`python -m unittest discover -s tests -p test_pv_report.py`。

## 官方参考

- [国家税务总局：居民工资薪金累计预扣法及税率表](https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html)
- [上海税务：2026 年社保缴费基数](https://shanghai.chinatax.gov.cn/tax/bsfw/nszx/hdfk/202609/t481435.html)
- [上海住房公积金管理委员会：2026 年度基数与比例](https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html)
- [Next.js：静态导出](https://nextjs.org/docs/app/guides/static-exports)
