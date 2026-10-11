import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "计算方法",
  "了解工资税后估算中的累计预扣个税、上海五险一金基数与逐月计算假设。",
  "/methodology/",
);

export default function MethodologyPage() {
  return (
    <main id="main-content" className="content-page">
      <header className="page-intro">
        <p>计算说明 · 2026 年居民工资薪金</p>
        <h1>计算方法</h1>
        <p>
          本工具按月计算个人缴费，再按累计预扣法估算个税。结果以填写的基数、比例和扣除为前提，
          不能替代单位工资条、扣缴申报或个人所得税年度汇算。
        </p>
      </header>

      <section aria-labelledby="scope-heading">
        <h2 id="scope-heading">适用范围</h2>
        <p>
          适用于 2026 年在中国大陆由同一单位按月发放工资的居民个人，假设入职前在本单位没有当年工资。
          从选择的起始月份起，按本单位当年的任职月份累计基本减除费用。非居民、多单位收入、劳务报酬、
          补发工资、历史补扣、税额减免、特殊优惠与年度汇算均不在本版计算范围内。
        </p>
      </section>

      <section aria-labelledby="contributions-heading">
        <h2 id="contributions-heading">先算个人五险一金</h2>
        <p>
          税前工资、社保缴费基数和住房公积金缴存基数是不同的输入。对已核实适用上下限的月份，
          先将用户填写的基数限制在该月的区间内，再分别乘以养老、医疗、失业和住房公积金个人比例。
          工伤保险不计为职工个人扣款。上海的上下限以 7 月为界逐月切换，不能用下半年的数据计算 1–6 月。
        </p>
        <p>
          上海普通住房公积金的个人比例可为 5%、6% 或 7%，具体档位由单位确定，使用前需由用户确认。
          工具不把 7% 当成所有人的默认比例，也不自动把月工资当成申报基数。
          <a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228051.html">上海公积金 2025 年度通知</a>
          ；<a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html">2026 年度通知</a>。
        </p>
        <p>
          金额按人民币计算。社保各个人分项乘算后按分四舍五入；上海住房公积金个人缴存额按元四舍五入。
          前者是本工具为估算采用的舍入假设，实际单位缴费明细可能采用不同的处理口径。
          住房公积金按元计的依据见
          <a href="https://www.shzfgjj.cn/html/newxxgk/zcjd/228183.html">上海公积金基数调整问答</a>。
        </p>
      </section>

      <section aria-labelledby="tax-heading">
        <p>如单位在 7 月调整申报基数，可在详细模式启用“7 月起缴费基数调整”，填写下半年社保和公积金基数。未启用时，两项原基数用于全年任职月份。其他月份的调基、固定附加费和新参加工作首月暂不缴存公积金等特殊情况，目前不自动计算。</p>
        <h2 id="tax-heading">再算累计预扣个税</h2>
        <ol>
          <li>累计收入减去累计免税收入。</li>
          <li>减去 5,000 元 × 截至本月在本单位任职的月份数。</li>
          <li>减去累计个人社保和公积金、专项附加扣除及其他依法可扣除额；余额最低按 0 元计。</li>
          <li>对累计应纳税所得额应用居民工资薪金累计预扣率和速算扣除数，得到累计目标税额。</li>
          <li>本月预扣税额为累计目标税额减去之前各月已预扣税额，最低按 0 元计。</li>
          <li>本月估算实发 = 本月税前工资 − 本月个人缴费 − 本月预扣个税。</li>
        </ol>
        <p>
          税率随年内累计应纳税所得额提高而可能跨档，所以即使每月税前工资相同，后续月份的预扣税也可能增加。
          累计目标税额低于已扣税额时，本工具不会生成负税额或自动退税；应以实际扣缴更正及年度汇算为准。
          计算公式和税率表见
          <a href="https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html">
            国家税务总局《个人所得税扣缴申报管理办法》解读
          </a>。
        </p>
      </section>

      <section aria-labelledby="example-heading">
        <h2 id="example-heading">一个纯税务示例</h2>
        <p>
          假设全年在同一单位工作，每月工资 8,000 元，个人缴费、专项附加扣除及其他扣除均为 0：
          年累计收入为 96,000 元，累计基本减除费用为 60,000 元，应纳税所得额为 36,000 元，
          对应 3% 累计预扣率，全年预扣税额为 1,080 元。此例只演示税务算法，
          不表示实际工作中可以忽略法定个人社保和公积金。
        </p>
      </section>

      <section aria-labelledby="limitations-heading">
        <h2 id="limitations-heading">结果的边界</h2>
        <p>
          “仅算个税”模式的余额尚未扣除五险一金，不能当作实际到手工资。
          自定义参数由用户提供，计算器无法验证其是否符合当地政策。
          单位的申报基数、专项附加扣除资格、补缴和调账也可能使实际工资条与估算不同。
        </p>
        <p>
          查看<a href="/policy-sources/">政策来源与适用日期</a>，或返回
          <a href="/salary-calculator/">工资计算器</a>按实际工资条参数重新计算。
        </p>
      </section>
    </main>
  );
}
