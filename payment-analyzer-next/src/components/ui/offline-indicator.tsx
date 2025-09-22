'use client';

import { useState, useEffect } from 'react';
import { hasValidSupabaseConfig } from '@/lib/utils/supabase-cleanup';

export function OfflineIndicator() {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Check if we're in offline mode due to missing Supabase config
    const hasInvalidConfig = !hasValidSupabaseConfig();

    // Check if we're actually offline
    const handleOnline = () => setShowIndicator(!hasInvalidConfig);
    const handleOffline = () => setShowIndicator(true);

    setShowIndicator(hasInvalidConfig || !navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator) return null;

  const hasInvalidConfig = !hasValidSupabaseConfig();

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            {hasInvalidConfig ? (
              <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.196l1.412 2.824 3.118.454-2.254 2.197.532 3.104L12 9.735l-2.808 1.04.532-3.104-2.254-2.197 3.118-.454L12 2.196z" />
              </svg>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-800">
              {hasInvalidConfig ? 'Demo Mode' : 'Offline Mode'}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              {hasInvalidConfig 
                ? 'Using local storage only. Check SETUP.md to enable online features.' 
                : 'No internet connection. Using local storage.'}
            </p>
          </div>
          
          <button
            onClick={() => setShowIndicator(false)}
            className="flex-shrink-0 text-yellow-600 hover:text-yellow-800"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}