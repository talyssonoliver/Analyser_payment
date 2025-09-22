/**
 * Auth Callback Page
 * Handles authentication callbacks (email confirmation, password reset, OAuth)
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type CallbackState = 'loading' | 'success' | 'error';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = createClient();

  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const type = searchParams.get('type');

        // Handle errors from the auth provider
        if (error) {
          console.error('Auth callback error:', error, errorDescription);
          setState('error');
          setMessage(errorDescription || error || 'Authentication failed');
          
          toast({
            title: 'Authentication Failed',
            description: errorDescription || error || 'Something went wrong during authentication',
            type: 'error',
          });

          // Redirect to login after showing error
          setTimeout(() => {
            router.push('/login');
          }, 3000);
          return;
        }

        // Handle auth code exchange
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setState('error');
            setMessage(exchangeError.message || 'Failed to complete authentication');
            
            toast({
              title: 'Authentication Failed',
              description: exchangeError.message || 'Failed to complete authentication',
              type: 'error',
            });

            setTimeout(() => {
              router.push('/login');
            }, 3000);
            return;
          }

          if (data.session) {
            setState('success');
            
            // Handle different callback types
            switch (type) {
              case 'signup':
                setMessage('Account verified successfully!');
                toast({
                  title: 'Welcome!',
                  description: 'Your account has been verified. Welcome to Payment Analyzer!',
                  type: 'success',
                });
                break;
              
              case 'recovery':
                setMessage('Password reset verified!');
                router.push('/reset-password');
                return;
              
              case 'invite':
                setMessage('Invitation accepted successfully!');
                toast({
                  title: 'Welcome!',
                  description: 'Your invitation has been accepted. Welcome to the team!',
                  type: 'success',
                });
                break;
              
              default:
                setMessage('Authentication completed successfully!');
                toast({
                  title: 'Success!',
                  description: 'You have been successfully authenticated.',
                  type: 'success',
                });
            }

            // Redirect to dashboard
            setTimeout(() => {
              const redirectTo = searchParams.get('redirect_to') || '/dashboard';
              router.push(redirectTo);
            }, 2000);
            return;
          }
        }

        // If we get here, something unexpected happened
        setState('error');
        setMessage('Invalid authentication callback');
        
        toast({
          title: 'Authentication Error',
          description: 'Invalid authentication callback received',
          type: 'error',
        });

        setTimeout(() => {
          router.push('/login');
        }, 3000);

      } catch (error) {
        console.error('Callback handler error:', error);
        setState('error');
        setMessage('An unexpected error occurred during authentication');
        
        toast({
          title: 'Unexpected Error',
          description: 'An unexpected error occurred. Please try again.',
          type: 'error',
        });

        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, router, supabase.auth, toast]);

  const getIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-red-600" />;
    }
  };

  const getTitle = () => {
    switch (state) {
      case 'loading':
        return 'Completing Authentication...';
      case 'success':
        return 'Authentication Successful';
      case 'error':
        return 'Authentication Failed';
    }
  };

  const getDescription = () => {
    switch (state) {
      case 'loading':
        return 'Please wait while we complete your authentication.';
      case 'success':
        return 'You will be redirected to your dashboard shortly.';
      case 'error':
        return 'You will be redirected to the login page.';
    }
  };

  const getMessageColorClass = () => {
    switch (state) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getIcon()}
            </div>
            <CardTitle className="text-2xl">{getTitle()}</CardTitle>
            <p className="text-sm text-slate-600">
              {getDescription()}
            </p>
          </CardHeader>
          
          <CardContent className="text-center">
            {message && (
              <p className={`text-sm ${getMessageColorClass()}`}>
                {message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
            <p className="text-sm text-slate-600">
              Preparing authentication callback...
            </p>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}