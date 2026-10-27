import Link from "next/link";
import SalaryCalculator from "@/components/SalaryCalculator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "上海税后工资计算器2026｜五险一金与7月调基",
  "输入月薪与个人缴费参数，按2026年上海上下半年社保、公积金规则逐月估算税后工资和累计预扣个税，查看12个月明细及政策依据。",
  "/shanghai-salary-calculator/",
);

export default function ShanghaiCalculatorPage() {
  return <main id="main-content" className="container tool-page">
    <header className="page-intro">
      <p className="eyebrow">上海 / 2026</p>
      <h1>上海税后工资计算器2026</h1>
      <p>默认选择上海，输入工资即可查看12个月到手估算。公积金7%和工资联动基数为可修改的估算预设，请核对单位申报值。</p>
    </header>
    <SalaryCalculator compactIntro />
    <div className="home-editorial">
      <section aria-labelledby="july-change">
        <h2 id="july-change">上海7月社保基数调整，到手工资会变吗？</h2>
        <p>工资不变时，若申报基数触及新的下限或上限，个人缴费也可能变化。工具按每个月的生效规则计算，不把下半年规则套用到全年。</p>
        <ul>
          <li>1—6月社保基数区间为7,460—37,302元，参照<a href="https://rsj.sh.gov.cn/tgsgg_17341/20250918/t0035_1435637.html">上海人社2025年度公告</a>。</li>
          <li>7—12月社保基数区间为7,546—37,731元，依据<a href="https://shanghai.chinatax.gov.cn/tax/bsfw/nszx/hdfk/202609/t481435.html">上海税务2026年7月起基数答复</a>。</li>
          <li>普通公积金基数：上半年2,690—37,302元；7月起2,740—37,731元。分别见<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228051.html">2025年度通知</a>与<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html">2026年度通知</a>，个人比例为5%、6%或7%，以单位选档为准。</li>
        </ul>
        <p>例如社保输入基数为7,000元，6月有效基数为7,460元，7月为7,546元。若单位同时调高申报基数，可启用“7月起缴费基数调整”，独立填写两项新基数。</p>
      </section>
      <section aria-labelledby="shanghai-faq">
        <h2 id="shanghai-faq">上海工资估算常见问题</h2>
        <h3>月薪就是社保和公积金基数吗？</h3>
        <p>两项通常按相应年度口径核定，可能与当前月薪不同。本页起始按工资联动仅为估算便利，可改为单位申报值；上海上下限仍逐月应用。</p>
        <h3>为什么预填公积金7%？</h3>
        <p>这是可修改预设，不代表所有单位都用7%。请按工资条调整为5%、6%或7%；社保个人比例采用养老8%、医疗2%、失业0.5%，失业比例的连续性推断和舍入边界见政策来源。</p>
        <h3>选择上海区县会改变费率吗？</h3>
        <p>不会。区县只帮助识别地区，不视为独立费率政策；工具使用同一组已记录的上海分期规则。</p>
        <p>规则核对：2026-10-11。特殊缴费、补缴、年终奖、多单位收入及年度汇算不在本版范围内。请以工资条和税务申报为准。</p>
        <p><Link href="/policy-sources/">核对政策来源</Link> · <Link href="/methodology/">工资一样为什么每个月个税不一样</Link> · <Link href="/salary-calculator/">全国累计预扣个税工具</Link></p>
      </section>
    </div>
  </main>;
}
