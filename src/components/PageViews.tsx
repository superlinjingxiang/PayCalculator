"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createPageViewTracker } from "@/lib/page-views";

export default function PageViews() {
  const pathname = usePathname();
  const tracker = useRef<ReturnType<typeof createPageViewTracker> | null>(null);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PV_ENABLED !== "true") return;
    tracker.current ??= createPageViewTracker((endpoint) => {
      void fetch(endpoint, {
        method: "GET", cache: "no-store", credentials: "omit",
        referrerPolicy: "no-referrer", keepalive: true,
      }).catch(() => { /* Collection must never block the calculator. */ });
    });
    tracker.current(pathname);
  }, [pathname]);
  return null;
}
