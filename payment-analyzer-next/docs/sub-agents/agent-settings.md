# Agent: Settings — Storage & Export

Scope

- Bring prototype’s storage stats and export/clear actions into Settings

Key Files

- src/app/(dashboard)/settings/page.tsx
- src/components/export/export-modal.tsx
- src/lib/services/compressed-storage-service.ts
- src/lib/repositories/analysis-repository.ts

Tasks

- [ ] Add "Storage & Data" section with:
  - Total analyses count
  - Storage used (approximate via compressed/local items)
  - Compression status and version
- [ ] Buttons: Export Current, Export All, Clear All
  - Reuse handlers from History/Reports pages
- [ ] Confirm destructive actions ask for confirmation

Acceptance Criteria

- Storage stats render instantly without heavy work on first paint
- Export actions produce the same payload as existing pages
- Clear All removes local and remote (DB) analyses for current user with feedback

Manual Test Steps

1. Visit Settings; observe stats update after short delay
2. Export All -> modal shows valid JSON payload; cancel closes cleanly
3. Clear All -> confirm -> items removed in UI & DB; refresh shows empty

Risks / Rollback

- If DB delete fails, show partial success, leave local cleared; provide retry

