/**
 * Auth Callback Route Handler
 * Server-side handler for OAuth callbacks and email confirmations
 * Follows Supabase SSR best practices
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the OAuth callback from Supabase authentication
 * Exchanges the authorization code for a session and redirects the user
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Get the intended redirect destination (default to dashboard)
  let next = searchParams.get("next") ?? "/dashboard";

  // Ensure the redirect is a relative path (security measure)
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (code) {
    try {
      const supabase = await createClient();

      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Handle different environments (local vs production)
        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          // Local development - use origin directly
          return NextResponse.redirect(`${origin}${next}`);
        } else if (forwardedHost) {
          // Production with load balancer - use forwarded host
          return NextResponse.redirect(`https://${forwardedHost}${next}`);
        } else {
          // Production without load balancer
          return NextResponse.redirect(`${origin}${next}`);
        }
      } else {
        // Log the error for debugging
        console.error("Auth callback error:", error);
      }
    } catch (error) {
      console.error("Auth callback exception:", error);
    }
  }

  // Redirect to error page if no code or if exchange failed
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
