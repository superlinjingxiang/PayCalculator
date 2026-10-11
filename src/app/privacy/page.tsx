import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "隐私说明",
  "工资计算在浏览器内完成，了解输入数据、网站访问日志和未来第三方服务的处理方式。",
  "/privacy/",
);

export default function PrivacyPage() {
  return (
    <main id="main-content" className="content-page">
      <header className="page-intro">
        <p>最后更新：2026-10-11</p>
        <h1>隐私说明</h1>
        <p>
          当前版本是静态工资估算工具。填写的工资、缴费基数、比例和扣除仅供当前浏览器中的计算使用，
          本站不设置账户，也不提供向服务器提交这些输入的功能。
        </p>
      </header>

      <section aria-labelledby="input-heading">
        <h2 id="input-heading">工资输入如何处理</h2>
        <p>
          计算在浏览器本地执行。本站不会主动把表单金额发送到服务器，不会将其写入页面网址，
          也不以账号或云端档案保存结果。关闭或刷新页面后，如需复核应重新输入；
          请勿把浏览器截图或导出的结果交给不可信第三方。
        </p>
        <p>点击“下载 CSV 明细”时，浏览器会在本地生成含工资金额、地区、规则与计算假设的文件；本站不接收该文件。下载后请自行妥善保管，注意共享设备上的下载目录和文件分享权限。</p>
      </section>

      <section aria-labelledby="logs-heading">
        <h2 id="logs-heading">网站访问记录</h2>
        <p>
          正式部署时，静态网站托管服务可能按运维设置记录 IP 地址、访问时间、请求路径及浏览器信息，
          用于安全排障和运行维护。工资表单内容不应写入访问网址或服务器日志。
          网站所有者应在上线前确定日志保存期限、访问权限及删除方式，并据实更新本说明。
        </p>
      </section>

      <section aria-labelledby="third-party-heading">
        <h2 id="third-party-heading">统计、广告与第三方服务</h2>
        <p>
          当前版本没有启用真实广告 SDK，也没有为工资金额配置统计事件。若未来接入统计、广告、
          错误上报或其他第三方服务，网站所有者应先披露服务商、数据类型、用途和适用的 Cookie
          或同意机制，再更新本页。有关广告展示也会与计算按钮清楚区分。
        </p>
      </section>

      <section aria-labelledby="contact-heading">
        <h2 id="contact-heading">联系与更新</h2>
        <p>
          项目所有者尚未公布正式联系方式；上线前应补充真实的联系渠道。
          隐私处理方式发生变化时，本页的更新日期与说明应同步修订。
        </p>
      </section>
    </main>
  );
}
