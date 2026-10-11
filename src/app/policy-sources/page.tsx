import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "政策来源",
  "查看 2026 年工资计算器采用的国家税务规则、全国省市覆盖状态、上海社保和公积金参数及适用日期。",
  "/policy-sources/",
);

export default function PolicySourcesPage() {
  return (
    <main id="main-content" className="content-page">
      <header className="page-intro">
        <p>规则台账 · 最近核对 2026-10-11</p>
        <h1>政策来源</h1>
        <p>
          每条地方规则按月份使用。下表中的“已核实”表示核对过所列官方资料，
          不表示用户所在单位的实际缴费基数或档位已经确认。项目仓库中的 POLICY_SOURCES.md
          另记录了参数版本和更新流程。
        </p>
      </header>

      <section aria-labelledby="national-heading">
        <h2 id="national-heading">全国税务规则</h2>
        <p>
          居民个人由扣缴义务人发放工资薪金，按月使用累计预扣法。累计基本减除费用按每月 5,000 元乘以
          当年在本单位任职月份数，税率表为 3%–45% 七档。适用于本工具的 2026 年计算。
          来源：
          <a href="https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html">
            国家税务总局公告 2018 年第 61 号解读与预扣率表
          </a>；
          <a href="https://www.chinatax.gov.cn/chinatax/n810356/n3255681/c4168237/content.html">
            累计预扣法问答
          </a>。
        </p>
      </section>

      <section aria-labelledby="coverage-heading">
        <h2 id="coverage-heading">全国省市覆盖状态</h2>
        <p>
          地区选择名单覆盖中国大陆 31 个省级地区及 337 个地级或省直管地区选项；
          名称和区划代码来自以<a href="https://dmfw.mca.gov.cn/">国家地名信息库</a>为原始来源的
          <a href="https://github.com/uiwjs/province-city-china">省市区划数据 9.0.0</a>，该版本于 2026-10-09 发布。
          这仅表示可选择地区，不表示当地五险一金政策已完成核实。
        </p>
        <p>
          全国居民工资薪金个税使用同一累计预扣规则。地方五险一金方面，目前只有上海内置按月份核对的参数；
          其他省市必须由用户填写当地个人费率、社保与公积金实际缴费基数，并确认单位适用规则。
          未核实地区不自动应用基数上下限或推荐费率。待逐城取得官方文件并完成测试后，才会增加自动政策版本。
        </p>
      </section>

      <section aria-labelledby="shanghai-heading">
        <h2 id="shanghai-heading">上海 2026 年分期参数</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <caption>普通企业职工的社保与普通住房公积金基数，单位为元/月</caption>
            <thead>
              <tr>
                <th scope="col">参数</th>
                <th scope="col">1–6 月</th>
                <th scope="col">7–12 月</th>
                <th scope="col">状态与来源</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">社保缴费基数</th>
                <td>7,460–37,302</td>
                <td>7,546–37,731</td>
                <td>
                  已核实：
                  <a href="https://rsj.sh.gov.cn/tgsgg_17341/20250918/t0035_1435637.html">2025 年度上海人社公告</a>
                  ；
                  <a href="https://shanghai.chinatax.gov.cn/tax/bsfw/nszx/hdfk/202609/t481435.html">2026 年度上海税务答复</a>
                </td>
              </tr>
              <tr>
                <th scope="row">普通公积金缴存基数</th>
                <td>2,690–37,302</td>
                <td>2,740–37,731</td>
                <td>
                  已核实：
                  <a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228051.html">2025 年度上海公积金通知</a>
                  ；
                  <a href="https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html">2026 年度上海公积金通知</a>
                </td>
              </tr>
              <tr>
                <th scope="row">普通公积金个人比例</th>
                <td>5%、6% 或 7%</td>
                <td>5%、6% 或 7%</td>
                <td>
                  法定档位已核实，实际档位需用户确认；来源为上述两个年度的上海公积金通知。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          上海社保个人费率：养老 8%、医疗 2%。失业 0.5% 由
          <a href="https://www.shanghai.gov.cn/nw17239/20251211/6a00e933de0347acbc172518d6bbab79.html">2025 年末上海市政府页面</a>
          和
          <a href="https://www.shanghai.gov.cn/nw17239/20260913/37398bbb63ad4fffa64e0b9deb0f6afc.html">2026 年 9 月上海市政府页面</a>
          前后相同口径推定全年连续适用；这是连续性推断，不是逐月政策文件核验。
          医疗个人 2% 还见于
          <a href="https://www.shanghai.gov.cn/gwk/search/content/921e047144694b61b6df8ca0c5ef2cfc">2026 年上海医保部门通知</a>。
          工伤保险由单位缴费，个人不计入扣款。
        </p>
      </section>

      <section aria-labelledby="confirm-heading">
        <h2 id="confirm-heading">计算前需要确认</h2>
        <ul>
          <li>社保和公积金申报基数分别是多少；月薪本身不能代替这两个基数。</li>
          <li>所在单位在 1–6 月、7–12 月分别选择的普通公积金个人比例。</li>
          <li>个人专项附加扣除、其他依法扣除与免税收入是否确实适用。</li>
          <li>若使用自定义地区，比例与缴费基数由用户填写；本版不自动应用当地上下限，使用前须按当地规则确认实际基数。</li>
        </ul>
        <p>
          本版未计算补充公积金、特殊减免及雇主缴费。具体公式、舍入假设和适用范围见
          <a href="/methodology/">计算方法</a>。
        </p>
      </section>
    </main>
  );
}
