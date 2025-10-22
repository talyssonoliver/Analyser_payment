# ⚠️ DEPRECATED - See payment-analyzer-next/docs/

**This file has been superseded by comprehensive documentation.**

---

## 📍 New Documentation Location

All project documentation has been unified and moved to:

**→ [`payment-analyzer-next/docs/INDEX.md`](./payment-analyzer-next/docs/INDEX.md)** ← **START HERE**

---

## 🐳 Docker-First Development (October 2025)

**Windows users:** Traditional `pnpm install` no longer supported. Use Docker exclusively.

**Why?**
- Windows permission errors (EACCES) resolved
- Mixed binary conflicts eliminated
- Consistent environment for all developers
- Faster type checking (<10s vs 60s+)

**📖 Complete Guide:** [docs/DOCKER_DEVELOPMENT_WORKFLOW.md](./payment-analyzer-next/docs/DOCKER_DEVELOPMENT_WORKFLOW.md)

---

## Quick Links for Gemini Users

| Topic | New Location |
|-------|--------------|
| **Getting Started** | [docs/GETTING_STARTED.md](./payment-analyzer-next/docs/GETTING_STARTED.md) |
| **Docker Workflow** ⭐ | [docs/DOCKER_DEVELOPMENT_WORKFLOW.md](./payment-analyzer-next/docs/DOCKER_DEVELOPMENT_WORKFLOW.md) |
| **Architecture Overview** | [docs/ARCHITECTURE.md](./payment-analyzer-next/docs/ARCHITECTURE.md) |
| **Development Conventions** | [docs/CONVENTIONS.md](./payment-analyzer-next/docs/CONVENTIONS.md) |
| **Testing Infrastructure** | [docs/TESTING.md](./payment-analyzer-next/docs/TESTING.md) |

---

## Build & Run Commands

```powershell
cd payment-analyzer-next

# Development (Docker - REQUIRED for Windows)
pnpm docker:build        # First-time setup (2-5 min)
pnpm docker:dev          # Start development (keep terminal open)

# Development tasks (in NEW terminal):
docker-compose -f docker-compose.dev.yml exec app pnpm lint
docker-compose -f docker-compose.dev.yml exec app pnpm type-check
docker-compose -f docker-compose.dev.yml exec app pnpm test

# ❌ DON'T USE on Windows:
# pnpm install    # FAILS - permission errors
# pnpm dev        # SLOW - corrupted node_modules
```

**Complete command reference:** [docs/DEV_GUIDE.md](./payment-analyzer-next/docs/DEV_GUIDE.md)

---

**Last Updated**: December 2025
**Status**: DEPRECATED - Use unified docs
**Replaced By**: `payment-analyzer-next/docs/*`
