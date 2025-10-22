// Server (Node) test setup
import { beforeEach, vi } from "vitest";

// Quieter logs during tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
