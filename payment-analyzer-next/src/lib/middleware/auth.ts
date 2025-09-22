import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { AppError, ErrorCodes, Result } from '@/lib/utils/errors';
import { z } from 'zod';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
  emailVerified: boolean;
}

export interface AuthContext {
  user: AuthenticatedUser;
  supabase: Awaited<ReturnType<typeof createServerClient>>;
}

export interface RouteContext {
  params?: Record<string, string | string[]>;
  [key: string]: unknown;
}

/**
 * Enhanced authentication middleware with comprehensive error handling
 */
export async function authenticateApiRequest(): Promise<Result<AuthContext>> {
  try {
    const supabase = await createServerClient();
    
    // Get user with proper error handling
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return Result.failure(
        new AppError(
          'Authentication failed',
          ErrorCodes.AUTH_INVALID_CREDENTIALS,
          401,
          true,
          { originalError: authError.message }
        )
      );
    }
    
    if (!user) {
      return Result.failure(
        new AppError(
          'No authenticated user found',
          ErrorCodes.AUTH_UNAUTHORIZED,
          401
        )
      );
    }

    // Validate user session
    if (!user.email_confirmed_at) {
      return Result.failure(
        new AppError(
          'Email not verified',
          ErrorCodes.AUTH_EMAIL_NOT_VERIFIED,
          401,
          true,
          { userId: user.id }
        )
      );
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role,
      emailVerified: !!user.email_confirmed_at,
    };

    return Result.success({
      user: authenticatedUser,
      supabase,
    });

  } catch (error) {
    return Result.failure(
      new AppError(
        'Authentication system error',
        ErrorCodes.AUTH_UNAUTHORIZED,
        500,
        false,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      )
    );
  }
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Enhanced rate limiting with proper error handling
 */
export async function checkRateLimit(
  request: NextRequest,
  userId: string,
  config: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }
): Promise<Result<void>> {
  try {
    const key = `${userId}:${request.nextUrl.pathname}`;
    const now = Date.now();
    
    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
    
    const current = rateLimitStore.get(key);
    
    if (!current) {
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return Result.success(undefined);
    }
    
    if (current.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return Result.success(undefined);
    }
    
    if (current.count >= config.maxRequests) {
      return Result.failure(
        new AppError(
          'Rate limit exceeded',
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          429,
          true,
          {
            limit: config.maxRequests,
            windowMs: config.windowMs,
            resetTime: current.resetTime,
          }
        )
      );
    }
    
    current.count++;
    return Result.success(undefined);

  } catch (error) {
    // Rate limiting failure shouldn't block requests
    console.error('Rate limiting error:', error);
    return Result.success(undefined);
  }
}

/**
 * Create standardized error responses
 */
function createErrorResponse(error: AppError): NextResponse {
  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.code,
      ...(error.context && { context: error.context }),
    },
    timestamp: new Date().toISOString(),
  };

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production' && !error.isOperational) {
    response.error.message = 'Internal server error';
    delete response.error.context;
  }

  return NextResponse.json(response, {
    status: error.statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Enhanced API wrapper with comprehensive error handling
 */
export function withAuth<T extends RouteContext = RouteContext>(
  handler: (request: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T) => {
    try {
      // Authenticate request
      const authResult = await authenticateApiRequest();
      if (authResult.isFailure) {
        return createErrorResponse(authResult.error);
      }

      // Rate limiting
      const rateLimitResult = await checkRateLimit(request, authResult.data.user.id);
      if (rateLimitResult.isFailure) {
        return createErrorResponse(rateLimitResult.error);
      }

      // Call the actual handler
      return await handler(request, context, authResult.data);
      
    } catch (error) {
      console.error('API Error:', error);
      
      const appError = error instanceof AppError
        ? error
        : new AppError(
            'Internal server error',
            ErrorCodes.INTERNAL_ERROR,
            500,
            false,
            { originalError: error instanceof Error ? error.message : 'Unknown error' }
          );
      
      return createErrorResponse(appError);
    }
  };
}

/**
 * Input validation middleware
 */
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return function(
    handler: (request: NextRequest, validatedData: T, context: RouteContext, auth: AuthContext) => Promise<NextResponse>
  ) {
    return withAuth(async (request, context, auth) => {
      try {
        const body = await request.json();
        const validationResult = schema.safeParse(body);
        
        if (!validationResult.success) {
          const error = new AppError(
            'Validation failed',
            ErrorCodes.VALIDATION_INVALID_FORMAT,
            400,
            true,
            {
              validationErrors: validationResult.error.issues,
            }
          );
          return createErrorResponse(error);
        }

        return await handler(request, validationResult.data, context, auth);
      } catch (error) {
        if (error instanceof SyntaxError) {
          const appError = new AppError(
            'Invalid JSON in request body',
            ErrorCodes.VALIDATION_INVALID_FORMAT,
            400
          );
          return createErrorResponse(appError);
        }
        throw error;
      }
    });
  };
}

/**
 * CORS headers for API responses
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

/**
 * Handle OPTIONS requests for CORS
 */
export function handleOptions(): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

/**
 * API Key authentication (for future external API access)
 */
export async function authenticateApiKey(request: NextRequest): Promise<Result<{
  userId: string;
  keyName: string;
}>> {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return Result.failure(
      new AppError(
        'API key required',
        ErrorCodes.AUTH_UNAUTHORIZED,
        401,
        true,
        { message: 'Provide API key in x-api-key header or Authorization header' }
      )
    );
  }

  // In production, this would validate against a database of API keys
  return Result.failure(
    new AppError(
      'API key authentication not implemented',
      ErrorCodes.AUTH_UNAUTHORIZED,
      501,
      true,
      { message: 'Use session-based authentication' }
    )
  );
}