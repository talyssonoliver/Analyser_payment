/**
 * Storage cleanup utility to fix corrupted localStorage data
 */

export function cleanupCorruptedStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    // List of keys used by the application
    const appKeys = [
      'payment-analyzer-auth',
      'payment-analyzer-settings',
      'supabase.auth.token',
      '__ZUSTAND__'
    ];

    // Check each key for corruption
    appKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          // Try to parse the value
          JSON.parse(value);
        }
      } catch (error) {
        console.warn(`Removing corrupted localStorage key: ${key}`, error);
        try {
          localStorage.removeItem(key);
        } catch (removeError) {
          console.warn(`Failed to remove corrupted key ${key}:`, removeError);
        }
      }
    });

    // Also check for any keys that might contain object references
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (value && (value.includes('[object Object]') || value === '[object Object]')) {
            console.warn(`Removing invalid localStorage value for key: ${key}`);
            localStorage.removeItem(key);
            i--; // Adjust index since we removed an item
          }
        } catch (error) {
          console.warn(`Error checking localStorage key ${key}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Storage cleanup failed:', error);
  }
}