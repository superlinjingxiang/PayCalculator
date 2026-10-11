import type { Metadata } from "next";
import Link from "next/link";
import { getSiteOrigin } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "工资计算器 · PayTools",
    template: "%s · PayTools",
  },
  description: "按累计预扣法估算中国大陆居民个人 2026 年工资个税与到手金额，逐月查看五险一金和政策依据。",
  applicationName: "PayTools",
  icons: { icon: "/favicon.svg" },
  robots: { index: Boolean(getSiteOrigin()), follow: Boolean(getSiteOrigin()) },
};

const navItems = [
  { href: "/salary-calculator/", label: "工资计算器" },
  { href: "/methodology/", label: "计算依据" },
  { href: "/policy-sources/", label: "政策来源" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">跳到主要内容</a>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="brand" href="/" aria-label="PayTools 工资计算器首页">
              <span className="brand-mark" aria-hidden="true">¥</span>
              <span>PayTools<span className="brand-subtitle"> / 工资计算器</span></span>
            </Link>
            <nav className="nav-links" aria-label="主导航">
              {navItems.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="container footer-grid">
            <div>
              <strong>PayTools</strong>
              <p>把每笔扣除说清楚。所有输入仅在当前浏览器页面内计算。</p>
            </div>
            <nav aria-label="页脚导航">
              <Link href="/about/">关于本站</Link>
              <Link href="/privacy/">隐私说明</Link>
              <Link href="/methodology/">计算方法</Link>
              <Link href="/policy-sources/">政策来源</Link>
            </nav>
          </div>
          <div className="container footer-bottom">估算结果不等于单位实际工资条或个人所得税年度汇算。规则资料核对时间：2026-10-11。</div>
        </footer>
      </body>
    </html>
  );
}
