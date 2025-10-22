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

// Mock analysis service
const getUserAnalyses = vi.fn();
const createAnalysis = vi.fn();
vi.mock("@/lib/services/analysis-service", () => ({
  analysisService: {
    getUserAnalyses: (...args: unknown[]) => getUserAnalyses(...args),
    createAnalysis: (...args: unknown[]) => createAnalysis(...args),
  },
}));

// Import after mocks
async function loadRoute() {
  // explicit extension for Node-resolved imports
  return await import(new URL("../../../src/app/api/analysis/route.ts", import.meta.url).href);
}
async function loadServer() {
  return await import(new URL("../../../src/lib/supabase/server.ts", import.meta.url).href);
}

describe("API: /api/analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserAnalyses.mockReset();
    createAnalysis.mockReset();
    mockGetUser.mockReset();
  });

  it("debug: mocked server createClient returns mocked supabase", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { createClient: serverCreateClient } = await loadServer();
    const supabase = await serverCreateClient();
    const result = await supabase.auth.getUser();
    expect(result.data.user).toBeNull();
  });

  it("GET should return 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new Request("http://localhost/api/analysis", { method: "GET" });
    const { GET } = await loadRoute();
    const res = await GET(req as any);
    const body = await res.json();
    // Debug helper if this fails in CI
    console.log("GET /api/analysis unauth body:", body);
    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("GET should return data with pagination when authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    getUserAnalyses.mockResolvedValue({ data: [{ id: "a1" }], error: undefined });
    const req = new Request("http://localhost/api/analysis?limit=5&offset=0", { method: "GET" });
    const { GET } = await loadRoute();
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination.limit).toBe(5);
    expect(body.pagination.offset).toBe(0);
    expect(body.pagination.total).toBe(1);
  });

  it("POST should return 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const req = new Request("http://localhost/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("POST should reject when neither files nor manualEntries provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const req = new Request("http://localhost/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/requires either files or manual entries/i);
  });

  it("POST should reject when files are provided (use upload endpoint)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const req = new Request("http://localhost/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: [{ name: "f.pdf", size: 1, type: "application/pdf", lastModified: Date.now() }],
      }),
    });
    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/File uploads must be handled/i);
  });

  it("POST should create analysis from manual entries", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    createAnalysis.mockResolvedValue({
      success: true,
      analysisId: "new-id",
      analysis: { id: "new-id" },
    });
    const req = new Request("http://localhost/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manualEntries: [{ date: "2024-01-01", consignments: 5, paid: 100 }],
      }),
    });
    const { POST } = await loadRoute();
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.analysisId).toBe("new-id");
  });
});
