# Agent: PDF Worker & Performance

Scope

- Enable PDF worker with safe fallback; retain prototype PDF.js config
- Ensure progress overlay signals worker progress cleanly

Key Files

- src/lib/workers/pdf-worker-client.ts
- src/lib/workers/pdf-worker.ts
- src/components/analysis/containers/Step3Container.tsx
- src/app/layout.tsx (PDF.js config)

Tasks

- [ ] Gate `isAvailable()` by env var (e.g., `NEXT_PUBLIC_ENABLE_PDF_WORKER`)
- [ ] Hook worker progress to progress overlay
- [ ] Verify worker termination and cleanup on route change

Acceptance Criteria

- When enabled, worker runs without throwing in SSR; otherwise main-thread path used
- Progress shows current file/percentage; cancellations don’t hang pending promises

Manual Test Steps

1. Set `NEXT_PUBLIC_ENABLE_PDF_WORKER=1`, upload PDFs -> worker path runs
2. Observe progress overlay updates; complete successfully
3. Disable flag -> same UX via main-thread

Risks / Rollback

- If worker causes instability in some browsers, default to off; re-enable per environment

