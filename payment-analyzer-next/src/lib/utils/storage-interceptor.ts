/**
 * Storage interceptor to prevent JSON parsing errors
 *
 * Note: The primary interceptor is initialized in layout.tsx as a beforeInteractive script
 * This function provides a fallback for environments where that doesn't run
 */

// Check if already initialized by the global script
declare global {
  interface Window {
    __storageInterceptorInitialized?: boolean;
  }
}

let isInitialized = false;

export function initializeStorageInterceptor(): void {
  // Check if already initialized by the global script in layout.tsx
  if (typeof window !== "undefined" && window.__storageInterceptorInitialized) {
    console.log("[Storage] Interceptor already initialized by global script");
    isInitialized = true;
    return;
  }

  if (isInitialized || typeof window === "undefined") {
    return;
  }

  // Override localStorage.setItem to sanitize data
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    try {
      // Check if the value contains "[object Object]"
      if (
        typeof value === "string" &&
        (value.includes("[object Object]") || value === "[object Object]")
      ) {
        console.warn(`Prevented storing corrupted data for key: ${key}`);
        return;
      }

      // Try to parse and re-stringify to validate JSON
      if (value.startsWith("{") || value.startsWith("[")) {
        try {
          const parsed = JSON.parse(value);
          const cleaned = JSON.stringify(parsed);
          originalSetItem(key, cleaned);
        } catch (error) {
          console.warn(`Invalid JSON detected for key ${key}, skipping storage:`, error);
          return;
        }
      } else {
        originalSetItem(key, value);
      }
    } catch (error) {
      console.warn(`Storage setItem error for key ${key}:`, error);
    }
  };

  // Override localStorage.getItem to validate data on retrieval
  const originalGetItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = (key: string): string | null => {
    try {
      const value = originalGetItem(key);

      if (value === null) {
        return null;
      }

      // Check for corrupted data patterns
      if (
        typeof value === "string" &&
        (value.includes("[object Object]") || value === "[object Object]")
      ) {
        console.warn(`Removing corrupted data for key: ${key}`);
        localStorage.removeItem(key);
        return null;
      }

      return value;
    } catch (error) {
      console.warn(`Storage getItem error for key ${key}:`, error);
      return null;
    }
  };

  // Also handle sessionStorage
  const originalSessionSetItem = sessionStorage.setItem.bind(sessionStorage);
  sessionStorage.setItem = (key: string, value: string) => {
    try {
      if (
        typeof value === "string" &&
        (value.includes("[object Object]") || value === "[object Object]")
      ) {
        console.warn(`Prevented storing corrupted session data for key: ${key}`);
        return;
      }

      if (value.startsWith("{") || value.startsWith("[")) {
        try {
          const parsed = JSON.parse(value);
          const cleaned = JSON.stringify(parsed);
          originalSessionSetItem(key, cleaned);
        } catch (error) {
          console.warn(`Invalid JSON detected for session key ${key}, skipping storage:`, error);
          return;
        }
      } else {
        originalSessionSetItem(key, value);
      }
    } catch (error) {
      console.warn(`Session storage setItem error for key ${key}:`, error);
    }
  };

  const originalSessionGetItem = sessionStorage.getItem.bind(sessionStorage);
  sessionStorage.getItem = (key: string): string | null => {
    try {
      const value = originalSessionGetItem(key);

      if (value === null) {
        return null;
      }

      if (
        typeof value === "string" &&
        (value.includes("[object Object]") || value === "[object Object]")
      ) {
        console.warn(`Removing corrupted session data for key: ${key}`);
        sessionStorage.removeItem(key);
        return null;
      }

      return value;
    } catch (error) {
      console.warn(`Session storage getItem error for key ${key}:`, error);
      return null;
    }
  };

  // Clean up any existing corrupted data immediately
  cleanupAllCorruptedData();

  // Listen for storage events from other tabs/windows and clean them up
  window.addEventListener("storage", (event) => {
    if (
      event.newValue &&
      typeof event.newValue === "string" &&
      (event.newValue.includes("[object Object]") || event.newValue === "[object Object]")
    ) {
      console.warn(`Detected corrupted data in storage event for key: ${event.key}`);
      if (event.key) {
        try {
          localStorage.removeItem(event.key);
        } catch (error) {
          console.warn(`Failed to clean corrupted storage key ${event.key}:`, error);
        }
      }
    }
  });

  isInitialized = true;
}

function cleanupAllCorruptedData(): void {
  try {
    // Check all localStorage keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (
            value &&
            typeof value === "string" &&
            (value.includes("[object Object]") || value === "[object Object]")
          ) {
            console.warn(`Cleaning up corrupted localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Error checking localStorage key ${key}:`, error);
          // If we can't even read it, try to remove it
          try {
            localStorage.removeItem(key);
          } catch (removeError) {
            console.warn(`Failed to remove problematic key ${key}:`, removeError);
          }
        }
      }
    }

    // Check all sessionStorage keys
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key) {
        try {
          const value = sessionStorage.getItem(key);
          if (
            value &&
            typeof value === "string" &&
            (value.includes("[object Object]") || value === "[object Object]")
          ) {
            console.warn(`Cleaning up corrupted sessionStorage key: ${key}`);
            sessionStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Error checking sessionStorage key ${key}:`, error);
          try {
            sessionStorage.removeItem(key);
          } catch (removeError) {
            console.warn(`Failed to remove problematic session key ${key}:`, removeError);
          }
        }
      }
    }
  } catch (error) {
    console.warn("Error during storage cleanup:", error);
  }
}
