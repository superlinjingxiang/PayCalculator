"use client";

import { useEffect, useState } from "react";
import {
  AD_OPEN_PREFERENCES_EVENT,
  adsEnabled,
} from "@/lib/ads";
import { openAdPreferences, saveAdConsent, useAdConsent, type AdConsentChoice } from "@/lib/ads-consent";

export function AdPreferencesButton() {
  if (!adsEnabled()) return null;
  return <button
    type="button"
    className="ad-preferences-button"
    onClick={openAdPreferences}
  >广告设置</button>;
}

export default function AdConsent() {
  const enabled = adsEnabled();
  const choice = useAdConsent();
  const [opened, setOpened] = useState(false);
  const [decidedThisPage, setDecidedThisPage] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const openPreferences = () => setOpened(true);
    window.addEventListener(AD_OPEN_PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(AD_OPEN_PREFERENCES_EVENT, openPreferences);
  }, [enabled]);

  if (!enabled || (!opened && (decidedThisPage || choice !== "unset"))) return null;

  const decide = (nextChoice: AdConsentChoice) => {
    saveAdConsent(nextChoice);
    setDecidedThisPage(true);
    setOpened(false);
  };

  return <aside className="ad-consent" aria-label="广告隐私选择">
    <div className="ad-consent-copy">
      <strong>广告设置</strong>
      <p>本站可在计算结果或正文后展示广告。只有同意后才会加载广告；本站不主动向广告请求传入工资字段。拒绝不影响计算和下载。</p>
      <a href="/privacy/">查看隐私说明</a>
    </div>
    <div className="ad-consent-actions">
      <button type="button" className="ad-consent-secondary" onClick={() => decide("rejected")}>仅用必要功能</button>
      <button type="button" className="ad-consent-primary" onClick={() => decide("accepted")}>同意展示广告</button>
    </div>
  </aside>;
}
