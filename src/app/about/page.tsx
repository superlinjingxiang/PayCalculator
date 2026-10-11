import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "关于本站",
  "了解免费工资税后估算工具的用途、适用范围、政策维护方式与免责声明。",
  "/about/",
);

export default function AboutPage() {
  return (
    <main id="main-content" className="content-page">
      <header className="page-intro">
        <p>关于 PayTools</p>
        <h1>关于本站</h1>
        <p>
          本站提供免费的 2026 年中国大陆居民工资薪金税后估算，帮助核对每月个税、个人五险一金和全年汇总。
          不需要登录，填写后的计算在浏览器内完成。
        </p>
      </header>

      <section aria-labelledby="purpose-heading">
        <h2 id="purpose-heading">工具的用途</h2>
        <p>
          可以输入不同月份的工资、实际申报基数和扣除，观察累计预扣个税如何逐月变化。
          结果会列出计算所用的政策时段和假设，便于与单位工资条核对。
          方法和官方出处分别见<a href="/methodology/">计算方法</a>与
          <a href="/policy-sources/">政策来源</a>。
        </p>
      </section>

      <section aria-labelledby="notice-heading">
        <h2 id="notice-heading">重要说明</h2>
        <p>
          本站不是税务机关、社保经办机构或住房公积金管理机构。估算结果依赖用户填写的申报基数、
          单位选择的公积金比例及个人扣除资格，不构成税务、法律或财务意见，
          也不等于单位实际工资条或年度汇算结果。特殊收入和跨单位情形应咨询扣缴义务人或主管部门。
        </p>
      </section>

      <section aria-labelledby="maintenance-heading">
        <h2 id="maintenance-heading">规则维护</h2>
        <p>
          国家税务规则和上海地方参数按来源、生效日期、核实状态分别记录。
          地方政策变化后，应先核对官方资料、更新规则版本并运行测试，再发布新结果。
          全国省市可选；目前上海以外地区只可按用户手动填写的参数估算，不提供未经核实的地方默认值。
          地区名单的第三方来源与许可见<a href="/region-data-license.txt">区划数据许可说明</a>。
        </p>
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">联系</h2>
        <p>网站所有者尚未公布正式联系渠道，正式上线前将补充真实的联系方式。</p>
      </section>
    </main>
  );
}
