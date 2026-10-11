import Link from "next/link";
import SalaryCalculator from "@/components/SalaryCalculator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "2026 工资税后计算器｜全国省市个税与到手工资",
  "选择中国大陆省市，输入税前月薪，按累计预扣法查看 2026 年每月个税、五险一金个人缴费和全年到手估算。上海自动政策已核对，其他城市手动填写地方参数。",
  "/",
);

export default function HomePage() {
  return (
    <main id="main-content">
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> 中国大陆居民工资薪金 · 2026</p>
          <h1>你的工资，<br /><em>到手多少？</em></h1>
          <p className="hero-lead">从税前到税后，逐月拆开计算。看清个人缴费、累计预扣个税和每个月的实发估算。</p>
          <div className="hero-points" aria-label="工具特点">
            <span>12 个月明细</span><span>政策按月匹配</span><span>本地计算</span>
          </div>
        </div>
        <aside className="hero-note" aria-label="计算范围提示">
          <span className="note-index">01 / 03</span>
          <p className="note-kicker">先看口径，再看数字</p>
          <strong>2026 年度<br />累计预扣法</strong>
          <p>仅适用于居民个人、同一扣缴单位、按月发放的工资薪金。地方参数会标明来源与使用条件。</p>
          <Link href="/methodology/">了解计算方法 <span aria-hidden="true">↗</span></Link>
        </aside>
      </section>

      <section className="calculator-section container" aria-labelledby="calculator-heading">
        <div className="section-heading">
          <div><p className="eyebrow">开始计算</p><h2 id="calculator-heading">工资税后估算</h2></div>
          <p>先选仅计算个税，或补充五险一金参数得到更完整的结果。</p>
        </div>
        <SalaryCalculator compactIntro />
      </section>

      <section className="explainer-section container" aria-labelledby="why-heading">
        <div className="section-heading"><div><p className="eyebrow">数字背后</p><h2 id="why-heading">为什么税前工资不等于到手？</h2></div></div>
        <div className="info-grid">
          <article className="info-card"><span className="card-number">01</span><h3>先扣个人缴费</h3><p>养老、医疗、失业保险和住房公积金可能使用不同的缴费基数，不能直接拿工资乘一个总比例。</p></article>
          <article className="info-card"><span className="card-number">02</span><h3>再算累计个税</h3><p>预扣个税按本单位当年累计收入与扣除计算。随着累计应纳税所得额变化，月份之间的税款也会变化。</p></article>
          <article className="info-card"><span className="card-number">03</span><h3>核对政策版本</h3><p>全国省市都可选择。上海已核实的上下半年基数分开处理；其他地区的个人比例和基数由你根据当地政策填写。</p></article>
        </div>
        <div className="source-strip"><span>规则与边界均有说明</span><Link href="/policy-sources/">查看政策来源 <span aria-hidden="true">→</span></Link></div>
        <div className="home-editorial">
          <section aria-labelledby="home-policy-heading">
            <h2 id="home-policy-heading">2026 年采用哪些规则？</h2>
            <p>本工具用于中国大陆居民个人在同一单位取得的按月工资薪金，按<a href="https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html">国家税务总局累计预扣规则和预扣率表</a>计算。地区选择覆盖中国大陆 31 个省级地区和 337 个地级及省直管地区选项；行政区划名单取自<a href="https://github.com/uiwjs/province-city-china">国家地名信息库衍生数据</a>。名单覆盖不等于地方缴费政策已全部核实。规则最近核对：2026-10-11。</p>
            <p>目前上海详细模式按生效月份处理缴费基数：1—6 月社保使用 <a href="https://rsj.sh.gov.cn/tgsgg_17341/20250918/t0035_1435637.html">2025 年度公布的 7,460—37,302 元</a>，7—12 月使用<a href="https://shanghai.chinatax.gov.cn/tax/bsfw/nszx/hdfk/202609/t481435.html">2026 年 7 月起的 7,546—37,731 元</a>；公积金按<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228051.html">上半年规则</a>和<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html">7 月起规则</a>分别处理。其他地区尚未内置经核实的地方参数，需要按当地政策手动填写。</p>
            <p>个人缴费基数和普通公积金 5%、6%、7% 的单位选档需要你确认。仅算个税模式将个人缴费视为零；本版不覆盖年终奖、多单位收入、补发工资、年度汇算或个人特殊减免，结果以工资条及申报记录为准。</p>
          </section>
          <section aria-labelledby="home-faq-heading">
            <h2 id="home-faq-heading">常见问题</h2>
            <h3>为什么月薪相同，每月个税还会变化？</h3>
            <p>每月重新计算当年累计应纳税所得额，再减去已经预扣的税。跨入新税率档时，当月预扣额可能增加。</p>
            <h3>社保和公积金基数能直接填月薪吗？</h3>
            <p>请使用单位申报的对应基数。两项基数可能不同，上海的已核实上下限也按对应月份分别应用。</p>
            <h3>这里的全年实发是年度最终应纳税额吗？</h3>
            <p>不是。它是当前输入条件下各月预扣税和个人缴费后的估算合计，年度汇算不在本版计算范围内。</p>
          </section>
        </div>
      </section>
    </main>
  );
}
