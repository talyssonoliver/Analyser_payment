#!/bin/bash

################################################################################
# AUTOMATED SECURITY REMEDIATION SCRIPT
# Payment Analyzer Next - Security Audit 2025-10-22
#
# This script automates the remediation of security issues identified in the
# comprehensive security audit. It addresses 18 of 32 identified issues.
#
# USAGE: bash docs/AUTOMATED_REMEDIATION.sh [--dry-run]
#
# WARNING: This script will make changes to your codebase. Review all changes
# before committing. Use --dry-run to preview changes without applying them.
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}\n"
fi

# Change to project root
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Security Audit Automated Remediation${NC}"
echo -e "${BLUE}  Payment Analyzer Next${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

################################################################################
# PHASE 1: DEPENDENCY UPDATES
################################################################################

echo -e "${GREEN}━━━ Phase 1: Dependency Updates ━━━${NC}\n"

# DEP-001: Fix CVE-2025-62522 in Vite
echo -e "${BLUE}[DEP-001]${NC} Fixing CVE-2025-62522: Updating Vite to 7.1.11..."
if [ "$DRY_RUN" = false ]; then
    pnpm add -D vite@7.1.11
    echo -e "${GREEN}✓ Vite updated to 7.1.11${NC}\n"
else
    echo -e "${YELLOW}  Would run: pnpm add -D vite@7.1.11${NC}\n"
fi

# DEP-003: Remove deprecated @types/uuid
echo -e "${BLUE}[DEP-003]${NC} Removing deprecated @types/uuid..."
if [ "$DRY_RUN" = false ]; then
    pnpm remove @types/uuid
    echo -e "${GREEN}✓ @types/uuid removed${NC}\n"
else
    echo -e "${YELLOW}  Would run: pnpm remove @types/uuid${NC}\n"
fi

# DEP-002: Update pdfjs-dist
echo -e "${BLUE}[DEP-002]${NC} Updating pdfjs-dist to latest..."
if [ "$DRY_RUN" = false ]; then
    pnpm update pdfjs-dist@latest
    echo -e "${GREEN}✓ pdfjs-dist updated${NC}\n"
else
    echo -e "${YELLOW}  Would run: pnpm update pdfjs-dist@latest${NC}\n"
fi

# DEP-004: Update critical production dependencies
echo -e "${BLUE}[DEP-004]${NC} Updating critical production dependencies..."
if [ "$DRY_RUN" = false ]; then
    pnpm update @supabase/supabase-js@^2.76.1
    echo -e "${GREEN}✓ Supabase client updated${NC}\n"
else
    echo -e "${YELLOW}  Would run: pnpm update @supabase/supabase-js@^2.76.1${NC}\n"
fi

# Update safe patch/minor versions
echo -e "${BLUE}[DEP-004]${NC} Updating safe patch/minor versions..."
if [ "$DRY_RUN" = false ]; then
    pnpm update \
        @biomejs/biome \
        @tailwindcss/postcss \
        @tanstack/react-query \
        @testing-library/jest-dom \
        dotenv \
        framer-motion \
        jsdom \
        lightningcss \
        lucide-react \
        react-day-picker \
        tailwindcss \
        typescript \
        cross-env \
        eslint \
        playwright \
        react \
        react-dom \
        react-hook-form \
        recharts \
        @types/node \
        @types/react \
        @types/react-dom
    echo -e "${GREEN}✓ Safe packages updated${NC}\n"
else
    echo -e "${YELLOW}  Would run: pnpm update <24 packages>${NC}\n"
fi

################################################################################
# PHASE 2: REPOSITORY CLEANUP
################################################################################

echo -e "${GREEN}━━━ Phase 2: Repository Cleanup ━━━${NC}\n"

# REPO-003: Remove backup files
echo -e "${BLUE}[REPO-003]${NC} Removing backup files..."
if [ "$DRY_RUN" = false ]; then
    find . -name "*.backup" -type f -not -path "./node_modules/*" -delete
    echo -e "${GREEN}✓ Backup files removed${NC}\n"
else
    echo -e "${YELLOW}  Would delete:${NC}"
    find . -name "*.backup" -type f -not -path "./node_modules/*"
    echo ""
fi

