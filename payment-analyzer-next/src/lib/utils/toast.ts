// Simple toast replacement until sonner is installed
export const toast = {
  success: (message: string) => {
    console.log(`✅ Success: ${message}`);
    // Could show a temporary UI notification here
  },
  
  error: (message: string) => {
    console.log(`❌ Error: ${message}`);
  },
  
  warning: (message: string) => {
    console.log(`⚠️ Warning: ${message}`);
  },
  
  info: (message: string) => {
    console.log(`ℹ️ Info: ${message}`);
  }
};