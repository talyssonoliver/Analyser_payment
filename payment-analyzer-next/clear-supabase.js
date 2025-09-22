/**
 * Emergency Supabase Storage Cleaner
 * 
 * If you're experiencing "Failed to fetch" errors with Supabase,
 * run this script in your browser console to clear all auth tokens:
 * 
 * 1. Open Developer Tools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Reload the page
 */

(function clearSupabaseStorage() {
  console.log('🧹 Starting Supabase storage cleanup...');
  
  let clearedCount = 0;
  
  // Clear localStorage
  const localKeysToRemove = [];
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
      localKeysToRemove.push(key);
    }
  }
  
  localKeysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ Removed localStorage key: ${key}`);
    clearedCount++;
  });
  
  // Clear sessionStorage
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('supabase.auth.token') ||
      key.startsWith('sb-') ||
      key.includes('supabase') ||
      key.includes('auth-token')
    )) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ Removed sessionStorage key: ${key}`);
    clearedCount++;
  });
  
  console.log(`🎉 Cleanup complete! Cleared ${clearedCount} items.`);
  console.log('📝 Now reload the page to see if the errors are gone.');
  
  // Auto-reload after 2 seconds
  setTimeout(() => {
    console.log('🔄 Reloading page...');
    window.location.reload();
  }, 2000);
})();