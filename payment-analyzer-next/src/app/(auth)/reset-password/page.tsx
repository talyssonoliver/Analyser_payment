/**
 * Reset Password Page
 * Password reset request and new password form
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button, Input, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, updatePassword, isLoading } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'request' | 'update'>('request');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [requestForm, setRequestForm] = useState({
    email: '',
  });

  const [updateForm, setUpdateForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if we have reset tokens in URL (coming from email link)
  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      setMode('update');
    }
  }, [searchParams]);

  const validateRequestForm = () => {
    const newErrors: Record<string, string> = {};

    if (!requestForm.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestForm.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateUpdateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!updateForm.password) {
      newErrors.password = 'Password is required';
    } else if (updateForm.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(updateForm.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!updateForm.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (updateForm.password !== updateForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateRequestForm()) {
      return;
    }

    const { error } = await resetPassword(requestForm.email);
    
    if (error) {
      toast({
        title: 'Reset Request Failed',
        description: error,
        type: 'error',
      });
    } else {
      toast({
        title: 'Reset Link Sent',
        description: 'Check your email for password reset instructions.',
        type: 'success',
      });
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateUpdateForm()) {
      return;
    }

    const { error } = await updatePassword(updateForm.password, updateForm.confirmPassword);
    
    if (error) {
      toast({
        title: 'Password Update Failed',
        description: error,
        type: 'error',
      });
    } else {
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
        type: 'success',
      });
      router.push('/login');
    }
  };

  const handleRequestChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setRequestForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleUpdateChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdateForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (mode === 'request') {
    return (
      <>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <p className="text-sm text-slate-600">
            Enter your email to receive password reset instructions
          </p>
        </CardHeader>

        <form onSubmit={handleRequestSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={requestForm.email}
                onChange={handleRequestChange('email')}
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            isLoading={isLoading}
          >
            <Mail className="w-4 h-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </>
    );
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <p className="text-sm text-slate-600">
          Enter your new password below
        </p>
      </CardHeader>

      <form onSubmit={handleUpdateSubmit} className="space-y-4">
        {/* Password Input */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-700">
            New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={updateForm.password}
              onChange={handleUpdateChange('password')}
              className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
              disabled={isLoading}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
            Confirm New Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={updateForm.confirmPassword}
              onChange={handleUpdateChange('confirmPassword')}
              className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          isLoading={isLoading}
        >
          <Lock className="w-4 h-4 mr-2" />
          {isLoading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </>
  );
}

function LoadingFallback() {
  return (
    <CardHeader className="text-center">
      <div className="flex justify-center mb-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <CardTitle className="text-2xl">Loading...</CardTitle>
      <p className="text-sm text-slate-600">
        Preparing password reset form...
      </p>
    </CardHeader>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}