# REPO-002: Organize documentation
echo -e "${BLUE}[REPO-002]${NC} Organizing documentation files..."
if [ "$DRY_RUN" = false ]; then
    mkdir -p docs/archive/fixes

    # Move fix documentation to archive
    for file in ../*_FIX.md ../*_ANALYSIS.md ../*_SUMMARY.md ../*_DEBUG.md; do
        if [ -f "$file" ]; then
            mv "$file" docs/archive/fixes/ 2>/dev/null || true
        fi
    done

    # Move legacy architecture doc
    if [ -f ../C4-ARCHITECTURE-MODEL-LEGACY.md ]; then
        mv ../C4-ARCHITECTURE-MODEL-LEGACY.md docs/archive/
    fi

    echo -e "${GREEN}✓ Documentation organized${NC}\n"
else
    echo -e "${YELLOW}  Would move root MD files to docs/archive/fixes/${NC}\n"
fi

# REPO-004: Delete stale branches (requires user confirmation)
echo -e "${BLUE}[REPO-004]${NC} Checking for stale branches..."
STALE_BRANCHES=$(git branch --merged master | grep -v "master\|main\|^\*" || true)
if [ -n "$STALE_BRANCHES" ]; then
    echo -e "${YELLOW}  Found merged branches:${NC}"
    echo "$STALE_BRANCHES"
    if [ "$DRY_RUN" = false ]; then
        echo -e "${YELLOW}  To delete these branches, run:${NC}"
        echo "  git branch -d development_dashboard refactor/analysis-components-cleanup"
    else
        echo -e "${YELLOW}  Would suggest deletion of merged branches${NC}"
    fi
else
    echo -e "${GREEN}✓ No stale branches found${NC}"
fi
echo ""

################################################################################
# PHASE 3: CODE QUALITY IMPROVEMENTS
################################################################################

echo -e "${GREEN}━━━ Phase 3: Code Quality Improvements ━━━${NC}\n"

# QUAL-001: Fix XSS vulnerability in export-utils.ts
echo -e "${BLUE}[QUAL-001]${NC} Installing DOMPurify for HTML sanitization..."
if [ "$DRY_RUN" = false ]; then
    pnpm add dompurify
    pnpm add -D @types/dompurify
    echo -e "${GREEN}✓ DOMPurify installed${NC}"
    echo -e "${YELLOW}  ⚠ MANUAL ACTION REQUIRED:${NC}"
    echo -e "${YELLOW}    Update src/lib/utils/export-utils.ts:294${NC}"
    echo -e "${YELLOW}    Change: printWindow.document.body.innerHTML = htmlContent${NC}"
    echo -e "${YELLOW}    To: printWindow.document.body.innerHTML = DOMPurify.sanitize(htmlContent)${NC}\n"
else
    echo -e "${YELLOW}  Would install: pnpm add dompurify @types/dompurify${NC}\n"
fi

# Create logger configuration if not exists
echo -e "${BLUE}[QUAL-002]${NC} Setting up structured logging..."
if [ "$DRY_RUN" = false ]; then
    if [ ! -f "src/lib/utils/logger.config.ts" ]; then
        cat > "src/lib/utils/logger.config.ts" << 'EOF'
/**
 * Logger Configuration
 *
 * Centralized logging configuration for the application.
 * Replaces console.log statements with structured logging.
 */

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export const shouldLog = (level: string): boolean => {
  if (typeof window === 'undefined') {
    // Server-side: only log in development
    return process.env.NODE_ENV === 'development';
  }
  // Client-side: respect localStorage setting
  return localStorage.getItem('enableDebugLogging') === 'true' ||
         process.env.NODE_ENV === 'development';
};
EOF
        echo -e "${GREEN}✓ Logger configuration created${NC}"
    fi

    echo -e "${YELLOW}  ⚠ MANUAL ACTION REQUIRED:${NC}"
    echo -e "${YELLOW}    Replace 673 console.log statements with logger.debug()${NC}"
    echo -e "${YELLOW}    See: src/lib/utils/logger.ts${NC}\n"
else
    echo -e "${YELLOW}  Would create: src/lib/utils/logger.config.ts${NC}\n"
fi

################################################################################
# PHASE 4: SECURITY CONFIGURATIONS
################################################################################

echo -e "${GREEN}━━━ Phase 4: Security Configurations ━━━${NC}\n"

# Create .env.example with security documentation
echo -e "${BLUE}[SEC-001-004]${NC} Updating .env.example with security guidelines..."
if [ "$DRY_RUN" = false ]; then
    cat >> ".env.example" << 'EOF'

