/**
 * Supabase Cleanup Utility
 * Cleans up invalid Supabase auth tokens and session data
 */

export function clearSupabaseStorage() {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear Supabase auth tokens and session data
    const keysToRemove: string[] = [];
    
    // Find all Supabase-related keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('supabase.auth.token') ||
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token') ||
        key.includes('access-token') ||
        key.includes('refresh-token')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove the keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared invalid Supabase key: ${key}`);
    });
    
    // Also clear sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('supabase.auth.token') ||
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        key.includes('auth-token')
      )) {
        sessionStorage.removeItem(key);
        console.log(`Cleared invalid Supabase session key: ${key}`);
      }
    }
    
    console.log('Supabase cleanup completed');
  } catch (error) {
    console.error('Error during Supabase cleanup:', error);
  }
}

/**
 * Check if current environment has valid Supabase configuration
 */
export function hasValidSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) return false;
  
  try {
    // Basic URL validation
    new URL(url);
    return url.includes('.supabase.co') && anonKey.length > 50;
  } catch {
    return false;
  }
}

/**
 * Initialize cleanup on app start
 */
export function initSupabaseCleanup() {
  if (typeof window === 'undefined') return;
  
  // Only run cleanup if we don't have valid config
  if (!hasValidSupabaseConfig()) {
    console.warn('Invalid Supabase configuration detected, cleaning up old tokens...');
    clearSupabaseStorage();
  }
}