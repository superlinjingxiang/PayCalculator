import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import PageViews from "@/components/PageViews";

const path = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.current }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); path.current = "/"; });

describe("PV lifecycle", () => {
  it("deduplicates strict effects and rerenders; sends GET without referrer or credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_PV_ENABLED", "true");
    const send = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", send);
    const view = render(<StrictMode><PageViews /></StrictMode>);
    view.rerender(<StrictMode><PageViews /></StrictMode>);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith("/__pv/home", { method: "GET", cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true });
    path.current = "/methodology/";
    view.rerender(<StrictMode><PageViews /></StrictMode>);
    path.current = "/";
    view.rerender(<StrictMode><PageViews /></StrictMode>);
    expect(send).toHaveBeenCalledTimes(3);
  });
  it("keeps collection disabled by default", () => {
    const send = vi.fn(); vi.stubGlobal("fetch", send);
    render(<PageViews />);
    expect(send).not.toHaveBeenCalled();
  });
  it("ignores a failed request", async () => {
    vi.stubEnv("NEXT_PUBLIC_PV_ENABLED", "true");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<PageViews />);
    await Promise.resolve();
  });
});
