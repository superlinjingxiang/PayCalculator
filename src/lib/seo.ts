import type { Metadata } from "next";
import { isIP } from "node:net";

const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const reservedDomains = ["example.com", "example.net", "example.org"];

export function getSiteOrigin(): string | null {
  if (!configuredOrigin) return null;
  try {
    const url = new URL(configuredOrigin);
    if (
      url.protocol !== "https:" ||
      Boolean(url.username || url.password) ||
      reservedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)) ||
      [".example", ".test", ".invalid", ".localhost"].some((suffix) => url.hostname.endsWith(suffix)) ||
      !url.hostname.includes(".") ||
      Boolean(isIP(url.hostname.replace(/^\[|\]$/g, ""))) ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function pageMetadata(title: string, description: string, path: string): Metadata {
  const origin = getSiteOrigin();
  return {
    title,
    description,
    ...(origin ? { alternates: { canonical: new URL(path, origin).toString() } } : {}),
  };
}
