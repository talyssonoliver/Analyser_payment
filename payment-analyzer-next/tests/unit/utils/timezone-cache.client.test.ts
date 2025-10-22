import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase browser client used by timezone manager
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => {
      throw new Error("no view");
    },
    rpc: async () => ({ data: null, error: { message: "rpc error" } }),
  }),
}));

import { clearTimezoneCache, getTimezones } from "@/lib/utils/timezone-cache";

describe("utils/timezone-cache", () => {
  beforeEach(() => {
    localStorage.clear();
    clearTimezoneCache();
  });

  it("falls back to default timezones when DB fetch fails", async () => {
    const zones = await getTimezones();
    expect(Array.isArray(zones)).toBe(true);
    expect(zones.length).toBeGreaterThan(0);
    expect(zones).toContain("UTC");
  });
});
