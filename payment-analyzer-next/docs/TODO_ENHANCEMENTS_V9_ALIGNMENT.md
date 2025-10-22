# Payment Analyzer Next — Parity & Enhancements Plan (v9)

Status: draft
Owner: platform team

## Objectives

- Close UX gaps against `payment-analyzer-multipage.v9.0.0.html`.
- Activate partially built flows (overlap/merge, recovery) with robust tests.
- Add pragmatic polish (tooltips, badges, PWA, print) without overreach.
- Keep type, lint, and tests green across client/server.

## Workstreams (A–J)

### A — Overlap Detection + Merge (High Impact)
- Scope: Activate QuickDateExtractor + overlap detection and FileUpdateDialog in Step 1; enable merge path via service/API.
- Key files:
  - `src/components/analysis/containers/Step1Container.tsx`
  - `src/lib/services/quick-date-extractor.ts`
  - `src/components/analysis/shared/file-update-dialog.tsx`
  - `src/lib/services/analysis-merge-service.ts`
  - `src/app/api/analysis/[id]/merge/route.ts`
  - `src/lib/repositories/analysis-repository.ts`
- Tasks:
  - Use `useAuth()` to obtain `user.id`; query recent analyses via `analysisRepository.getUserAnalyses`.
  - Extract new file date range with `QuickDateExtractor.extractDateRange(files)`.
  - Detect overlap vs. existing analysis ranges; when found, show `FileUpdateDialog` (handlers already scaffolded in Step1).
  - Implement Merge: call `POST /api/analysis/{id}/merge` (existing route), refresh state, proceed to Step 2, and persist session.
  - Implement Create New: proceed with current `validateAndHash` path.
  - Optional: compute per-file “updated” flags for Step 2 using fingerprint comparison.
- Tests:
  - Unit (server): overlap algorithms in `quick-date-extractor` (edge cases, multi-week).
  - Unit (server): `analysis-merge-service` strategies (“complementary”, “overwrite”).
  - Integration (server): `/api/analysis/[id]/merge` happy/validation paths.
  - Integration (client): Step1 upload → overlap → dialog → merge/create-new flows.
- Acceptance:
  - Overlap dialog appears within 200ms when ranges intersect.
  - Merge updates entries/totals; Create New preserves isolation.
  - Updated-file indicators visible when applicable.
- Sub‑agent: A

### B — Analysis Header Validation Badge
- Scope: Add small header-level validation badge reflecting Step 2 readiness.
- Key files: `src/app/(dashboard)/analysis/page.tsx`, `src/components/analysis/validation/validation-badge-system.tsx`, `src/styles/legacy.css`.
- Tasks:
  - Compute status from `use-analysis-steps` (READY/INCOMPLETE/INVALID).
  - Render badge in Analysis header; keep ARIA labels and compact footprint.
- Tests: unit render states for READY/INCOMPLETE/INVALID.
- Acceptance: Header badge mirrors Step 2 and updates on navigation.
- Sub‑agent: B

### C — Calendar Tooltips (Dashboard)
- Scope: Rich, accessible tooltips for daily payment info.
- Key files: `src/components/dashboard/CalendarWidget.tsx`, `src/styles/dashboard/calendar.module.css`, `src/components/ui/info-tooltip.tsx`.
- Tasks:
  - Add `CalendarTooltip` with portal, keyboard and touch support.
  - Populate from `getPaymentInfoForDate` and show statuses, expected/paid/diff, consignments.
- Tests: jsdom unit for show/hide, keyboard flow, content accuracy.
- Acceptance: Tooltip parity with reference; no perf regressions.
- Sub‑agent: C

### D — Bottom Navigation Badges
- Scope: Wire live badges for Analysis/Reports/History/Settings.
- Key files: `src/components/layout/bottom-navigation.tsx`, `src/lib/services/analysis-storage-service.ts`, `src/lib/repositories/analysis-repository.ts`.
- Tasks:
  - Implement `useNavigationBadges()` to compute counts (e.g., recent analyses, unviewed reports, unsaved preferences).
  - Provide badges via props to `BottomNavigation`.
- Tests: unit for badge counts via mocked services.
- Acceptance: Badges appear contextually and update with state.
- Sub‑agent: D

### E — Inline Report Routing + Status Mapping
- Scope: Unify status mapping and ensure week/day deep links render correctly.
- Key files: `src/app/(dashboard)/reports/page.tsx`, `src/components/analysis/results/inline-report-modal.tsx`, `src/hooks/useReportUrlParams.ts`.
- Tasks:
  - Extract shared status mapping helper for daily entries.
  - Honor `week`, `start`, `end`, `day` query params consistently across page/modal.
  - Ensure single-day report shows KPIs + settlement summary clearly.
