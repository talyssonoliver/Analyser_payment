# Agent: Analysis Validation & Recovery

Scope

- Extend validation feedback to header-level pill (PENDING/READY/INVALID)
- Ensure session recovery banner appears where useful across steps
- Info tooltip parity for form hints

Key Files

- src/app/(dashboard)/analysis/page.tsx
- src/components/analysis/containers/Step1Container.tsx
- src/components/analysis/containers/Step2Container.tsx
- src/components/analysis/containers/Step3Container.tsx
- src/hooks/use-analysis-steps.ts (state)
- src/components/ui/recovery-banner.tsx
- src/components/ui/info-tooltip.tsx

Tasks

- [ ] Centralize validation state (files vs entries) in use-analysis-steps
- [ ] Expose validation pill state to dashboard layout header on analysis route
- [ ] Reuse InfoTooltip on Step1/2 instead of inline DOM tooltips when possible
- [ ] Optionally show recovery banner on Step2/3 when session indicates in-progress

Acceptance Criteria

- Header pill matches Step 2 preview status labels and colors
- Recovery can resume from Step2/Step3 without regressions
- Tooltips render correctly on hover/focus and don’t cause layout thrash

Manual Test Steps

1. Upload runsheet/invoice files; check pill transitions to READY/INCOMPLETE
2. Navigate away/back; banner offers restore; restore resumes step state
3. Keyboard focus on info icon shows tooltip; ESC/blur hides it

Risks / Rollback

- If shared state introduces coupling, keep pill local to Step 2 until stable

