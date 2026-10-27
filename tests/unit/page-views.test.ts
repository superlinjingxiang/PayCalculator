import { describe, expect, it, vi } from "vitest";
import { createPageViewTracker, pageViewEndpoint } from "@/lib/page-views";

describe("anonymous page view boundary", () => {
  it("only maps fixed pages and discards query/hash without exposing amounts", () => {
    expect(pageViewEndpoint("/salary-calculator/?salary=99999#result")).toBe("/__pv/calculator");
    for (const path of ["/_next/static/a.js", "/salary-calculator/99999", "/unknown/", "//", "/__pv/home"])
      expect(pageViewEndpoint(path)).toBeNull();
  });
  it("does not count rerenders or query changes; counts navigation away and back", () => {
    const send = vi.fn();
    const track = createPageViewTracker(send);
    track("/"); track("/"); track("/?salary=8000");
    track("/methodology/"); track("/methodology/#start-month"); track("/");
    expect(send.mock.calls).toEqual([["/__pv/home"], ["/__pv/methodology"], ["/__pv/home"]]);
  });
  it("counts independent page loads even within the same second", () => {
    const send = vi.fn();
    createPageViewTracker(send)("/");
    createPageViewTracker(send)("/");
    expect(send).toHaveBeenCalledTimes(2);
  });
});
