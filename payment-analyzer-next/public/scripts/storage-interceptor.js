// Initialize storage interceptor early to prevent extension conflicts
(function () {
  if (typeof window === "undefined" || window.__storageInterceptorInitialized) return;

  window.__storageInterceptorInitialized = true;

  // Helper: Check if a value is corrupted
  function isCorruptedValue(value) {
    return value && (value.includes("[object Object]") || value === "[object Object]");
  }

  // Helper: Clean up a single storage key
  function cleanupStorageKey(storage, key, storageType) {
    try {
      const value = storage.getItem(key);
      if (isCorruptedValue(value)) {
        console.warn(`[Storage] Cleaning corrupted ${storageType} key:`, key);
        storage.removeItem(key);
      }
    } catch (error) {
      console.warn(`[Storage] Error reading ${storageType} key:`, key, error);
      try {
        storage.removeItem(key);
      } catch (removeError) {
        console.warn(`[Storage] Failed to remove ${storageType} key:`, key, removeError);
      }
    }
  }

  // Helper: Clean up all keys in a storage
  function cleanupStorage(storage, storageType) {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key) {
        cleanupStorageKey(storage, key, storageType);
      }
    }
  }

  function cleanupCorruptedData() {
    try {
      cleanupStorage(localStorage, "local");
      cleanupStorage(sessionStorage, "session");
    } catch (error) {
      console.warn("[Storage] Cleanup error:", error);
    }
  }

  // Helper: Validate and store JSON value
  function storeJsonValue(originalSetItem, key, value) {
    try {
      const parsed = JSON.parse(value);
      const cleaned = JSON.stringify(parsed);
      originalSetItem(key, cleaned);
    } catch (error) {
      console.warn("[Storage] Invalid JSON for key:", key, error);
      return false;
    }
    return true;
  }

  // Helper: Validate and set item to storage
  function setStorageItem(originalSetItem, key, value, storageType) {
    if (typeof value !== "string") {
      console.error(`[Storage] Attempted to store non-string ${storageType} value for key:`, key, typeof value);
      return;
    }
    if (isCorruptedValue(value)) {
      console.warn(`[Storage] Prevented storing corrupted ${storageType} data for key:`, key);
      return;
    }
    if (value.startsWith("{") || value.startsWith("[")) {
      storeJsonValue(originalSetItem, key, value);
    } else {
      originalSetItem(key, value);
    }
  }

  // Override localStorage.setItem
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    try {
      setStorageItem(originalSetItem, key, value, "local");
    } catch (error) {
      console.warn("[Storage] setItem error for key:", key, error);
    }
  };

  // Override sessionStorage.setItem
  const originalSessionSetItem = sessionStorage.setItem.bind(sessionStorage);
  sessionStorage.setItem = function (key, value) {
    try {
      setStorageItem(originalSessionSetItem, key, value, "session");
    } catch (error) {
      console.warn("[Storage] Session setItem error for key:", key, error);
    }
  };

  cleanupCorruptedData();

  // Helper: Get item and validate
  function getStorageItem(originalGetItem, storage, key, storageType) {
    const value = originalGetItem(key);
    if (value && typeof value === "string" && isCorruptedValue(value)) {
      console.warn(`[Storage] Blocked read of corrupted ${storageType} key:`, key);
      storage.removeItem(key);
      return null;
    }
    return value;
  }

  // Override localStorage.getItem
  const originalGetItem = localStorage.getItem.bind(localStorage);
  localStorage.getItem = function (key) {
    try {
      return getStorageItem(originalGetItem, localStorage, key, "local");
    } catch (error) {
      console.warn("[Storage] getItem error for key:", key, error);
      return null;
    }
  };

  // Override sessionStorage.getItem
  const originalSessionGetItem = sessionStorage.getItem.bind(sessionStorage);
  sessionStorage.getItem = function (key) {
    try {
      return getStorageItem(originalSessionGetItem, sessionStorage, key, "session");
    } catch (error) {
      console.warn("[Storage] Session getItem error for key:", key, error);
      return null;
    }
  };

  // Helper: Remove corrupted key from storage event
  function removeCorruptedEventKey(event) {
    if (!event.key) return;

    try {
      if (event.storageArea === localStorage) {
        localStorage.removeItem(event.key);
      } else if (event.storageArea === sessionStorage) {
        sessionStorage.removeItem(event.key);
      }
    } catch (error) {
      console.warn("[Storage] Failed to remove corrupted key:", event.key, error);
    }
  }

  // Helper: Check if storage event has corrupted value
  function isCorruptedStorageEvent(event) {
    return (
      event instanceof StorageEvent &&
      event.newValue &&
      typeof event.newValue === "string" &&
      isCorruptedValue(event.newValue)
    );
  }

  // Override addEventListener for storage events
  const originalAddEventListener = window.addEventListener.bind(window);
  window.addEventListener = function (type, listener, options) {
    if (type === "storage") {
      const wrappedListener = function (event) {
        if (isCorruptedStorageEvent(event)) {
          console.warn("[Storage] Blocked corrupted storage event for key:", event.key);
          removeCorruptedEventKey(event);
          return;
        }
        return listener.call(this, event);
      };
      originalAddEventListener("storage", wrappedListener, options);
    } else {
      originalAddEventListener(type, listener, options);
    }
  };

  // Add global storage event handler
  originalAddEventListener(
    "storage",
    function (event) {
      if (isCorruptedStorageEvent(event)) {
        console.warn("[Storage] Detected corrupted storage event, cleaning:", event.key);
        removeCorruptedEventKey(event);
      }
    },
    true,
  );

  console.log("[Storage] Enhanced interceptor initialized successfully");
})();