# ═══════════════════════════════════════════════════════════
# SECURITY NOTES
# ═══════════════════════════════════════════════════════════
#
# 🔒 NEVER commit .env.local to git
# 🔒 Rotate all keys before deploying to production
# 🔒 Use different keys for dev/staging/production
# 🔒 Service role key should NEVER be exposed to client
# 🔒 Set file permissions: chmod 600 .env.local
#
# To rotate Supabase keys:
# 1. Go to Supabase Dashboard → Settings → API
# 2. Generate new keys
# 3. Update .env.local
# 4. Redeploy all services
# 5. Audit access logs for unauthorized usage
#
# To generate NextAuth secret:
# openssl rand -base64 32
#
# ═══════════════════════════════════════════════════════════

# CORS Configuration (use comma-separated list)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting (requests per time window)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
EOF
    echo -e "${GREEN}✓ .env.example updated with security guidelines${NC}\n"
else
    echo -e "${YELLOW}  Would update: .env.example${NC}\n"
fi

# SEC-005: Add CORS configuration template
echo -e "${BLUE}[SEC-005]${NC} Creating CORS configuration template..."
if [ "$DRY_RUN" = false ]; then
    cat > "src/lib/config/cors.config.ts" << 'EOF'
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
EOF
    echo -e "${GREEN}✓ CORS configuration created${NC}"
    echo -e "${YELLOW}  ⚠ MANUAL ACTION REQUIRED:${NC}"
    echo -e "${YELLOW}    Update src/lib/middleware/auth.ts to use validateOrigin()${NC}\n"
else
    echo -e "${YELLOW}  Would create: src/lib/config/cors.config.ts${NC}\n"
fi

# SEC-008, SEC-009: Create security headers template
echo -e "${BLUE}[SEC-008, SEC-009]${NC} Creating security headers configuration..."
if [ "$DRY_RUN" = false ]; then
    cat > "src/lib/config/security-headers.config.ts" << 'EOF'
/**
 * Security Headers Configuration
 *
 * Implements security headers for SOC 2 CC6.7 compliance
 */

export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // HTTP Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export const applySecurityHeaders = (headers: Headers): void => {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
};
EOF
    echo -e "${GREEN}✓ Security headers configuration created${NC}"
    echo -e "${YELLOW}  ⚠ MANUAL ACTION REQUIRED:${NC}"
    echo -e "${YELLOW}    Import and apply in middleware.ts${NC}\n"
else
    echo -e "${YELLOW}  Would create: src/lib/config/security-headers.config.ts${NC}\n"
fi

# SEC-007: Create redirect validation utility
echo -e "${BLUE}[SEC-007]${NC} Creating redirect validation utility..."
if [ "$DRY_RUN" = false ]; then
    cat > "src/lib/utils/redirect-validator.ts" << 'EOF'
/**
 * Redirect Validation Utility
 *
 * Prevents open redirect vulnerabilities (CWE-601)
 */

const ALLOWED_REDIRECTS = [
  '/dashboard',
  '/analysis',
  '/history',
  '/settings',
  '/reports',
  '/profile'
];

export const validateRedirectPath = (path: string | null): string => {
  if (!path) return '/dashboard';

  // Ensure path is internal (starts with /)
  if (!path.startsWith('/')) return '/dashboard';

  // Ensure no protocol (prevents external redirects)
  if (path.includes('://')) return '/dashboard';

  // Check against allowlist
  const isAllowed = ALLOWED_REDIRECTS.some(allowed =>
    path.startsWith(allowed)
  );

  return isAllowed ? path : '/dashboard';
};
EOF
    echo -e "${GREEN}✓ Redirect validation utility created${NC}"
    echo -e "${YELLOW}  ⚠ MANUAL ACTION REQUIRED:${NC}"
    echo -e "${YELLOW}    Update src/app/(auth)/callback/page.tsx:113${NC}"
    echo -e "${YELLOW}    Use: router.push(validateRedirectPath(redirectTo))${NC}\n"
else
    echo -e "${YELLOW}  Would create: src/lib/utils/redirect-validator.ts${NC}\n"
fi

# FILE-002: Create filename sanitization utility
echo -e "${BLUE}[FILE-002]${NC} Creating filename sanitization utility..."
if [ "$DRY_RUN" = false ]; then
    cat > "src/lib/utils/filename-sanitizer.ts" << 'EOF'
/**
 * Filename Sanitization Utility
 *
 * Prevents path traversal attacks (CWE-22)
 */

