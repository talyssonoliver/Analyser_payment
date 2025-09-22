/**
 * Hook to monitor online/offline status and sync preferences accordingly
 */

'use client';

import { useEffect } from 'react';
import { usePreferencesStore } from '@/lib/stores/preferences-store';

export function useOnlineStatus() {
  const setOnlineStatus = usePreferencesStore((state) => state.setOnlineStatus);
  const isOnline = usePreferencesStore((state) => state.isOnline);

  useEffect(() => {
    // Initialize online status
    setOnlineStatus(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('App came online - syncing preferences');
      setOnlineStatus(true);
    };

    const handleOffline = () => {
      console.log('App went offline - using local preferences');
      setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return {
    isOnline,
    setOnlineStatus,
  };
}