export type AdPlacement = "result-footer" | "content-footer";

export const AD_CONSENT_STORAGE_KEY = "paytools-ad-consent-v1";
export const AD_CONSENT_EVENT = "paytools:ad-consent";
export const AD_OPEN_PREFERENCES_EVENT = "paytools:open-ad-preferences";

export interface AdSlotConfig {
  enabled: boolean;
  provider: string;
  slotId: string;
}

export function adsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
}

export function getAdSlotConfig(placement: AdPlacement): AdSlotConfig {
  return {
    enabled: adsEnabled(),
    provider: process.env.NEXT_PUBLIC_AD_PROVIDER?.trim() ?? "",
    slotId: (placement === "result-footer"
      ? process.env.NEXT_PUBLIC_AD_RESULT_SLOT
      : process.env.NEXT_PUBLIC_AD_CONTENT_SLOT)?.trim() ?? "",
  };
}
