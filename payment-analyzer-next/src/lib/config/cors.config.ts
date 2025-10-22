/**
 * CORS Configuration
 *
 * Security: Never use wildcard (*) in production
 */

export const getCorsOrigins = (): string[] => {
  const originsEnv = process.env.ALLOWED_ORIGINS;

  if (!originsEnv) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ALLOWED_ORIGINS must be set in production');
    }
    // Development fallback
    return ['http://localhost:3000'];
  }

  return originsEnv.split(',').map(origin => origin.trim());
};

export const validateOrigin = (origin: string | null): boolean => {
  if (!origin) return false;

  const allowedOrigins = getCorsOrigins();
  return allowedOrigins.includes(origin);
};
