// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Next cookies and Supabase SSR used by the server client
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}));

const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
  createBrowserClient: vi.fn(() => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
}));

const getUserAnalyses = vi.fn();
vi.mock("@/lib/services/analysis-service", () => ({
  analysisService: {
    getUserAnalyses: (...args: unknown[]) => getUserAnalyses(...args),
  },
}));

const exportAnalyses = vi.fn();
vi.mock("@/lib/services/export-service", async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    exportService: {
      exportAnalyses: (...args: unknown[]) => exportAnalyses(...args),
    },
  };
});

async function loadRoute() {
  return await import(new URL("../../../src/app/api/export/route.ts", import.meta.url).href);
}

describe("API: /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
    getUserAnalyses.mockReset();
    exportAnalyses.mockReset();
  });

  it("POST should return 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json" }),
    });
    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("POST should validate request body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const req = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "xml" }), // invalid
    });
    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid request data/i);
  });

  it("POST should export analyses (json)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    getUserAnalyses.mockResolvedValue({
      data: [{ id: "a1", status: "completed" }],
      error: undefined,
    });
    exportAnalyses.mockResolvedValue({
      success: true,
      data: '{"ok":true}',
      filename: "analyses.json",
    });

    const req = new Request("http://localhost/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "json" }),
    });

    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    // For NextResponse with JSON, body may be JSON with error or not present for string/Blob; ensure no error
  });

  it("GET should return 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new Request("http://localhost/api/export", { method: "GET" });
    const { GET } = await loadRoute();
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("GET should return available formats when authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    getUserAnalyses.mockResolvedValue({ data: [], error: undefined });
    const req = new Request("http://localhost/api/export", { method: "GET" });
    const { GET } = await loadRoute();
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.availableFormats)).toBe(true);
  });
});
