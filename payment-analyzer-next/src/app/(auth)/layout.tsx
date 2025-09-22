/**
 * Auth Layout
 * Layout for authentication pages (login, signup, reset password)
 */

import { Card, CardContent } from '@/components/ui';

export default function AuthLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Payment Analyzer
          </h1>
          <p className="text-slate-600">
            Professional settlement analysis system
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-xl">
          <CardContent className="p-6">
            {children}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500">
            © 2024 Payment Analyzer Professional. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}