"use client";

import { useSyncExternalStore } from "react";
import {
  AD_CONSENT_EVENT,
  AD_CONSENT_STORAGE_KEY,
  AD_OPEN_PREFERENCES_EVENT,
} from "./ads";

export type AdConsentChoice = "accepted" | "rejected";
export type AdConsentSnapshot = AdConsentChoice | "unset" | "pending";
let pageChoice: AdConsentChoice | undefined;

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === AD_CONSENT_STORAGE_KEY || event.key === null) {
      pageChoice = event.newValue === "accepted" || event.newValue === "rejected" ? event.newValue : undefined;
      onChange();
    }
  };
  window.addEventListener(AD_CONSENT_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(AD_CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): AdConsentSnapshot {
  if (pageChoice) return pageChoice;
  try {
    const value = window.localStorage.getItem(AD_CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "rejected" ? value : "unset";
  } catch {
    return "unset";
  }
}

function getServerSnapshot(): AdConsentSnapshot {
  return "pending";
}

export function useAdConsent(): AdConsentSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function saveAdConsent(choice: AdConsentChoice): void {
  pageChoice = choice;
  try {
    window.localStorage.setItem(AD_CONSENT_STORAGE_KEY, choice);
  } catch {
    // The custom event still applies this choice for the current page.
  }
  window.dispatchEvent(new CustomEvent(AD_CONSENT_EVENT, { detail: { choice } }));
}

export function openAdPreferences(): void {
  window.dispatchEvent(new Event(AD_OPEN_PREFERENCES_EVENT));
}
