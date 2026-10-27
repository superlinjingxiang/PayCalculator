"use client";

import {
  getAdSlotConfig,
  type AdPlacement,
} from "@/lib/ads";
import { useAdConsent } from "@/lib/ads-consent";

export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const config = getAdSlotConfig(placement);
  const choice = useAdConsent();
  const consented = choice === "accepted";

  if (!config.enabled || !config.provider || !config.slotId || !consented) return null;

  return <aside className="ad-slot" aria-label="广告">
    <span className="ad-slot-label">广告</span>
    <div
      id={`paytools-ad-${placement}`}
      className="ad-slot-frame"
      data-ad-provider={config.provider}
      data-ad-slot={config.slotId}
      data-ad-format="fluid"
    />
  </aside>;
}
