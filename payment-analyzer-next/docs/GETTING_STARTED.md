# Getting Started with Payment Analyzer Next

**Last Updated**: December 2025
**Estimated Setup Time**: 30-45 minutes (first time)
**Recommended Approach**: Docker-based development

This guide will help you set up your development environment and start working with the Payment Analyzer Next application.

---

## Prerequisites

### Required Software

1. **Node.js 20+** 
   - Download: https://nodejs.org/
   - Verify: `node --version` (should show v20.x.x or higher)

2. **pnpm 8+** (Package manager - NOT npm or yarn)
   - Install: `npm install -g pnpm` or `corepack enable`
   - Verify: `pnpm --version` (should show 8.x.x or higher)

3. **Docker Desktop** (Recommended for optimal performance)
   - Download: https://www.docker.com/products/docker-desktop
   - Verify: `docker --version` and `docker-compose --version`

4. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

### Optional (but Recommended)

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

---

## Quick Start (Docker - Recommended)

### Step 1: Clone Repository

```bash
cd /path/to/your/projects
git clone <repository-url>
cd payment-analyzer-next
```

### Step 2: Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Build Docker Image

```bash
# First-time build (takes 5-10 minutes)
pnpm docker:build

# This builds the development image with:
# - Node.js 20 Alpine
# - pnpm + dependencies
# - Development tools
```

### Step 4: Start Development Server

```bash
# Start the dev server
pnpm docker:dev

# Server will be available at:
# http://localhost:3000
```

### Step 5: Verify Setup

```bash
# In a new terminal, run type check (should be <10s)
pnpm docker:type-check

# Run tests
pnpm docker:test

# Open Vitest UI
pnpm docker:test-ui
# Visit: http://localhost:51204
```

**✅ If all commands succeed, you're ready to develop!**

---

## Traditional Setup (No Docker)

If you cannot use Docker, follow these steps:

### Step 1-2: Same as Docker (clone + environment)

### Step 3: Install Dependencies

```bash
cd payment-analyzer-next

# Install all dependencies (may take 5+ minutes on WSL)
pnpm install
```

### Step 4: Start Development Server

```bash
# Start Next.js dev server
pnpm dev

# Server available at: http://localhost:3000
```

### Step 5: Verify

```bash
# Type checking (may take 60+ seconds on WSL)
pnpm type-check

# Run tests
pnpm test

# Lint
pnpm lint
```

⚠️ **Note**: Traditional setup on WSL (/mnt/c/) is significantly slower than Docker.

---

## Database Setup (Supabase)

### Option 1: Use Existing Supabase Project

1. Go to https://supabase.com/
2. Create new project or use existing
3. Copy URL and keys to `.env.local`
4. Run migrations:
   ```bash
   # With Docker
   docker-compose -f docker-compose.dev.yml exec app pnpm db:migrate
   
   # Without Docker
   pnpm db:migrate
   ```

### Option 2: Local Supabase (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Copy local credentials to .env.local
# API URL: http://localhost:54321
# Anon key: (from supabase start output)

# Run migrations
pnpm db:migrate
```

---

## Environment Variables Explained

Required variables in `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database (if using Supabase directly)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres

# Optional
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=development
```

**Security**: Never commit `.env.local` to git!

---

## Verify Installation

Run these commands to ensure everything works:

```bash
# 1. Check Node/pnpm versions
node --version  # Should show v20.x.x
pnpm --version  # Should show 8.x.x or 9.x.x

# 2. Type check (Docker: <10s, Traditional: 60s+)
pnpm docker:type-check  # or pnpm type-check

# 3. Lint check
pnpm lint

# 4. Run tests
pnpm docker:test  # or pnpm test:run

# 5. Access app
# Open http://localhost:3000 in browser
```

**Expected Results:**
- ✅ Type check passes with 0 errors
- ✅ Lint passes (warnings OK)
- ✅ Tests pass (1,988/2,116 passing currently)
- ✅ App loads in browser

---

## Common Issues & Solutions

### Issue: `pnpm: command not found`

**Solution**:
```bash
npm install -g pnpm
# or
corepack enable
```

### Issue: Docker build fails

**Solution**:
```bash
# Clean everything
docker system prune -a --volumes

# Rebuild
pnpm docker:build --no-cache
```

### Issue: Port 3000 already in use

**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in docker-compose.dev.yml:
ports:
  - "3001:3000"
```

### Issue: Database connection fails

**Solution**:
1. Verify Supabase credentials in `.env.local`
2. Check network connectivity
3. Ensure database migrations ran successfully:
   ```bash
   pnpm db:migrate
   ```

### Issue: Type checking slow (60+ seconds)

**Cause**: Running on WSL /mnt/c/ (slow file system)

**Solution**: Use Docker for 6x faster performance:
```bash
pnpm docker:type-check  # <10s instead of 60s+
```

### Issue: Hot reload not working in Docker

**Solution**: Check environment variables in `docker-compose.dev.yml`:
```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
```

---

## Next Steps

After setup, explore:

1. **Development Workflow** → [DEV_GUIDE.md](./DEV_GUIDE.md)
2. **Docker Details** → [DOCKER.md](./DOCKER.md)
3. **Code Conventions** → [CONVENTIONS.md](./CONVENTIONS.md)
4. **Architecture** → [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Quick Reference

### Essential Commands

```bash
# Development (Docker - Recommended)
pnpm docker:dev          # Start dev server
pnpm docker:type-check   # Type checking (<10s)
pnpm docker:test         # Run tests
pnpm docker:shell        # Access container shell
pnpm docker:down         # Stop services

# Development (Traditional)
pnpm dev                 # Start dev server
pnpm type-check          # Type checking (slower)
pnpm test                # Run tests
pnpm lint                # Lint check

# Database
pnpm db:migrate          # Run migrations
pnpm db:maintenance      # Maintenance tasks
```

---

**Ready to start developing?** Head to [DEV_GUIDE.md](./DEV_GUIDE.md) for daily workflow guides!
