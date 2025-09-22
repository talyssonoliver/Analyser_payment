'use client';

import { useEffect } from 'react';
import { cleanupCorruptedStorage } from '@/lib/utils/storage-cleanup';
import { initializeStorageInterceptor } from '@/lib/utils/storage-interceptor';

export function ErrorHandler() {
  useEffect(() => {
    // Initialize storage interceptor to prevent future issues
    initializeStorageInterceptor();
    
    // Clean up any corrupted storage on app start
    cleanupCorruptedStorage();
    
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Filter out extension-related JSON parsing errors
      if (error && 
          typeof error === 'object' && 
          error.message && 
          typeof error.message === 'string') {
        
        const errorMessage = error.message.toLowerCase();
        
        // Check if it's a JSON parsing error from browser extensions
        if ((errorMessage.includes('not valid json') || 
             errorMessage.includes('unexpected token') ||
             errorMessage.includes('json.parse') ||
             errorMessage.includes('[object object]')) &&
            (error.stack && (error.stack.includes('content.js') || 
                           error.stack.includes('_storageChangeDispatcher') ||
                           error.stack.includes('_storageChangeDispatcherCallback')))) {
          
          // Prevent this error from showing in console
          event.preventDefault();
          return;
        }
      }
      
      // Check for specific extension-related error patterns
      if (typeof error === 'string' && 
          (error.includes('[object Object]" is not valid JSON') ||
           error.includes('_storageChangeDispatcher') ||
           error.includes('_storageChangeDispatcherCallback') ||
           error.includes('content.js'))) {
        event.preventDefault();
        return;
      }

      // Also check the error message for these patterns
      if (error && 
          typeof error === 'object' && 
          error.message &&
          typeof error.message === 'string' &&
          (error.message.includes('[object Object]" is not valid JSON') ||
           error.message.includes('_storageChangeDispatcher') ||
           error.message.includes('_storageChangeDispatcherCallback'))) {
        event.preventDefault();
        return;
      }
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message;
      
      // Filter out extension-related errors
      if (message && 
          (message.includes('content.js') ||
           message.includes('_storageChangeDispatcher') ||
           message.includes('[object Object]" is not valid JSON'))) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}