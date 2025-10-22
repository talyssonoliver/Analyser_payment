# Agent: Accessibility & QA

Scope

- Improve a11y semantics and keyboard interactions
- Lightweight regression checks for critical views

Key Files

- src/components/layout/bottom-navigation.tsx
- src/components/analysis/steps/step-navigation.tsx
- src/components/dashboard/CalendarWidget.tsx
- src/components/reports/shared/ReportDataDisplay.tsx

Tasks

- [ ] Add `aria-current="page"` and descriptive labels to nav items
- [ ] Ensure all interactive elements are buttons/links with keyboard support
- [ ] Calendar: ensure disabled future dates are not focusable
- [ ] Report table: associate headers, ensure Edit buttons have labels
- [ ] Add a Vitest or simple render checks for components’ a11y attributes

Acceptance Criteria

- Keyboard navigation works across nav, steps, tables, modals
- Basic a11y attributes verified in tests or manual audit

Manual Test Steps

1. Tab through bottom nav and stepper; ENTER/SPACE activate
2. Screen reader announces current page and step positions correctly
3. Attempt focus on future calendar dates -> not focusable

Risks / Rollback

- None; changes are additive and low-risk

