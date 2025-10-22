# API Authentication Implementation Guide

## Quick Reference: Files Modified

### ✅ Already Protected with `withAuth`
1. `/src/app/api/analysis/route.ts` - GET, POST
2. `/src/app/api/analysis/[id]/route.ts` - GET, DELETE, PATCH
3. `/src/app/api/export/[id]/route.ts` - GET (CRITICAL FIX)

### ⚠️ Manual Auth (Pending Migration)
4. `/src/app/api/analysis/[id]/update/route.ts` - POST
5. `/src/app/api/analysis/[id]/merge/route.ts` - POST
6. `/src/app/api/analysis/upload/route.ts` - POST, GET, DELETE
7. `/src/app/api/analysis/create-with-files/route.ts` - POST
8. `/src/app/api/export/route.ts` - POST, GET
9. `/src/app/api/preferences/route.ts` - GET, PUT
10. `/src/app/api/migration/route.ts` - POST, PATCH, GET

### ✅ Public (Justified)
11. `/src/app/api/health/route.ts` - GET (Docker health checks)

---

## Step-by-Step Migration Instructions

### File: `/src/app/api/analysis/[id]/update/route.ts`

**Current Code (Lines 386-397):**
```typescript
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // ...
```

**Updated Code:**
```typescript
import { withAuth, type AuthContext, type RouteContext } from "@/lib/middleware/auth";

export const POST = withAuth(async (request: NextRequest, context: RouteContext, auth: AuthContext) => {
  try {
    const params = context.params as { id: string };
    const { id } = params;
    // Use auth.user.id instead of user.id
    // Use auth.supabase instead of createClient()
```

**Changes:**
1. Add import: `import { withAuth, type AuthContext, type RouteContext } from "@/lib/middleware/auth";`
2. Remove: `import { createClient } from "@/lib/supabase/server";`
3. Change `export async function POST` to `export const POST = withAuth(async`
4. Add params: `(request: NextRequest, context: RouteContext, auth: AuthContext)`
5. Get params from context: `const params = context.params as { id: string };`
6. Remove manual auth code (lines 388-396)
7. Replace `user.id` with `auth.user.id`
8. Replace `supabase` with `auth.supabase`

---

### File: `/src/app/api/analysis/[id]/merge/route.ts`

**Current Code (Lines 459-470):**
```typescript
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated Code:**
```typescript
import { withAuth, type AuthContext, type RouteContext } from "@/lib/middleware/auth";

