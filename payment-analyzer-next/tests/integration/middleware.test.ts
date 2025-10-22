// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock @supabase/ssr createServerClient used by middleware
const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
}));

import { middleware } from "../../middleware";

// Minimal NextRequest-like object for tests
function makeRequest(pathname: string) {
  const url = new URL(`http://localhost${pathname}`);
  return {
    cookies: {
      getAll: () => [],
      set: vi.fn(),
      setAll: vi.fn(),
    },
    nextUrl: {
      pathname,
      clone: () => {
        const u = new URL(url);
        return {
          pathname: u.pathname,
          searchParams: {
            set: (k: string, v: string) => u.searchParams.set(k, v),
          },
          toString: () => u.toString(),
        } as any;
      },
    },
  } as any;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetUser.mockReset();
  });

  it("redirects unauthenticated user from protected route to /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("/dashboard");
    const res = await middleware(req);
    expect(res.status).toBe(307); // NextResponse.redirect default temporary redirect
  });

  it("redirects authenticated user away from auth pages to /dashboard", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const req = makeRequest("/login");
    const res = await middleware(req);
    expect(res.status).toBe(307);
  });

  it("sets security and cache headers for API paths", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const req = makeRequest("/api/health");
    const res = await middleware(req);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=60/);
  });
});
