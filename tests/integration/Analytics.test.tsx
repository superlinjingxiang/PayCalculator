import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Analytics from "@/components/Analytics";
const state = vi.hoisted(() => ({ path: "/", props: {} as Record<string, unknown> }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("next/script", () => ({ default: (props: Record<string, unknown>) => { state.props = props; return null; } }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); delete window.umami; state.path = "/"; state.props = {}; });
describe("Analytics component", () => {
  it("does not load a script without configuration", () => {
    render(<Analytics />);
    expect(state.props).toEqual({});
  });
  it("loads the fixed script once, disables automatic collection and flushes each captured route", () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_PROVIDER", "umami");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_WEBSITE_ID", "a45801cb-c783-403d-972f-c95f412d4a77");
    const view = render(<StrictMode><Analytics /></StrictMode>);
    expect(state.props).toMatchObject({ src: "/analytics/script.js", "data-host-url": "/analytics", "data-auto-track": "false", "data-auto-pageview": "false", "data-fetch-credentials": "omit", referrerPolicy: "no-referrer" });
    state.path = "/methodology/";
    view.rerender(<StrictMode><Analytics /></StrictMode>);
    const track = vi.fn(); window.umami = { track };
    (state.props.onReady as () => void)(); (state.props.onReady as () => void)();
    expect(track.mock.calls.map(([payload]) => payload.url)).toEqual(["/", "/methodology/"]);
  });
});
