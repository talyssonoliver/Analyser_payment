# Docker Development Guide

**Last Updated**: December 2025
**Target**: Docker-based development (RECOMMENDED approach)

This guide explains the Docker development environment and why it's 6-10x faster than traditional WSL setup.

---

## Why Docker?

### Performance Comparison

| Operation | WSL (/mnt/c/) | Docker (Volumes) | Improvement |
|-----------|---------------|------------------|-------------|
| Type check | 60+ seconds | <10 seconds | **6x faster** ⚡ |
| Hot reload | 3-5 seconds | <1 second | **5x faster** 🚀 |
| pnpm install | 5+ minutes | ~30 seconds | **10x faster** 💨 |

**Root Cause**: WSL file system bridge (/mnt/c/) is extremely slow for high-frequency file access. Docker volumes use native Linux filesystem.

---

## Docker Architecture

### Services

```yaml
app:           # Main Next.js dev server (port 3000)
type-checker:  # Isolated TypeScript checking  
test-watch:    # Test runner in watch mode
test-ui:       # Vitest UI interface (port 51204)
```

### Volume Strategy

**Named Volumes (Performance Key):**
```yaml
node_modules:  # 829MB - Native Docker filesystem
pnpm_store:    # 838MB - Package cache
nextjs_cache:  # 157MB - Build artifacts
tsc_cache:     # TypeScript incremental builds
vitest_cache:  # Test cache
```

**Why Fast?**
- Volumes live in `/var/lib/docker/volumes/` (native ext4)
- Zero WSL ↔ Windows overhead
- node_modules never touches slow Windows filesystem

### Bind Mounts

```yaml
- .:/app:cached         # Source code (need to edit from host)
- ./coverage:/app/coverage  # Test output (view from host)
```

---

## Essential Commands

### Daily Use

```bash
# Start development
pnpm docker:dev       # Start Next.js (http://localhost:3000)

# Verification
pnpm docker:type-check    # <10s type checking
pnpm docker:test          # Watch mode tests
pnpm docker:test-ui       # Vitest UI (http://localhost:51204)

# Utilities
pnpm docker:shell         # Access container shell
pnpm docker:logs          # View live logs
pnpm docker:down          # Stop all services
```

### First-Time Setup

```bash
# Build image (5-10 minutes first time)
pnpm docker:build

# Start services
pnpm docker:dev

# Verify
pnpm docker:type-check    # Should complete in <10s
```

### Maintenance

```bash
# Stop services (keeps volumes)
pnpm docker:down

# Clean everything (⚠️ removes volumes)
pnpm docker:clean

# Rebuild from scratch
pnpm docker:clean
pnpm docker:build --no-cache
pnpm docker:dev
```

---

## Configuration Files

### docker-compose.dev.yml

**Key Sections:**

```yaml
services:
  app:
    volumes:
      - node_modules:/app/node_modules    # Performance
      - .:/app:cached                     # Source code
    environment:
      - WATCHPACK_POLLING=true            # Hot reload
      - CHOKIDAR_USEPOLLING=true          # File watching
      - NODE_OPTIONS=--max-old-space-size=4096  # Memory
    ports:
      - "3000:3000"    # Next.js
      - "9229:9229"    # Debugger
```

### Dockerfile.dev

**Optimizations:**
- Alpine Linux base (~150MB vs ~950MB)
- Layer caching (package.json copied first)
- Pre-created cache directories
- Health check on `/api/health`

---

## Troubleshooting

### Port Already in Use

**Error**: `bind: address already in use`

**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port in docker-compose.dev.yml
```

### Container Unhealthy

**Error**: Container status shows "(unhealthy)"

**Solution**:
```bash
# Check logs
pnpm docker:logs

# Test health endpoint
curl http://localhost:3000/api/health

# Restart
docker-compose -f docker-compose.dev.yml restart app
```

### Volumes Corrupted

**Symptoms**: Type checking back to 60+ seconds, missing modules

**Solution**:
```bash
# Nuclear option - clean and rebuild
pnpm docker:clean       # ⚠️ Deletes volumes
pnpm docker:build
pnpm docker:dev
```

### Out of Memory

**Error**: `JavaScript heap out of memory`

**Solution**: Edit `docker-compose.dev.yml`:
```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=8192  # Increase to 8GB
```

### Hot Reload Not Working

**Solution**: Verify polling enabled in `docker-compose.dev.yml`:
```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
```

Then restart:
```bash
docker-compose -f docker-compose.dev.yml restart app
```

---

## Advanced Usage

### Database Operations

```bash
# Option 1: From host
docker-compose -f docker-compose.dev.yml exec app pnpm db:migrate

# Option 2: From container shell
pnpm docker:shell
pnpm db:migrate
pnpm db:maintenance
```

### Running Specific Commands

```bash
# Execute command in running container
docker exec payment-analyzer-next-app-1 pnpm lint

# Run one-off command
docker-compose -f docker-compose.dev.yml run --rm app pnpm test:run
```

### Inspect Container

```bash
# List running containers
docker ps

# View container details
docker inspect payment-analyzer-next-app-1

# Check resource usage
docker stats
```

### Clean Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (⚠️ careful!)
docker volume prune

# Nuclear cleanup
docker system prune -a --volumes
```

---

## Quick Reference

```bash
# ESSENTIAL
pnpm docker:build        # Build image (first time)
pnpm docker:dev          # Start dev server
pnpm docker:type-check   # Type check (<10s)
pnpm docker:shell        # Container shell
pnpm docker:down         # Stop services

# TESTING
pnpm docker:test         # Watch mode
pnpm docker:test-ui      # UI (port 51204)

# MAINTENANCE
pnpm docker:logs         # View logs
pnpm docker:clean        # Remove all (⚠️)

# DOCKER COMMANDS
docker ps                # List containers
docker logs -f <container>  # Follow logs
docker exec -it <container> sh  # Shell access
```

---

**For More Details:**
- Setup Guide → [GETTING_STARTED.md](./GETTING_STARTED.md)
- Daily Workflow → [DEV_GUIDE.md](./DEV_GUIDE.md)
