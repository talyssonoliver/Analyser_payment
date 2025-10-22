# Developer Guide - Payment Analyzer Next

**Last Updated**: December 2025
**For**: Daily Development Tasks and Workflows

This guide covers common development tasks and workflows for the Payment Analyzer Next application.

---

## Daily Development Workflow

### Morning Routine (Docker)

```bash
# 1. Start development server
cd payment-analyzer-next
pnpm docker:dev

# 2. In new terminal: Open Vitest UI
pnpm docker:test-ui

# 3. In new terminal: Watch type errors
pnpm type-check:watch

# Your development environment is now ready!
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feat/your-feature-name

# 2. Make code changes in your editor

# 3. Run checks before commit
pnpm docker:type-check    # <10s
pnpm lint                 # Check for lint errors

# 4. Commit changes
git add .
git commit -m "feat: add your feature description"

# 5. Push and create PR
git push origin feat/your-feature-name
```

---

## Essential Commands Reference

### Development Server

```bash
# Docker (Recommended - Super Fast)
pnpm docker:dev          # Start Next.js dev (port 3000)
pnpm docker:down         # Stop all services
pnpm docker:logs         # View logs
pnpm docker:shell        # Open shell in container

# Traditional (Slower on WSL)
pnpm dev                 # Standard Next.js dev
pnpm dev:turbo           # With Turbopack
pnpm dev:debug           # With debugger
```

### Type Checking & Linting

```bash
# Type Checking
pnpm docker:type-check   # Docker (< 10s)
pnpm type-check          # Direct (60s+ on WSL)
pnpm type-check:watch    # Watch mode

# Linting
pnpm lint                # Check all files
pnpm lint:fix            # Auto-fix issues
pnpm lint:css            # Check CSS
pnpm lint:css:fix        # Auto-fix CSS
```

### Testing

```bash
# Docker
pnpm docker:test         # Watch mode
pnpm docker:test-ui      # UI mode (port 51204)

# Direct
pnpm test                # Interactive watch mode
pnpm test:run            # Run once
pnpm test:coverage       # Generate coverage
pnpm test:ui             # Vitest UI
```

### Database

```bash
# Migrations
pnpm db:migrate          # Run pending migrations
pnpm db:maintenance      # Run maintenance tasks

# Direct SQL (from Docker shell)
pnpm docker:shell
psql $DATABASE_URL       # Connect to database
```

---

## Common Development Tasks

### Add a New Component

```bash
# 1. Create component file
src/components/ui/my-component.tsx

# 2. Write component following patterns
# - Use forwardRef for ref forwarding
# - TypeScript interface extending HTML attributes
# - class-variance-authority for variants
# - cn() utility for class composition

# 3. Export from index
# Add to src/components/ui/index.ts

# 4. Write tests
tests/unit/components/ui/my-component.test.tsx

# 5. Verify
pnpm docker:type-check
pnpm lint
pnpm test my-component
```

### Add a New API Endpoint

```bash
# 1. Create route handler
src/app/api/my-endpoint/route.ts

# 2. Implement with authentication
import { withAuth } from '@/lib/middleware/auth';

export const GET = withAuth(async (request, context, auth) => {
  // Your logic
});

# 3. Add to API docs
docs/API.md

# 4. Write tests
tests/integration/api/my-endpoint.test.ts

# 5. Verify
pnpm docker:type-check
pnpm test my-endpoint
```

### Add a Domain Entity

```bash
# 1. Create entity file
src/lib/domain/entities/my-entity.ts

# 2. Implement with:
# - Private fields
# - Getters (read-only access)
# - Business methods
# - toJSON/fromJSON

# 3. Write unit tests
tests/unit/domain/entities/my-entity.test.ts

# 4. Update repository if needed
src/lib/repositories/...

# 5. Verify
pnpm test my-entity
```

### Update Business Logic

```bash
# 1. Locate the constant/rule
# Check: src/lib/constants.ts
# Check: src/lib/domain/entities/payment-rules.ts

# 2. Update value/logic

# 3. Update tests to match
tests/unit/domain/services/payment-calculator.test.ts

# 4. Verify ALL tests pass
pnpm test:run

# 5. Document change
docs/BUSINESS_LOGIC.md
```

---

## Git Workflow

### Branch Naming

```
feat/description     # New features
fix/description      # Bug fixes
refactor/description # Code refactoring
docs/description     # Documentation
test/description     # Test additions
```

### Commit Messages

Follow Conventional Commits:

```
feat: add user profile page
fix: resolve payment calculation error (CRITICAL)
refactor: extract file upload logic to custom hook
docs: update API documentation
test: add tests for payment calculator
```

**Severity Tags (optional):**
- `(CRITICAL)` - Production-breaking issues
- `(MEDIUM)` - Important but not critical
- `(PHASE X)` - Part of phased refactoring

