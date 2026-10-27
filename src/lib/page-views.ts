// A fixed endpoint per public page: no query, hash, salary, referrer or identifier.
export const PAGE_VIEW_ENDPOINTS: Record<string, string> = {
  "/": "/__pv/home",
  "/salary-calculator/": "/__pv/calculator",
  "/shanghai-salary-calculator/": "/__pv/shanghai",
  "/methodology/": "/__pv/methodology",
  "/policy-sources/": "/__pv/policies",
  "/privacy/": "/__pv/privacy",
  "/about/": "/__pv/about",
};

export function pageViewEndpoint(pathname: string): string | null {
  const path = pathname.split(/[?#]/, 1)[0];
  const canonical = path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;
  return Object.hasOwn(PAGE_VIEW_ENDPOINTS, canonical) ? PAGE_VIEW_ENDPOINTS[canonical] : null;
}

export function createPageViewTracker(send: (endpoint: string) => void) {
  let previous: string | null = null;
  return (pathname: string) => {
    const endpoint = pageViewEndpoint(pathname);
    if (endpoint === previous) return;
    previous = endpoint;
    if (endpoint) send(endpoint);
  };
}
