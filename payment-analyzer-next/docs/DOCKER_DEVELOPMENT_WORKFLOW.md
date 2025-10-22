# Docker Development Workflow

**Status**: RECOMMENDED APPROACH (October 2025)  
**Last Updated**: October 22, 2025  
**Context**: Windows + WSL2 + Docker Desktop environment

---

## Why Docker-First Development?

### The Problem We Solved

On Windows with WSL2, traditional `pnpm install` encountered severe issues:

1. **Permission Errors**: `EACCES: permission denied` when accessing node_modules
2. **Binary Conflicts**: Mixed Linux/Windows binaries in node_modules from concurrent access
3. **File Locking**: VSCode extensions (ESLint, TypeScript) holding file locks on Windows paths
4. **WSL2 Performance**: 10-20x slower filesystem access on `/mnt/c/` paths
5. **Installation Hangs**: `pnpm install` hanging indefinitely (45+ minutes tested)

### The Solution: Docker-Isolated Development

By using Docker with **named volumes** for `node_modules`, we:

- ✅ **Eliminate permission issues** - Linux-only binaries in isolated Docker volume
- ✅ **Prevent file corruption** - No mixed Windows/Linux binary conflicts
- ✅ **Avoid file locking** - Windows and Docker don't share node_modules
- ✅ **Improve performance** - Native Linux filesystem performance
- ✅ **Enable consistent environment** - Same environment for all developers

---

## Architecture Overview

```
Windows Host (C:\taly\Analyser\payment-analyzer-next)
├── Source Code (bind mounted to Docker :cached)
├── Git repository
├── .env.local (bind mounted)
└── [NO node_modules] ← Deleted, not needed!

Docker Container (/app)
├── Source Code (read from Windows via bind mount)
├── node_modules (Docker named volume - isolated)
├── .next (Docker named volume - build cache)
├── pnpm_store (Docker named volume - package cache)
└── All development tools (ESLint, TypeScript, etc.)
```

### Key Principle: Source on Windows, Dependencies in Docker

- **Windows**: Store source code, use Git, edit files in VSCode
- **Docker**: Run all Node.js operations (install, dev, build, lint, test)
- **Isolation**: `node_modules` never touches Windows filesystem

---

## Docker Configuration

### docker-compose.dev.yml Structure

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      # Source code (Windows → Docker, cached for performance)
      - .:/app:cached
      
      # Isolated dependencies (Docker-only, never touch Windows)
      - node_modules:/app/node_modules
      - pnpm_store:/root/.local/share/pnpm/store
      - nextjs_cache:/app/.next
      - tsc_cache:/app/.tsbuildinfo
      - vitest_cache:/app/node_modules/.vitest
      - coverage_output:/app/coverage
    ports:
      - "3000:3000"      # Next.js dev server
      - "9229:9229"      # Node.js debugger
      - "51204:51204"    # Vitest UI
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
      - CHOKIDAR_USEPOLLING=true
    command: pnpm dev

volumes:
  node_modules:
  pnpm_store:
  nextjs_cache:
  tsc_cache:
  vitest_cache:
  coverage_output:
```

### Named Volumes Explained

| Volume | Purpose | Why Docker-Only |
|--------|---------|-----------------|
| `node_modules` | All npm packages | Contains Linux binaries incompatible with Windows |
| `pnpm_store` | pnpm content-addressable store | Optimizes install speed across rebuilds |
| `nextjs_cache` | Next.js `.next` build output | Large, frequently changing, platform-specific |
| `tsc_cache` | TypeScript incremental build | Platform-specific paths and references |
| `vitest_cache` | Vitest test cache | Improves test startup time |
| `coverage_output` | Test coverage reports | Can be generated fresh each run |

---

## Daily Development Workflow

### Starting Development

```powershell
# Terminal 1: Start Docker container (dedicated terminal)
cd C:\taly\Analyser\payment-analyzer-next
pnpm docker:dev

# Container starts, shows logs:
# ✓ Ready in 4.4s
# - Local:   http://localhost:3000
# - Network: http://172.18.0.2:3000
```

**Keep this terminal open** - It shows live logs and hot-reload events.

### Running Development Tasks

Open **new PowerShell terminals** for these commands:

```powershell
cd C:\taly\Analyser\payment-analyzer-next

# Type checking
docker-compose -f docker-compose.dev.yml exec app pnpm type-check

# Linting
docker-compose -f docker-compose.dev.yml exec app pnpm lint

