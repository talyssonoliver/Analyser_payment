/**
 * Manual storage cleanup script
 * Run this in the browser console to immediately clean up corrupted localStorage data
 */

(function() {
  console.log('Starting manual storage cleanup...');
  
  let corruptedKeys = [];
  
  try {
    // Check localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (value && typeof value === 'string' && 
              (value.includes('[object Object]') || value === '[object Object]')) {
            console.log(`Found corrupted localStorage key: ${key}`);
            corruptedKeys.push(key);
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.log(`Error checking localStorage key ${key}:`, error);
          corruptedKeys.push(key);
          try {
            localStorage.removeItem(key);
          } catch (removeError) {
            console.error(`Failed to remove problematic key ${key}:`, removeError);
          }
        }
      }
    }

    // Check sessionStorage
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key) {
        try {
          const value = sessionStorage.getItem(key);
          if (value && typeof value === 'string' && 
              (value.includes('[object Object]') || value === '[object Object]')) {
            console.log(`Found corrupted sessionStorage key: ${key}`);
            corruptedKeys.push(`session:${key}`);
            sessionStorage.removeItem(key);
          }
        } catch (error) {
          console.log(`Error checking sessionStorage key ${key}:`, error);
          corruptedKeys.push(`session:${key}`);
          try {
            sessionStorage.removeItem(key);
          } catch (removeError) {
            console.error(`Failed to remove problematic session key ${key}:`, removeError);
          }
        }
      }
    }

    if (corruptedKeys.length === 0) {
      console.log('✅ No corrupted storage data found.');
    } else {
      console.log(`✅ Cleaned up ${corruptedKeys.length} corrupted storage keys:`, corruptedKeys);
      console.log('Please refresh the page to ensure the changes take effect.');
    }
  } catch (error) {
    console.error('Error during storage cleanup:', error);
  }
})();