/**
 * Auth Mocks
 * Mock user authentication data and hooks
 */

import { vi } from "vitest";

export const mockUser = {
  id: "test-user-123",
  email: "test@example.com",
  user_metadata: {
    name: "Test User",
  },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
};

export const mockAuthHook = {
  user: mockUser,
  isLoading: false,
  isAuthenticated: true,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
};

export const mockAuthHookLoading = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
};

export const mockAuthHookUnauthenticated = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
};
