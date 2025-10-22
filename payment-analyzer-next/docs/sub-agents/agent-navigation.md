# Agent: Navigation & Badges

Scope

- Bottom navigation parity with prototype (active indicator, badges)
- Header action consistency and validation pill for Analysis

Key Files

- src/components/layout/bottom-navigation.tsx
- src/components/layout/app-layout.tsx
- src/components/layout/page-header.tsx
- src/app/(dashboard)/layout.tsx

Tasks

- [ ] Wire `badges` prop through AppLayout to BottomNavigation
  - Basic counts:
    - `history`: number of analyses in local DB for user
    - `reports`: show 1 when a new analysis just completed (session flag)
    - `analysis`: show pending uploads count when present
- [ ] Add `aria-current="page"` on active nav item
- [ ] Align active indicator (top bar vs bottom dot) to prototype (configurable)
- [ ] Analysis header validation pill mirroring prototype PENDING/READY/INVALID
  - Source step state from use-analysis-steps
  - Show only on `/analysis`

Acceptance Criteria

- Badges appear/disappear correctly per state and reset on navigation
- Screen readers announce active nav item (aria-current)
- Validation pill updates as files/entries change or validation runs

Manual Test Steps

1. Navigate across Dashboard/Analysis/Reports/History/Settings; observe active state
2. Upload a file -> `analysis` badge increments; proceed -> `reports` badge shows 1
3. Complete analysis -> navigate to Reports; pill is hidden; badges clear appropriately

Risks / Rollback

- If badge logic causes flicker, disable via prop and hide by default

