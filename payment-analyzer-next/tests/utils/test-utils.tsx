/**
 * Test Utilities
 * Custom render functions and test helpers
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import type { ReactElement } from "react";

// Create a custom query client for testing
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // v5: cacheTime renamed to gcTime
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// All providers wrapper
interface AllProvidersProps {
  children: React.ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Custom render function
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Export test query client creator
export { createTestQueryClient };
