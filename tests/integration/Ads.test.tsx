import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AdConsent, { AdPreferencesButton } from "@/components/AdConsent";
import AdSlot from "@/components/AdSlot";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  fireEvent(window, new StorageEvent("storage", { key: null }));
  cleanup();
  vi.unstubAllEnvs();
});

describe("info-flow ad preparation", () => {
  it.each(["getItem", "setItem"] as const)("applies consent and withdrawal when storage %s throws", (method) => {
    vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_AD_PROVIDER", "approved-provider");
    vi.stubEnv("NEXT_PUBLIC_AD_RESULT_SLOT", "slot");
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    render(<><AdConsent /><AdPreferencesButton /><AdSlot placement="result-footer" /></>);
    fireEvent.click(screen.getByRole("button", { name: "同意展示广告" }));
    expect(screen.getByRole("complementary", { name: "广告" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "广告设置" }));
    fireEvent.click(screen.getByRole("button", { name: "仅用必要功能" }));
    expect(screen.queryByRole("complementary", { name: "广告" })).not.toBeInTheDocument();
  });

  it("synchronizes a rejection from another tab", () => {
    vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_AD_PROVIDER", "approved-provider");
    vi.stubEnv("NEXT_PUBLIC_AD_RESULT_SLOT", "slot");
    render(<><AdConsent /><AdSlot placement="result-footer" /></>);
    fireEvent.click(screen.getByRole("button", { name: "同意展示广告" }));
    fireEvent(window, new StorageEvent("storage", { key: "paytools-ad-consent-v1", newValue: "rejected" }));
    expect(screen.queryByRole("complementary", { name: "广告" })).not.toBeInTheDocument();
  });
  it("renders no ad UI while ads are disabled", () => {
    render(<><AdConsent /><AdPreferencesButton /><AdSlot placement="result-footer" /></>);

    expect(screen.queryByRole("complementary", { name: "广告隐私选择" })).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "广告" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "广告设置" })).not.toBeInTheDocument();
  });

  it("loads the configured ad container only after explicit consent", () => {
    vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_AD_PROVIDER", "approved-provider");
    vi.stubEnv("NEXT_PUBLIC_AD_RESULT_SLOT", "result-slot-1");

    render(<><AdConsent /><AdSlot placement="result-footer" /></>);

    expect(screen.getByRole("complementary", { name: "广告隐私选择" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "广告" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "同意展示广告" }));

    const ad = screen.getByRole("complementary", { name: "广告" });
    expect(ad).toBeInTheDocument();
    expect(ad.querySelector("[data-ad-provider='approved-provider']")).toHaveAttribute("data-ad-slot", "result-slot-1");
    expect(window.localStorage.getItem("paytools-ad-consent-v1")).toBe("accepted");
  });

  it("keeps ads off after a necessary-only choice", () => {
    vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_AD_PROVIDER", "approved-provider");
    vi.stubEnv("NEXT_PUBLIC_AD_CONTENT_SLOT", "content-slot-1");

    render(<><AdConsent /><AdSlot placement="content-footer" /></>);
    fireEvent.click(screen.getByRole("button", { name: "仅用必要功能" }));

    expect(screen.queryByRole("complementary", { name: "广告" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("paytools-ad-consent-v1")).toBe("rejected");
  });

  it("lets visitors reopen the consent choice from the footer", () => {
    vi.stubEnv("NEXT_PUBLIC_ADS_ENABLED", "true");
    window.localStorage.setItem("paytools-ad-consent-v1", "rejected");

    render(<><AdConsent /><AdPreferencesButton /></>);
    expect(screen.queryByRole("complementary", { name: "广告隐私选择" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "广告设置" }));
    expect(screen.getByRole("complementary", { name: "广告隐私选择" })).toBeInTheDocument();
  });
});
