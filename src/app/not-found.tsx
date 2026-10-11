import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="container not-found"><p className="eyebrow">404 / 页面未找到</p><h1>这张工资条暂时找不到。</h1><p>地址可能有误，回到计算器继续查看工资明细。</p><Link className="primary-link" href="/salary-calculator/">返回工资计算器 <span aria-hidden="true">→</span></Link></main>;
}
