/**
 * Client (jsdom) test setup
 */
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, vi } from "vitest";

// Make React available globally for all component tests
// This fixes the "ReferenceError: React is not defined" error in jsdom environment
(global as any).React = React;

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/",
    query: {},
    asPath: "/",
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [] as number[];
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock local/session storage
const storage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: storage });
Object.defineProperty(window, "sessionStorage", { value: storage });

// Quieter logs during tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// NOTE: Global library mocks removed - they broke tests that need real implementations
// If specific tests need mocking for performance, add vi.mock() in those test files
// Example:
//   vi.mock('recharts', () => ({ LineChart: vi.fn(() => null) }))
//   vi.mock('pdfjs-dist', () => ({ getDocument: vi.fn() }))