- Tests: client integration of param combinations and rendering.
- Acceptance: Week/day deep links render consistently and accurately.
- Sub‑agent: E

### F — Recovery Triggers (Analysis/Reports)
- Scope: Broaden recovery banner triggers to match reference.
- Key files: `src/components/ui/recovery-banner.tsx`, `src/lib/services/session-recovery-service.ts`, Analysis/Reports pages.
- Tasks:
  - On mount, query session; show banner when unfinished or recent analysis exists.
  - ‘Restore’ rehydrates Step 1/Reports; ‘Dismiss’ clears and hides.
- Tests: unit for banner show/restore/dismiss with mocked storage.
- Acceptance: Predictable recovery shown after return; restores context.
- Sub‑agent: F

### G — PWA & Mobile Meta
- Scope: Add manifest/icons/meta and optional basic SW.
- Key files: `public/manifest.json` (new), `public/icons/*` (new), `src/app/layout.tsx`, `next.config.ts`.
- Tasks:
  - Add manifest with name, theme color, icons; wire link/meta in layout.
  - Optional: basic service worker for static caching (or Next PWA plugin).
- Tests: build smoke; head contains manifest/meta.
- Acceptance: Installable; improved mobile safe-area/status bar.
- Sub‑agent: G

### H — Microcopy/Labels Parity
- Scope: Align step labels and helper text.
- Key files: `src/components/analysis/steps/step-navigation.tsx`, `src/components/analysis/containers/Step1Container.tsx`.
- Tasks: Ensure labels match reference tone (“Upload Files”, “Validate”, “Analyze”) and section copy is clear.
- Tests: unit for labels rendering.
- Acceptance: Copy consistent across steps/components.
- Sub‑agent: H

### I — File List “Updated” Markers (Step 2)
- Scope: Per-file indicator (e.g., exclamation) where file changed since last analysis.
- Key files: `src/components/analysis/validation/legacy-step2-validation.tsx`, `src/lib/services/file-update-detection-service.ts`, `src/lib/domain/services/file-validation-service.ts`.
- Tasks:
  - Compute file update flags from fingerprints and last analysis metadata.
  - Render small indicator + tooltip beside applicable files.
- Tests: unit mapping of files → flags; render markers.
- Acceptance: Users can see changed files at-a-glance.
- Sub‑agent: I

### J — Print Styles Parity
- Scope: Ensure printed reports are professional.
- Key files: `src/styles/base/print.css`, `src/components/reports/shared/*`.
- Tasks: Tune print CSS (page breaks, typography, hide nav/chrome, widen table).
- Tests: manual verification; basic render test if feasible.
- Acceptance: Tables and KPIs print cleanly without clipping.
- Sub‑agent: J

## Test Plan

- Runners/config: `vitest.client.config.ts` (components), `vitest.server.config.ts` (API/services).
- Suggested new tests:
  - Client
    - `tests/components/analysis/Step1Container.overlap.test.tsx`
    - `tests/components/analysis/ValidationBadge.test.tsx`
    - `tests/components/dashboard/CalendarTooltip.test.tsx`
    - `tests/components/layout/BottomNavigation.badges.test.tsx`
    - `tests/pages/Reports.params.test.tsx`
    - `tests/components/analysis/LegacyStep2Validation.update-marker.test.tsx`
  - Server/Services
    - `tests/services/quick-date-extractor.overlap.test.ts`
    - `tests/services/analysis-merge-service.merge.test.ts`
    - `tests/api/merge.route.test.ts`
    - `tests/services/session-recovery-service.test.ts`
- Reuse existing mocks: `tests/mocks/*`.
- Verify path aliases `@/` in Vitest configs.

## CI/QA

- Commands: `pnpm test`, `pnpm typecheck`, `pnpm lint`.
- Run per workstream; keep PRs small and focused.
- Optional: Add CI workflow if missing (run test + lint + typecheck).

## Milestones & Sequencing

- Milestone 1 (Core parity): Workstreams A, B, E, F + tests.
- Milestone 2 (UX polish): Workstreams C, D, I + tests.
- Milestone 3 (Platform): Workstreams G, H, J + tests/manual.

## Risks/Notes

- Merge/overlap gated by authentication; fallback to local-only behavior if unauthenticated.
- Service worker adds complexity—start with manifest/meta first.
- Print verification largely manual; keep CSS changes minimal and scoped.

## Definition of Done (per workstream)

- All tasks implemented; tests added; `pnpm test`, `pnpm typecheck`, and `pnpm lint` pass.
- No regressions on Dashboard, Analysis flow, Reports page, or History.
- Documentation updated here when scope changes.