# Run tests
docker-compose -f docker-compose.dev.yml exec app pnpm test

# Interactive shell (for multiple commands)
docker-compose -f docker-compose.dev.yml exec app sh
# Now you're inside the container, run any pnpm command:
pnpm lint
pnpm type-check
exit
```

### Making Code Changes

1. **Edit files in VSCode on Windows** (normal workflow)
2. **Save file** - Hot reload happens automatically
3. **Check Docker terminal** - See compilation logs
4. **Refresh browser** - See changes

### Adding Dependencies

```powershell
# Option 1: Use docker exec
docker-compose -f docker-compose.dev.yml exec app pnpm add <package-name>

# Option 2: Edit package.json manually, then:
docker-compose -f docker-compose.dev.yml exec app pnpm install

# ⚠️ IMPORTANT: After adding dependencies, commit changes:
git add package.json pnpm-lock.yaml
git commit -m "feat: add <package-name> dependency"
```

### Stopping Development

```powershell
# In the Docker terminal (Terminal 1), press Ctrl+C
# This stops the dev server gracefully

# Or from another terminal:
cd C:\taly\Analyser\payment-analyzer-next
pnpm docker:down
```

---

## Rebuilding Docker Image

### When to Rebuild

Rebuild the Docker image when:

- ✅ package.json or pnpm-lock.yaml changed significantly
- ✅ Dockerfile.dev modified
- ✅ docker-compose.dev.yml changed
- ✅ After pulling major updates from Git
- ❌ NOT needed for code changes (hot reload handles it)

### How to Rebuild

```powershell
# Stop running containers
pnpm docker:down

# Rebuild (no cache for clean build)
pnpm docker:build

# Or with docker-compose directly:
docker-compose -f docker-compose.dev.yml build --no-cache

