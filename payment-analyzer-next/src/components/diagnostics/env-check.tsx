'use client';

import { useEffect, useState } from 'react';

export function EnvCheck() {
  const [envStatus, setEnvStatus] = useState<{
    hasUrl: boolean;
    hasKey: boolean;
    urlPrefix: string;
    keyLength: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    setEnvStatus({
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) || 'NOT SET',
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      timestamp: new Date().toISOString()
    });
  }, []);

  if (!envStatus) return null;

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg shadow-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Environment Check</h3>
      <div className="space-y-1">
        <div>URL: {envStatus.hasUrl ? '✅' : '❌'} {envStatus.urlPrefix}</div>
        <div>Key: {envStatus.hasKey ? '✅' : '❌'} Length: {envStatus.keyLength}</div>
        <div>Time: {envStatus.timestamp}</div>
      </div>
    </div>
  );
}