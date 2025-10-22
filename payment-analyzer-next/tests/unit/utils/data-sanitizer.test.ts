import { describe, expect, it } from "vitest";
import {
  isSerializable,
  safeParse,
  safeStringify,
  sanitizeForJson,
} from "@/lib/utils/data-sanitizer";

describe("utils/data-sanitizer", () => {
  it("removes functions and undefined values", () => {
    const obj = { a: 1, b: undefined as any, c: () => 1 };
    const out = sanitizeForJson(obj) as any;
    expect(out.a).toBe(1);
    expect("b" in out).toBe(false);
    expect("c" in out).toBe(false);
  });

  it("serializes Date objects to ISO strings", () => {
    const d = new Date("2024-01-01T00:00:00.000Z");
    const out = sanitizeForJson({ d }) as any;
    expect(out.d).toBe(d.toISOString());
  });

  it("returns null for circular objects", () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const out = sanitizeForJson(obj);
    expect(out).toBeNull();
  });

  it('safeStringify returns "null" for circular input (sanitized to null)', () => {
    const obj: any = {};
    obj.self = obj;
    const out = safeStringify(obj);
    // sanitizeForJson returns null, so stringify(null) => "null"
    expect(out).toBe("null");
  });

  it("safeParse handles invalid strings and [object Object] pattern", () => {
    expect(safeParse("not json", { ok: false })).toEqual({ ok: false });
    expect(safeParse("[object Object]", { ok: true })).toEqual({ ok: true });
  });

  it("isSerializable reflects sanitization ability", () => {
    expect(isSerializable({ a: 1 })).toBe(true);
    const obj: any = {};
    obj.self = obj;
    expect(isSerializable(obj)).toBe(true); // sanitizeForJson returns null then JSON.stringify(null) is valid
  });
});