### Pull Request Workflow

```bash
# 1. Ensure tests pass
pnpm docker:type-check
pnpm lint
pnpm test:run

# 2. Commit your changes
git add .
git commit -m "feat: your feature description"

# 3. Push to remote
git push origin feat/your-feature

# 4. Create PR on GitHub
# Include:
# - Summary of changes
# - Testing performed
# - Screenshots (if UI changes)

# 5. Address review comments

# 6. Merge when approved
```

---

## Debugging

### Debug in VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### Debug with Docker

```bash
# Access running container
pnpm docker:shell

# View logs
pnpm docker:logs

# Inspect specific service
docker logs payment-analyzer-next-app-1 -f

# Debug tests
pnpm docker:test-ui
# Open http://localhost:51204
```

### Common Debug Tasks

```bash
# Check environment variables
pnpm docker:shell
env | grep NEXT

# Verify database connection
pnpm docker:shell
psql $DATABASE_URL -c "SELECT version();"

# Clear Next.js cache
rm -rf .next

# Rebuild Docker (if broken)
pnpm docker:clean
pnpm docker:build --no-cache
```

---

## Performance Optimization

### Check Bundle Size

```bash
pnpm build:analyze

# Opens bundle analyzer
# Check for:
# - Large dependencies
# - Duplicate code
# - Unused imports
```

### Profile Performance

```bash
# Build with profiling
pnpm build:profile

# Check compilation times
# Identify slow routes
```

### Optimize Images

- Use Next.js `<Image>` component
- Provide width/height
- Use appropriate formats (WebP)

### Code Splitting

```typescript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>
});
```

---

## Database Management

### Run Migrations

```bash
# Check migration status
pnpm docker:shell
psql $DATABASE_URL -c "SELECT * FROM supabase_migrations.schema_migrations;"

# Run pending migrations
pnpm db:migrate

# Create new migration
# 1. Create file in supabase/migrations/
# 2. Name: XXX_description.sql
# 3. Run: pnpm db:migrate
```

### Query Database

```bash
# Access PostgreSQL
pnpm docker:shell
psql $DATABASE_URL

# Common queries
SELECT * FROM profiles LIMIT 10;
SELECT * FROM analyses WHERE user_id = 'uuid';
\dt  # List tables
\d table_name  # Describe table
```

### Backup/Restore

```bash
# Backup (from Docker shell)
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Troubleshooting Guide

### Tests Failing

```bash
# 1. Check specific test
pnpm test tests/path/to/test.test.ts

# 2. Update snapshots if needed
pnpm test -u

# 3. Clear test cache
rm -rf node_modules/.vitest

# 4. Rebuild if in Docker
pnpm docker:clean
pnpm docker:build
```

### Type Errors

```bash
# 1. Run type check
pnpm docker:type-check

# 2. Check specific file
pnpm exec tsc --noEmit src/path/to/file.ts

# 3. Clear TypeScript cache
rm -rf .next
rm -rf .tsbuildinfo

# 4. Restart IDE
```

### Hot Reload Not Working

```bash
# Docker solution
# Ensure polling enabled in docker-compose.dev.yml:
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true

# Restart
pnpm docker:down
pnpm docker:dev
```

### "Out of Memory" Errors

```bash
# Increase Node.js memory
# Edit docker-compose.dev.yml:
environment:
  - NODE_OPTIONS=--max-old-space-size=8192  # 8GB

# Or run directly:
NODE_OPTIONS=--max-old-space-size=8192 pnpm dev
```

---

## Code Quality Checklist

Before committing code, ensure:

- ✅ TypeScript check passes (`pnpm docker:type-check`)
- ✅ ESLint passes (`pnpm lint`)
- ✅ Tests pass (`pnpm test:run`)
- ✅ No console.log statements (remove or use proper logging)
- ✅ Code formatted consistently
- ✅ Comments added for complex logic
- ✅ No TODO comments (create issues instead)
- ✅ Imports organized
- ✅ No unused variables (prefix with `_` if intentional)

---

## Quick Reference Card

```bash
# DEVELOPMENT
pnpm docker:dev          # Start dev server
pnpm docker:shell        # Container shell

# VERIFICATION
pnpm docker:type-check   # Type check (<10s)
pnpm lint                # Lint
pnpm docker:test         # Tests

# DATABASE
pnpm db:migrate          # Migrations

# BUILD
pnpm build               # Production build
pnpm build:analyze       # Bundle analysis

# CLEANUP
pnpm docker:down         # Stop services
pnpm docker:clean        # Remove volumes
```

---

**For More Details:**
- Docker Setup → [DOCKER.md](./DOCKER.md)
- Testing Guide → [TESTING.md](./TESTING.md)
- Code Conventions → [CONVENTIONS.md](./CONVENTIONS.md)
- API Reference → [API.md](./API.md)
