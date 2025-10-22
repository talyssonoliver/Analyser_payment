import { beforeEach, describe, expect, it } from "vitest";
import { SafeStorage } from "@/lib/utils/safe-storage";

describe("utils/safe-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("set/get/remove/clear works for localStorage", () => {
    expect(SafeStorage.setItem("k", { a: 1 })).toBe(true);
    expect(SafeStorage.getItem("k")).toEqual({ a: 1 });
    expect(SafeStorage.removeItem("k")).toBe(true);
    expect(SafeStorage.getItem("k")).toBeNull();
    expect(SafeStorage.setItem("k2", 2)).toBe(true);
    expect(SafeStorage.clear()).toBe(true);
    expect(SafeStorage.getItem("k2")).toBeNull();
  });

  it("handles corrupted JSON by returning default and clearing key", () => {
    localStorage.setItem("bad", "{not-json");
    const value = SafeStorage.getItem("bad", "default");
    expect(value).toBe("default");
    expect(localStorage.getItem("bad")).toBeNull();
  });

  it("works with sessionStorage when flag is set", () => {
    expect(SafeStorage.setItem("k", { a: 1 }, true)).toBe(true);
    expect(SafeStorage.getItem("k", null, true)).toEqual({ a: 1 });
    expect(SafeStorage.removeItem("k", true)).toBe(true);
  });
});