export const POST = withAuth(async (request: NextRequest, context: RouteContext, auth: AuthContext) => {
  try {
    const params = context.params as { id: string };
    const { id } = params.id;
```

---

### File: `/src/app/api/analysis/upload/route.ts`

This file has 3 methods: POST, GET, DELETE

**Current POST (Lines 261-272):**
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated POST:**
```typescript
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
    // Direct use of auth.user.id
```

**Current GET (Lines 340-351):**
```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated GET:**
```typescript
export const GET = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
```

**Current DELETE (Lines 394-405):**
```typescript
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated DELETE:**
```typescript
export const DELETE = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
```

---

### File: `/src/app/api/analysis/create-with-files/route.ts`

**Current Code (Lines 17-28):**
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
```

**Updated Code:**
```typescript
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
    const userId = auth.user.id;
```

**Note:** Keep OPTIONS method public:
```typescript
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
```

---

### File: `/src/app/api/export/route.ts`

**Current POST (Lines 161-172):**
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated POST:**
```typescript
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
    // Use auth.user.id
```

**Current GET (Lines 230-241):**
```typescript
export async function GET(/* request: NextRequest */) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated GET:**
```typescript
export const GET = withAuth(async (_request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
```

---

### File: `/src/app/api/preferences/route.ts`

**Current GET (Lines 59-70):**
```typescript
export async function GET(/* request: NextRequest */) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated GET:**
```typescript
export const GET = withAuth(async (_request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
    const supabase = auth.supabase;
```

**Current PUT (Lines 114-125):**
```typescript
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated PUT:**
```typescript
export const PUT = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
    const supabase = auth.supabase;
```

---

### File: `/src/app/api/migration/route.ts`

**Current POST (Lines 273-284):**
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated POST:**
```typescript
export const POST = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
```

**Current PATCH (Lines 362-373):**
```typescript
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated PATCH:**
```typescript
export const PATCH = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
```

**Current GET (Lines 412-423):**
```typescript
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
```

**Updated GET:**
```typescript
export const GET = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  try {
```

---

## Common Patterns

### Pattern 1: Simple Route (No Params)
```typescript
// BEFORE
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... use user.id
}

// AFTER
export const GET = withAuth(async (request: NextRequest, _context: RouteContext, auth: AuthContext) => {
  // ... use auth.user.id
});
```

### Pattern 2: Route with Params
```typescript
// BEFORE
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // ...
}

// AFTER
export const GET = withAuth(async (request: NextRequest, context: RouteContext, auth: AuthContext) => {
  const params = context.params as Promise<{ id: string }>;
  const { id } = await params;
  // ... use auth.user.id
});
```

### Pattern 3: Supabase Access
```typescript
// BEFORE
const supabase = await createServerClient();
const { data } = await supabase.from('table').select();

// AFTER
const { data } = await auth.supabase.from('table').select();
```

---

## Testing After Migration

### 1. Run Type Check
```bash
pnpm exec tsc --noEmit
```

### 2. Test Authentication
```bash
# Should return 401
curl http://localhost:3000/api/analysis

# Should work
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/analysis
```

### 3. Test Rate Limiting
```bash
# Run 101 requests
for i in {1..101}; do
  curl -H "Authorization: Bearer <token>" http://localhost:3000/api/analysis
done
# Last request should return 429
```

### 4. Test Email Verification
```bash
# With unverified email should return 401
curl -H "Authorization: Bearer <unverified-token>" http://localhost:3000/api/analysis
```

---

## Verification Checklist

After migrating each file:

- [ ] Added `withAuth` import
- [ ] Removed manual auth code
- [ ] Changed function export to const export
- [ ] Updated function signature (request, context, auth)
- [ ] Replaced `user.id` with `auth.user.id`
- [ ] Replaced `supabase` with `auth.supabase` where needed
- [ ] Updated params access for parameterized routes
- [ ] Tested endpoint manually
- [ ] No TypeScript errors
- [ ] No runtime errors

---

## Benefits Summary

### Code Quality
- **Before:** 11 files, ~250 lines of duplicate auth code
- **After:** Centralized auth, ~11 lines total
- **Reduction:** 96% less boilerplate

### Security
- **Before:** Easy to forget auth on new endpoints
- **After:** Auth required by default
- **Rate Limiting:** Automatic on all protected routes
- **Email Verification:** Enforced on all protected routes

### Maintainability
- **Before:** 11 places to update auth logic
- **After:** 1 place to update auth logic
- **Testing:** Easier to test centralized auth

---

## Timeline Estimate

| Task | Time | Priority |
|------|------|----------|
| Migrate `/api/analysis/[id]/update` | 10 min | High |
| Migrate `/api/analysis/[id]/merge` | 10 min | High |
| Migrate `/api/analysis/upload` | 15 min | High |
| Migrate `/api/analysis/create-with-files` | 10 min | High |
| Migrate `/api/export` | 10 min | Medium |
| Migrate `/api/preferences` | 10 min | Medium |
| Migrate `/api/migration` | 15 min | Low |
| Testing | 30 min | High |
| **Total** | **2 hours** | |

---

## Rollback Plan

If issues arise:

1. **Revert git changes:**
   ```bash
   git checkout HEAD -- src/app/api/
   ```

2. **Manual auth still works** - All routes have either:
   - `withAuth` (new, secure)
   - Manual auth (old, still secure)

3. **No functionality loss** - Only improvement in security and code quality

---

## Support

For questions or issues:
1. Review the audit report: `API_AUTHENTICATION_AUDIT_REPORT.md`
2. Check middleware docs: `/src/lib/middleware/auth.ts`
3. Reference existing implementation: `/src/app/api/analysis/route.ts`

---

**Last Updated:** 2025-10-22
**Implementation Status:** 3/11 files migrated (27%)
**Remaining Work:** 8 files, ~2 hours estimated
