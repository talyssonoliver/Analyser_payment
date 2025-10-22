/**
 * Authentication Error Page
 * Displays user-friendly error messages when OAuth callback fails
 */

"use client";

import { AlertCircle, ArrowLeft, Home, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AuthCodeErrorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Get error details from URL if provided
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (errorDescription) {
      setErrorMessage(errorDescription);
    } else if (error) {
      setErrorMessage(error);
    } else {
      setErrorMessage("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-slate-900">Authentication Error</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 text-center">{errorMessage}</p>
          </div>

          {/* Possible Causes */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Possible causes:</h3>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>The confirmation link has expired</li>
              <li>The link has already been used</li>
              <li>There was a network error</li>
              <li>Invalid authentication code</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>

            <Button onClick={() => router.push("/")} variant="outline" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Button>

            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>

          {/* Help Text */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              If you continue to experience issues, please contact support or try signing up again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-slate-900">Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <AuthCodeErrorContent />
    </Suspense>
  );
}
