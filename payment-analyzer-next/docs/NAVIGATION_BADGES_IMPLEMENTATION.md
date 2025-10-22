# Navigation Badges Implementation Documentation

## Overview

This document describes the implementation of live badges for the bottom navigation component in the Payment Analyzer application.

## Files Created/Modified

### 1. Hook Implementation
**File:** `src/hooks/useNavigationBadges.ts`

A custom React hook that computes badge counts for navigation items.

**Features:**
- Computes badge counts from localStorage and Supabase
- Auto-refreshes on interval (default: 30 seconds)
- Listens for cross-tab storage changes
- Optimized with memoization
- Comprehensive error handling

**Badge Logic:**

| Navigation Item | Badge Count Logic |
|----------------|-------------------|
| Dashboard | Always 0 (no badge) |
| Analysis | Count of drafts/in-progress analyses |
| Reports | Count of unviewed reports (last 7 days) |
| History | Count of recent completed analyses (last 30 days) |
| Settings | Count of unsaved preferences |

**API:**
```typescript
interface UseNavigationBadgesOptions {
  userId?: string;
  enabled?: boolean;
  refreshInterval?: number; // milliseconds
}

const { badges, loading, refreshBadges } = useNavigationBadges({
  userId: "user-123",
  enabled: true,
  refreshInterval: 30000
});
```

**Return Type:**
```typescript
{
  badges: {
    dashboard: number;
    analysis: number;
    reports: number;
    history: number;
    settings: number;
  };
  loading: boolean;
  refreshBadges: () => Promise<void>;
}
```

### 2. Component Updates
**File:** `src/components/layout/bottom-navigation.tsx`

**Changes:**
- Added animated badge rendering using `framer-motion`
- Added accessibility labels for badges
- Supports badge counts from props
- Displays "99+" for counts over 99

**Features:**
- Smooth fade-in/out animation
- Screen reader friendly with aria-labels
- Singular/plural notification text
- Positioned at top-right of navigation icons

### 3. Exports
**File:** `src/hooks/index.ts`

Added exports for:
- `useNavigationBadges`
- `NavigationBadges` (type)
- `UseNavigationBadgesOptions` (type)

## Test Coverage

### Hook Tests
**File:** `tests/unit/hooks/useNavigationBadges.test.ts`

**Test Suites:**
1. Initial State
   - Zero badges on initialization
   - Provides refresh function

2. Analysis Badge (Drafts)
   - Counts pending/draft/in-progress analyses
   - Handles empty analyses
   - Error handling

3. Reports Badge (Unviewed)
   - Counts unviewed reports from last 7 days
   - Returns 0 when no userId
   - Error handling

4. History Badge (Recent Items)
   - Counts recent completed analyses (30 days)
   - Date filtering
   - Error handling

5. Settings Badge (Unsaved Changes)
   - Counts unsaved preferences
   - Handles null preferences
   - Error handling

6. Dashboard Badge
   - Always returns 0

7. Refresh and Updates
   - Auto-refresh on interval
   - Manual refresh
   - Disabled state
   - Cross-tab synchronization

8. Error Handling
   - Repository errors
   - Storage errors
   - Graceful degradation

### Component Tests
**File:** `tests/unit/components/layout/BottomNavigation.badges.test.tsx`

**Test Suites:**
1. Badge Rendering
   - Renders badges when provided
   - Hides badges when count is 0
   - Displays "99+" for counts over 99

2. Badge Accessibility
   - Includes aria-labels
   - Singular/plural notifications
   - Screen reader support

3. Badge Positioning
   - Correct CSS classes
   - Top-right positioning

4. Badge Visibility
   - Respects visible prop
   - Shows/hides correctly

5. Badge Updates
   - Updates on prop changes
   - Removes badges when count goes to 0

6. Multiple Badges
   - Renders multiple badges
   - Independent badge states

7. Default Props
   - Works without badges prop
   - Fallback to empty object

8. Custom Class Names
   - Accepts custom className

## Usage Example

```typescript
import { useNavigationBadges } from "@/hooks";
import { BottomNavigation } from "@/components/layout/bottom-navigation";

function Layout() {
  const { userId } = useAuth();
  const { badges, loading } = useNavigationBadges({
    userId,
    enabled: !!userId,
    refreshInterval: 30000
  });

  return (
    <BottomNavigation badges={badges} />
  );
}
```

## Performance Considerations

1. **Debounced Updates:**
   - Refresh interval prevents excessive API calls
   - Default: 30 seconds

2. **Memoization:**
   - All counting functions are memoized
   - Only re-compute when dependencies change

3. **Efficient Queries:**
   - Limited result sets (max 100)
   - Filtered queries by status
   - Date range filtering

4. **Storage Events:**
   - Cross-tab synchronization
   - Only refreshes on relevant storage keys

## Accessibility

- All badges include descriptive `aria-label` attributes
- Singular/plural notification text
- Screen reader friendly
- High contrast badge colors (error variant)

## Animation

- Smooth fade-in/out transitions (0.2s)
- Scale animation for visual feedback
- Uses `framer-motion` for performance
- Respects reduced motion preferences (via framer-motion)

## Future Enhancements

1. **Real-time Updates:**
   - WebSocket integration for instant updates
   - Supabase real-time subscriptions

2. **Badge Customization:**
   - User preferences for badge visibility
   - Custom thresholds for notifications

3. **Analytics:**
   - Track badge interaction rates
   - Optimize refresh intervals based on usage

4. **Cache Strategy:**
   - In-memory cache for badge counts
   - Reduce database queries

## Testing

To run tests (requires installed dependencies):

```bash
# Run hook tests
pnpm test tests/unit/hooks/useNavigationBadges.test.ts

# Run component tests
pnpm test tests/unit/components/layout/BottomNavigation.badges.test.tsx

# Run all tests
pnpm test:run
```

## Implementation Status

- ✅ Hook implementation
- ✅ Component integration
- ✅ Badge animations
- ✅ Accessibility features
- ✅ Unit tests (hook)
- ✅ Unit tests (component)
- ⏳ Integration tests (pending dependencies)
- ⏳ E2E tests (pending)

## Known Issues

None at this time.

## Dependencies

- `react` - Hook implementation
- `framer-motion` - Badge animations
- `@/lib/services/analysis-storage-service` - localStorage access
- `@/lib/repositories/analysis-repository` - Supabase queries
- `@/components/ui/badge` - Badge UI component

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [Component Patterns](./CONVENTIONS.md)
