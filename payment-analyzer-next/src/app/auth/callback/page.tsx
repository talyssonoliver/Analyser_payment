'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      
      if (error) {
        console.error('Error during auth callback:', error);
        router.push('/login?error=Unable to confirm email');
        return;
      }
      
      // Successfully confirmed - redirect to dashboard
      router.push('/dashboard');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <CheckCircle className="h-6 w-6 text-green-600 absolute bottom-0 right-0 hidden" />
            </div>
            <h2 className="text-xl font-semibold">Confirming your email...</h2>
            <p className="text-gray-600 text-center">
              Please wait while we verify your email address.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}