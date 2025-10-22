# Payment Analyzer Next

Modern payment analysis application built with Next.js 15, React, TypeScript, and Supabase.

## 📚 Documentation

**All documentation is in the [`docs/`](./docs/) folder.**

### Quick Links

- 🚀 [Getting Started](./docs/GETTING_STARTED.md) - Setup and installation
- 📖 [Documentation Index](./docs/INDEX.md) - Complete documentation map
- ⚡ [Quick Reference](./docs/QUICK_REFERENCE.md) - Security fixes overview
- 🏗️ [Architecture](./docs/ARCHITECTURE.md) - System architecture

## 🔧 Quick Start

### Docker Development (REQUIRED for Windows)

```powershell
# First-time setup
pnpm docker:build   # Build Docker image (2-5 min)

# Start development
pnpm docker:dev     # Starts at http://localhost:3000

# In NEW terminal - Run tasks:
docker-compose -f docker-compose.dev.yml exec app pnpm lint
docker-compose -f docker-compose.dev.yml exec app pnpm type-check
docker-compose -f docker-compose.dev.yml exec app pnpm test
docker-compose -f docker-compose.dev.yml exec app pnpm biom
```

**Why Docker?** Windows `pnpm install` has permission errors. Docker eliminates:
- ❌ Permission errors (EACCES)
- ❌ Binary conflicts
- ❌ File locking issues
- ❌ WSL2 performance problems

📖 **Full Guide:** [docs/DOCKER_DEVELOPMENT_WORKFLOW.md](./docs/DOCKER_DEVELOPMENT_WORKFLOW.md)

### Traditional (Not Recommended for Windows)

```bash
pnpm install  # May fail on Windows
pnpm dev
pnpm type-check
```

## 📊 Project Status

- ✅ Security Phase 1 Complete (2025-10-22)
- ✅ Type-safe codebase
- ✅ Comprehensive test coverage
- 🔄 Dependency updates pending (post-cleanup)

## 🔒 Security

- CORS protection 
- XSS vulnerabilities
- Security headers configured
- Open redirect

See [`docs/QUICK_REFERENCE.md`](./docs/QUICK_REFERENCE.md) for details.

## 📝 License

Private project.

---

**For complete documentation, see** [`docs/INDEX.md`](./docs/INDEX.md)
