import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import SalaryCalculator from "@/components/SalaryCalculator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "2026累计预扣个税计算器｜12个月税后工资明细",
  "选择中国大陆省市，按累计预扣法计算 2026 年逐月个税和税后工资。上海提供已核实分期参数，其他城市手动填写地方缴费参数。",
  "/salary-calculator/",
);

export default function CalculatorPage() {
  return (
    <main id="main-content" className="container tool-page">
      <header className="page-intro">
        <p className="eyebrow">工资计算器 / 2026</p>
        <h1>2026累计预扣个税计算器</h1>
        <p>选择全国省市，输入本单位发放的工资和扣除信息，查看累计预扣个税、个人缴费与每月到手估算。上海提供已核对的地方分期规则，其余地区需按当地政策填写基数和比例。计算在浏览器内完成。</p>
      </header>
      <SalaryCalculator />
      <section className="tool-explainer" aria-labelledby="tool-how-heading">
        <div className="section-heading"><div><p className="eyebrow">计算说明</p><h2 id="tool-how-heading">读懂结果前，先了解这些假设</h2></div></div>
        <div className="info-grid">
          <article className="info-card"><h3>适用谁？</h3><p>本版只估算中国大陆居民个人、同一单位、单一工资薪金来源的按月工资。年终奖、补发、多单位和年度汇算未计入。</p></article>
          <article className="info-card"><h3>为什么年底可能扣得更多？</h3><p>当累计应纳税所得额跨入下一档时，当期预扣税会增加；每个月按累计税额减去已预扣税额计算。</p></article>
          <article className="info-card"><h3>“仅算个税”代表什么？</h3><p>此模式把五险一金个人缴费按零处理，仅供看累计个税变化，显示的余额不等于完整实际到手工资。</p></article>
        </div>
        <div className="home-editorial">
          <section aria-labelledby="tool-source-heading">
            <h2 id="tool-source-heading">规则、日期与来源</h2>
            <p>2026 年居民工资薪金个税采用<a href="https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html">国家税务总局累计预扣公式及七级预扣率表</a>，每个任职月份累计基本减除费用 5,000 元。工具规则最近核对：2026-10-11。</p>
            <p>上海详细模式的社保基数，1—6 月参照<a href="https://rsj.sh.gov.cn/tgsgg_17341/20250918/t0035_1435637.html">2025 年度上海人社公告</a>，7—12 月按<a href="https://shanghai.chinatax.gov.cn/tax/bsfw/nszx/hdfk/202609/t481435.html">2026 年 7 月起上海税务答复</a>；普通公积金分别参照<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228051.html">上半年</a>和<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html">7 月起</a>的通知。全国其他地区目前是手动参数模式，未自动验证地方费率或基数上下限。</p>
            <p>本工具不处理年终奖、多单位收入、补发工资、特殊减免和年度汇算。单位在 7 月调整缴费基数时，可启用“7 月起缴费基数调整”填写新值；其他月份的变更、地方固定附加费和特殊缴费安排目前不自动处理。</p>
          </section>
          <section aria-labelledby="tool-faq-heading">
            <h2 id="tool-faq-heading">常见问题</h2>
            <h3>年中入职，为什么不能按全年扣除额计算？</h3>
            <p>累计预扣中的基本减除费用按本单位当年任职月份累计，工具会把入职前月份作为本单位无工资处理。</p>
            <h3>选择外地城市后为何要手动填写比例？</h3>
            <p>不同城市及单位的缴费基数和公积金比例会变化。未核实当地官方 2026 年规则前，工具不提供默认费率，避免产生貌似精确的结果。</p>
            <h3>上海 7 月前后结果可能不同吗？</h3>
            <p>上海已公布的社保和普通公积金基数上下限在 7 月切换；相同的输入基数可能适用不同上限或下限，进而改变个人缴费。</p>
          </section>
        </div>
        <p className="inline-sources">查看 <Link href="/shanghai-salary-calculator/">上海税后工资与7月调基</Link>、<Link href="/methodology/">公式与示例</Link>、<Link href="/policy-sources/">适用政策和原始链接</Link>。请以实际工资条和税务申报为准。</p>
      </section>
      <AdSlot placement="content-footer" />
    </main>
  );
}
