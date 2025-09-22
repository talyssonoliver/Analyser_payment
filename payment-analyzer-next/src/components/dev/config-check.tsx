'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';

interface ConfigStatus {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  supabaseConnection: boolean;
  error?: string;
}

export function ConfigCheck() {
  const [status, setStatus] = useState<ConfigStatus>({
    supabaseUrl: false,
    supabaseAnonKey: false,
    supabaseConnection: false,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    // Check environment variables
    const supabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Test Supabase connection
    const supabaseConnection = false;
    let error: string | undefined;

    if (supabaseUrl && supabaseAnonKey) {
      // Basic connection test
      try {
        const url = new URL('/rest/v1/', process.env.NEXT_PUBLIC_SUPABASE_URL!);
        fetch(url.toString(), {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
        }).then(response => {
          if (response.ok || response.status === 401) {
            // 401 is expected for unauthenticated requests
            setStatus(prev => ({ ...prev, supabaseConnection: true }));
          } else {
            setStatus(prev => ({ 
              ...prev, 
              supabaseConnection: false,
              error: `HTTP ${response.status}: ${response.statusText}` 
            }));
          }
        }).catch(err => {
          setStatus(prev => ({ 
            ...prev, 
            supabaseConnection: false,
            error: err.message 
          }));
        });
      } catch (err) {
        error = err instanceof Error ? err.message : 'Invalid URL';
      }
    } else {
      error = 'Missing environment variables';
    }

    setStatus({
      supabaseUrl,
      supabaseAnonKey,
      supabaseConnection,
      error,
    });

    // Show config check if there are issues
    setIsVisible(!supabaseUrl || !supabaseAnonKey || !!error);
  }, []);

  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const allGood = status.supabaseUrl && status.supabaseAnonKey && status.supabaseConnection;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className={`p-4 border-2 ${allGood ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Configuration Status
          </h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className={status.supabaseUrl ? 'text-green-600' : 'text-red-600'}>
              {status.supabaseUrl ? '✓' : '✗'}
            </span>
            <span>Supabase URL</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={status.supabaseAnonKey ? 'text-green-600' : 'text-red-600'}>
              {status.supabaseAnonKey ? '✓' : '✗'}
            </span>
            <span>Supabase Anon Key</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={status.supabaseConnection ? 'text-green-600' : 'text-yellow-600'}>
              {status.supabaseConnection ? '✓' : '⚠'}
            </span>
            <span>Supabase Connection</span>
          </div>
          
          {status.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
              <div className="font-medium">Error:</div>
              <div>{status.error}</div>
            </div>
          )}
          
          {!allGood && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
              <div className="font-medium">Setup Help:</div>
              <div>Check SETUP.md for configuration instructions</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}