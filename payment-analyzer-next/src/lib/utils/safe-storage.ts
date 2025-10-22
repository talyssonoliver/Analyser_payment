/**
 * Safe storage utilities to prevent JSON parsing errors
 */

function isStorageAvailable(type: "localStorage" | "sessionStorage"): boolean {
  try {
    const storage = window[type];
    const x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch {
    return false;
  }
}

export const SafeStorage = {
  setItem(key: string, value: unknown, useSession = false): boolean {
    const storageType = useSession ? "sessionStorage" : "localStorage";

    if (!isStorageAvailable(storageType)) {
      console.warn(`${storageType} is not available`);
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      window[storageType].setItem(key, serialized);
      return true;
    } catch (error) {
      console.warn(`Failed to set ${storageType} item "${key}":`, error);
      return false;
    }
  },

  getItem<T = unknown>(key: string, defaultValue: T | null = null, useSession = false): T | null {
    const storageType = useSession ? "sessionStorage" : "localStorage";

    if (!isStorageAvailable(storageType)) {
      return defaultValue;
    }

    try {
      const item = window[storageType].getItem(key);
      if (item === null) {
        return defaultValue;
      }

      return JSON.parse(item);
    } catch (error) {
      console.warn(`Failed to get ${storageType} item "${key}":`, error);
      // Clear corrupted data
      try {
        window[storageType].removeItem(key);
      } catch {
        // Ignore cleanup errors
      }
      return defaultValue;
    }
  },

  removeItem(key: string, useSession = false): boolean {
    const storageType = useSession ? "sessionStorage" : "localStorage";

    if (!isStorageAvailable(storageType)) {
      return false;
    }

    try {
      window[storageType].removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove ${storageType} item "${key}":`, error);
      return false;
    }
  },

  clear(useSession = false): boolean {
    const storageType = useSession ? "sessionStorage" : "localStorage";

    if (!isStorageAvailable(storageType)) {
      return false;
    }

    try {
      window[storageType].clear();
      return true;
    } catch (error) {
      console.warn(`Failed to clear ${storageType}:`, error);
      return false;
    }
  },
};