# Start fresh container
pnpm docker:dev
```

**First build**: ~2-5 minutes  
**Subsequent builds** (with cache): ~10-30 seconds

---

## VSCode Integration

### Problem: Extensions Using Windows node_modules

VSCode extensions (ESLint, TypeScript, Biome) try to use Windows `node_modules` by default. Since we deleted it, they show errors like:

```
Cannot find module 'react' or its corresponding type declarations.
Cannot find module 'next/navigation'...
```

### Solution: Configure Extensions for Docker

Create or update `.vscode/settings.json`:

```json
{
  "eslint.enable": false,
  "typescript.tsdk": "",
  "typescript.enablePromptUseWorkspaceTsdk": false,
  
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "never"
  },
  
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.next/**": true,
    "**/coverage/**": true
  },
  
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/coverage": true
  }
}
```

**What this does:**
- Disables ESLint extension (use Docker for linting)
- Disables TypeScript extension (use Docker for type checking)
- Excludes phantom directories from file watcher and search

### Running Lint/Type Check from VSCode

Instead of extensions, use VSCode tasks:

1. Press `Ctrl+Shift+P` → "Tasks: Run Task"
2. Select task like "docker: lint" or "docker: type-check"

Or use integrated terminal:
```powershell
docker-compose -f docker-compose.dev.yml exec app pnpm lint
```

---

## Troubleshooting

### "Module not found" errors in Problems tab

**Cause**: VSCode extensions trying to use non-existent Windows node_modules.

**Fix**: 
1. Disable extensions in `.vscode/settings.json` (see above)
2. Reload VSCode: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Use Docker for linting/type checking instead

### Permission denied errors

**Cause**: Trying to run `pnpm` commands on Windows.

**Fix**: Always use Docker:
```powershell
# ❌ DON'T: pnpm install
# ✅ DO: docker-compose exec app pnpm install
```

### Container unhealthy or won't start

**Check logs**:
```powershell
docker-compose -f docker-compose.dev.yml logs app --tail 50
```

**Common causes**:
- Missing dependencies in package.json (check logs for "Module not found")
- Port 3000 already in use (stop other apps)
- Corrupted Docker volumes

**Fix**:
```powershell
# Stop and remove everything (volumes too)
pnpm docker:clean

# Rebuild fresh
pnpm docker:build
pnpm docker:dev
```

### Hot reload not working

**Cause**: File watching issues between Windows and Docker.

**Check**: docker-compose.dev.yml has:
```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
```

**Fix**: Restart container if needed.

### Docker build is slow (2+ minutes)

**First build**: Normal! Installing 861+ packages with native binaries takes time.

**Subsequent builds**: Should be faster (~30s) due to layer caching.

**Optimization**: Ensure package.json changes are rare, as they invalidate cache.

---

## Windows File Cleanup

### What About Windows node_modules and .next?

**They are no longer needed!** Safe to delete:

```powershell
cd C:\taly\Analyser\payment-analyzer-next

# Delete if you want (optional)
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path ".eslintcache" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "tsconfig.tsbuildinfo" -Force -ErrorAction SilentlyContinue
```

**Why safe?**
- Docker uses its own isolated volumes
- Source code is on Windows (not affected)
- Git doesn't track these directories (.gitignore)
- Can't cause any issues in Docker environment

**Why keep them?**
- Doesn't hurt anything (just takes disk space)
- Might reduce confusion ("where are my node_modules?")
- Can demonstrate the isolation principle

**Recommendation**: Delete them to avoid confusion and save ~500MB-1GB disk space.

---

## Comparison: Traditional vs Docker

| Aspect | Traditional (Windows pnpm) | Docker (Recommended) |
|--------|---------------------------|----------------------|
| **Setup time** | 45+ min (often hangs) | 2-5 min |
| **Permission errors** | Frequent | Never |
| **Binary conflicts** | Common | Impossible |
| **Type check speed** | 60+ seconds | <10 seconds |
| **Test discovery** | 1169 tests (missing 180) | 1349 tests (all found) |
| **Hot reload** | Works but slower | Fast and reliable |
| **File locks** | VSCode extensions lock files | Isolated, no locks |
| **Consistency** | Varies by system | Identical for all devs |

---

## Git Workflow with Docker

### Normal Git operations on Windows

```powershell
# All standard Git commands work on Windows:
git status
git add .
git commit -m "feat: add feature"
git push
git pull
```

### After pulling changes with dependency updates

```powershell
# If package.json changed:
docker-compose -f docker-compose.dev.yml exec app pnpm install

# Or rebuild for clean state:
pnpm docker:build
```

### Committing dependency changes

```powershell
# After adding packages in Docker:
docker-compose -f docker-compose.dev.yml exec app pnpm add react-query

# Commit the lockfile (now on Windows filesystem):
git add package.json pnpm-lock.yaml
git commit -m "feat: add react-query dependency"
git push
```

**Note**: pnpm-lock.yaml is bind-mounted, so changes in Docker appear on Windows immediately.

---

## CI/CD Integration

### GitHub Actions / Azure Pipelines

Use the same Docker approach:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: docker-compose -f docker-compose.dev.yml build
      
      - name: Run tests
        run: docker-compose -f docker-compose.dev.yml run --rm app pnpm test:run
      
      - name: Run lint
        run: docker-compose -f docker-compose.dev.yml run --rm app pnpm lint
      
      - name: Type check
        run: docker-compose -f docker-compose.dev.yml run --rm app pnpm type-check
```

**Advantages**:
- Exact same environment as local development
- No "works on my machine" issues
- Cached Docker layers speed up CI

---

## Summary

### Golden Rules

1. **Source code lives on Windows** - edit in VSCode normally
2. **All Node.js operations in Docker** - pnpm, lint, test, build
3. **Never run `pnpm install` on Windows** - use Docker exclusively
4. **Keep Docker terminal running** - dedicated window for logs
5. **Disable VSCode extensions** - they can't access Docker's node_modules

### Quick Reference Commands

```powershell
# Start development
pnpm docker:dev

# In new terminal:
docker-compose -f docker-compose.dev.yml exec app pnpm lint
docker-compose -f docker-compose.dev.yml exec app pnpm type-check
docker-compose -f docker-compose.dev.yml exec app pnpm test

# Stop development
pnpm docker:down

# Rebuild (after dependency changes)
pnpm docker:build

# Clean everything (nuclear option)
pnpm docker:clean
```

### Benefits Recap

- ✅ No more Windows permission errors
- ✅ No more binary conflicts
- ✅ Consistent development environment
- ✅ Faster type checking and tests
- ✅ Better hot reload reliability
- ✅ Identical to CI/CD environment
- ✅ Works for all developers (Windows, Mac, Linux)

---

**Related Documentation:**
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Initial setup
- [TESTING.md](./TESTING.md) - Running tests in Docker
- [DEV_GUIDE.md](./DEV_GUIDE.md) - Daily development tasks

**Questions?** Check the Troubleshooting section or ask in team chat.
