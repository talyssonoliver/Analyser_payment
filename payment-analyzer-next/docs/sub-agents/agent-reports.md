# Agent: Reports UX

Scope

- Compact view toggle, persisted per user
- Clear edit flow for day entries
- Print friendliness retained

Key Files

- src/app/(dashboard)/reports/page.tsx
- src/components/reports/shared/ReportDataDisplay.tsx
- src/components/ui/print-test.tsx

Tasks

- [ ] Add a compact view toggle control beside ReportHeaderBar
- [ ] Persist compact view in localStorage (`report.compactView`)
- [ ] Ensure day edit modal ESC/overlay dismiss and focus trap work consistently
- [ ] Verify print CSS renders KPIs + table in A4 without overflow

Acceptance Criteria

- Toggle switches table density live and persists across reloads
- Editing a day updates report and recalculates totals without refresh if feasible
- Print preview shows single-page (or paginated) layout with headers

Manual Test Steps

1. Open a weekly report, toggle compact mode, refresh -> remains compact
2. Edit a day, save, data updates and header totals remain consistent
3. Use browser print; verify layout and no clipped content

Risks / Rollback

- If persistence conflicts with SSR, gate with `typeof window` checks

