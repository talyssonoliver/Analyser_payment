# Navigation Badges - Quick Reference

## Quick Start

```typescript
import { useNavigationBadges } from "@/hooks";
import { BottomNavigation } from "@/components/layout/bottom-navigation";

function AppLayout() {
  const { badges } = useNavigationBadges({
    userId: "your-user-id",
    enabled: true
  });

  return <BottomNavigation badges={badges} />;
}
```

## Badge Counts

| Item | Logic | Time Window |
|------|-------|-------------|
| Analysis | Drafts/in-progress | N/A |
| Reports | Unviewed reports | 7 days |
| History | Recent analyses | 30 days |
| Settings | Unsaved changes | N/A |
| Dashboard | Always 0 | N/A |

## Hook API

```typescript
useNavigationBadges({
  userId?: string;           // User ID for Supabase queries
  enabled?: boolean;         // Enable/disable hook (default: true)
  refreshInterval?: number;  // Refresh interval in ms (default: 30000)
})

// Returns:
{
  badges: NavigationBadges;  // Badge counts object
  loading: boolean;          // Loading state
  refreshBadges: () => void; // Manual refresh function
}
```

## Component Props

```typescript
<BottomNavigation
  badges={{                 // Optional badge counts
    dashboard: 0,
    analysis: 3,
    reports: 5,
    history: 2,
    settings: 1,
  }}
  visible={true}           // Show/hide navigation (default: true)
  currentPage="analysis"   // Active page (optional)
  className="custom-class" // Custom CSS class (optional)
/>
```

## Files

- **Hook:** `src/hooks/useNavigationBadges.ts`
- **Component:** `src/components/layout/bottom-navigation.tsx`
- **Hook Tests:** `tests/unit/hooks/useNavigationBadges.test.ts`
- **Component Tests:** `tests/unit/components/layout/BottomNavigation.badges.test.tsx`

## Examples

- `docs/examples/NavigationBadgesExample.tsx` - 8 usage patterns

## Testing

```bash
# Run hook tests
pnpm test tests/unit/hooks/useNavigationBadges.test.ts

# Run component tests
pnpm test tests/unit/components/layout/BottomNavigation.badges.test.tsx

# Run all tests
pnpm test:run
```

## Performance

- Auto-refresh: 30s (configurable)
- Memoized: All counting functions
- Debounced: Storage event listeners
- Optimized: Limited query results (100 max)

## Accessibility

- ✅ `aria-label` on all badges
- ✅ Singular/plural text
- ✅ High contrast (red error variant)
- ✅ Screen reader friendly

## Common Patterns

### Disable when not authenticated
```typescript
const { badges } = useNavigationBadges({
  userId,
  enabled: !!userId
});
```

### Custom refresh interval
```typescript
const { badges } = useNavigationBadges({
  userId,
  refreshInterval: 60000 // 1 minute
});
```

### Manual refresh on action
```typescript
const { badges, refreshBadges } = useNavigationBadges({ userId });

const handleSave = async () => {
  await saveData();
  await refreshBadges(); // Update badges
};
```

### Use with context
```typescript
<BadgeProvider userId={userId}>
  <AppLayout />
</BadgeProvider>
```

## Troubleshooting

**Badges not updating?**
- Check `enabled` prop is `true`
- Verify `userId` is provided
- Check console for errors

**Too many API calls?**
- Increase `refreshInterval`
- Disable when user is inactive

**Stale counts?**
- Call `refreshBadges()` after data changes
- Check storage event listeners

## Full Documentation

See `docs/NAVIGATION_BADGES_IMPLEMENTATION.md` for complete documentation.
