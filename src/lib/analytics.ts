export const ANALYTICS_SCRIPT = "/analytics/script.js";
export const ANALYTICS_ENDPOINT = "/analytics/api/send";

const TITLES: Record<string, string> = {
  "/": "2026工资到手多少？逐月税后工资估算",
  "/salary-calculator/": "2026累计预扣个税计算器",
  "/shanghai-salary-calculator/": "上海税后工资计算器2026",
  "/methodology/": "工资一样为什么每个月个税不一样",
  "/policy-sources/": "2026上海社保公积金与工资个税政策来源",
  "/privacy/": "隐私说明",
  "/about/": "关于本站",
};
const SOURCE_DOMAINS = ["baidu.com", "bing.com", "google.com", "sogou.com", "so.com", "sm.cn"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getAnalyticsConfig(): { websiteId: string } | null {
  const websiteId = process.env.NEXT_PUBLIC_ANALYTICS_WEBSITE_ID?.trim() ?? "";
  return process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER === "umami" && UUID.test(websiteId) ? { websiteId } : null;
}

export function analyticsPath(pathname: string): string | null {
  const bare = pathname.split(/[?#]/, 1)[0];
  const path = bare === "/" ? "/" : `${bare.replace(/\/$/, "")}/`;
  return Object.hasOwn(TITLES, path) ? path : null;
}

export function safeSourceDomain(referrer: string, hostname: string): string {
  try {
    const source = new URL(referrer);
    if (!["http:", "https:"].includes(source.protocol) || source.username || source.password || source.hostname === hostname) return "";
    const domain = SOURCE_DOMAINS.find((root) => source.hostname === root || source.hostname.endsWith(`.${root}`));
    return domain ? `https://${domain}` : "";
  } catch { return ""; }
}

export type AnalyticsPageView = {
  website: string; url: string; title: string; referrer: string;
  hostname: string; language: string; screen: string;
};
export type UmamiTracker = { track: (payload: AnalyticsPageView) => Promise<void> | void };
declare global { interface Window { umami?: UmamiTracker } }

// v3.4.1 track(object) sends exactly this object, without merging document URL/title.
// Queue snapshots, rather than callbacks reading the route after script loading.
export function createAnalyticsTracker(website: string, context: {
  hostname: string; language: string; screen: string; referrer: string;
}) {
  let previous: string | null = null;
  let firstVisit = true;
  let sdk: UmamiTracker | undefined;
  const pending: AnalyticsPageView[] = [];
  const flush = () => {
    if (!sdk) return;
    for (const payload of pending.splice(0)) {
      try { void Promise.resolve(sdk.track(payload)).catch(() => {}); }
      catch { /* Analytics is never a prerequisite for calculation. */ }
    }
  };
  return {
    visit(pathname: string) {
      const path = analyticsPath(pathname);
      if (path === previous) return;
      previous = path;
      if (!path) return;
      pending.push({ website, url: path, title: TITLES[path], hostname: context.hostname,
        language: context.language, screen: context.screen,
        referrer: firstVisit ? safeSourceDomain(context.referrer, context.hostname) : "" });
      firstVisit = false;
      flush();
    },
    ready(tracker: UmamiTracker | undefined) { sdk = tracker; flush(); },
  };
}
