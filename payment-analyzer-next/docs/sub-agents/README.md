# Sub-Agents Execution Plan

Purpose: coordinate focused workstreams to bring the Next.js implementation to parity with the v9 HTML prototype and ship targeted enhancements safely.

Workstreams (Sub-Agents)

1) Navigation & Badges
2) Analysis Validation & Recovery
3) Reports UX
4) Settings: Storage & Export
5) PDF Worker & Performance
6) Accessibility & QA

Operating Model

- Source of Truth: this folder (docs/sub-agents) + code references in each agent brief
- Cadence: small PRs per checklist item, feature flags where applicable
- Definition of Done (DoD):
  - Functionality verified locally (manual steps listed in each brief)
  - No regressions on key pages (Dashboard, Analysis, Reports)
  - Types fine, build clean, lints pass
  - UI parity confirmed against prototype for the specific scope

Cross-Cutting Standards

- Keep changes localized and minimal; reuse existing components first
- Maintain design tokens from src/app/globals.css
- Prefer accessible elements (buttons/links) with proper aria where interactive
- Add config/env guards for optional features (e.g., worker)

Tracking

- Use the checklist in each agent brief and update as items complete
- Suggested PR labels: agent:nav, agent:analysis, agent:reports, agent:settings, agent:perf, agent:a11y

