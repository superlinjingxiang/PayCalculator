"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_SCRIPT, createAnalyticsTracker, getAnalyticsConfig } from "@/lib/analytics";

export default function Analytics() {
  const pathname = usePathname();
  const websiteId = getAnalyticsConfig()?.websiteId;
  const tracker = useRef<ReturnType<typeof createAnalyticsTracker> | null>(null);
  const ready = useRef(false);
  useEffect(() => {
    if (!websiteId) return;
    tracker.current ??= createAnalyticsTracker(websiteId, {
      hostname: window.location.hostname, language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`, referrer: document.referrer,
    });
    tracker.current.visit(pathname);
    if (ready.current) tracker.current.ready(window.umami);
  }, [pathname, websiteId]);
  if (!websiteId) return null;
  return <Script id="paytools-umami" src={ANALYTICS_SCRIPT} strategy="afterInteractive"
    data-website-id={websiteId} data-host-url="/analytics" data-auto-track="false" data-auto-pageview="false"
    data-exclude-search="true" data-exclude-hash="true" data-fetch-credentials="omit"
    referrerPolicy="no-referrer"
    onReady={() => { ready.current = true; tracker.current?.ready(window.umami); }}
    onError={() => { /* A blocked tracker must not interrupt the calculator. */ }}
  />;
}