export const sanitizeFilename = (filename: string): string => {
  return filename
    // Remove path separators
    .replace(/[/\\]/g, '_')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Replace dangerous characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove consecutive dots (path traversal)
    .replace(/\.{2,}/g, '.')
    // Ensure it doesn't start with a dot
    .replace(/^\.+/, '')
    // Limit length
    .substring(0, 255)
    // Ensure not empty
    || 'unnamed_file';
};

export const validateFileExtension = (
  filename: string,
  allowedExtensions: string[]
): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
};
EOF
    echo -e "${GREEN}✓ Filename sanitization utility created${NC}"
    echo -e "${YELLOW}  ⚠ MANUAL ACTION REQUIRED:${NC}"
    echo -e "${YELLOW}    Use sanitizeFilename() in file upload handlers${NC}\n"
else
    echo -e "${YELLOW}  Would create: src/lib/utils/filename-sanitizer.ts${NC}\n"
fi

################################################################################
# PHASE 5: VERIFICATION
################################################################################

echo -e "${GREEN}━━━ Phase 5: Verification ━━━${NC}\n"

if [ "$DRY_RUN" = false ]; then
    # Run vulnerability audit
    echo -e "${BLUE}[VERIFY]${NC} Running dependency audit..."
    pnpm audit || echo -e "${YELLOW}⚠ Some vulnerabilities remain (manual review required)${NC}"
    echo ""

    # Run type check
    echo -e "${BLUE}[VERIFY]${NC} Running type check..."
    if pnpm exec tsc --noEmit; then
        echo -e "${GREEN}✓ Type check passed${NC}\n"
    else
        echo -e "${YELLOW}⚠ Type errors detected (may be expected)${NC}\n"
    fi

    # Run tests
    echo -e "${BLUE}[VERIFY]${NC} Running tests..."
    if pnpm test:run --passWithNoTests; then
        echo -e "${GREEN}✓ Tests passed${NC}\n"
    else
        echo -e "${YELLOW}⚠ Some tests failed (manual review required)${NC}\n"
    fi
fi

################################################################################
# SUMMARY
################################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Remediation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${GREEN}✓ Automated Fixes Applied:${NC}"
echo "  • DEP-001: Vite CVE fixed"
echo "  • DEP-002: pdfjs-dist updated"
echo "  • DEP-003: Deprecated package removed"
echo "  • DEP-004: 24 packages updated"
echo "  • REPO-002: Documentation organized"
echo "  • REPO-003: Backup files removed"
echo "  • SEC-005: CORS config template created"
echo "  • SEC-007: Redirect validator created"
echo "  • SEC-008/009: Security headers config created"
echo "  • FILE-002: Filename sanitizer created"
echo "  • QUAL-001: DOMPurify installed"
echo ""

echo -e "${YELLOW}⚠ Manual Actions Required:${NC}"
echo "  1. CRITICAL: Rotate all credentials in .env.local (SEC-001-004)"
echo "  2. Set ALLOWED_ORIGINS environment variable (SEC-005)"
echo "  3. Apply security headers in middleware.ts (SEC-008, SEC-009)"
echo "  4. Update auth callback to validate redirects (SEC-007)"
echo "  5. Apply withAuth middleware to all API routes (SEC-006)"
echo "  6. Implement Redis-based rate limiting (SEC-006)"
echo "  7. Sanitize HTML in export-utils.ts:294 (QUAL-001)"
echo "  8. Replace 673 console.log with logger (QUAL-002)"
echo "  9. Split large files (QUAL-003, QUAL-004)"
echo " 10. Add password strength validation (AUTH-001)"
echo " 11. Implement account lockout (AUTH-002)"
echo " 12. Add audit logging (COMP-001)"
echo " 13. Commit changes: git add . && git commit -m 'security: apply automated remediation'"
echo ""

echo -e "${BLUE}📋 Next Steps:${NC}"
echo "  1. Review all changes before committing"
echo "  2. Update .env.local with rotated credentials"
echo "  3. Complete manual actions listed above"
echo "  4. Run full test suite: pnpm docker:test"
echo "  5. Review docs/SECURITY_AUDIT_REPORT.json for detailed guidance"
echo "  6. Schedule follow-up audit in 30 days"
echo ""

echo -e "${GREEN}Remediation script completed!${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}No changes were made (dry run mode)${NC}"
    echo -e "${YELLOW}Run without --dry-run to apply changes${NC}"
fi
echo ""

exit 0
