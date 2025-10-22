# Code Conventions & Standards

**Last Updated**: December 2025
**For**: Code style and best practices

---

## File Naming

| Type | Convention | Example |
|------|-----------|----------|
| Components | PascalCase | `Button.tsx`, `FileUploadArea.tsx` |
| Hooks | camelCase with `use` | `use-file-upload.ts`, `useSessionRecovery.ts` |
| Services | kebab-case + `-service` | `analysis-service.ts` |
| Utils | kebab-case | `storage-cleanup.ts` |
| Entities | kebab-case | `analysis.ts`, `daily-entry.ts` |
| CSS Modules | kebab-case + `.module.css` | `calendar.module.css` |

---

## TypeScript Configuration

**Strict Mode**: ✅ ENABLED

```typescript
{
  "strict": true,
  "noEmit": true,
  "esModuleInterop": true,
  "moduleResolution": "bundler"
}
```

**Path Aliases**:
```typescript
"@/*": ["./src/*"]
"@/tests/*": ["./tests/*"]
```

**Usage**:
```typescript
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
```

---

## Styling Approach

### Tailwind-First (80-90%)

```tsx
<div className="flex gap-4 p-6 bg-background">
  <Button variant="primary" size="md">Click</Button>
</div>
```

### CSS Modules for Complexity (10-20%)

```tsx
import styles from './component.module.css';

<div className={cn(styles.container, className)}>
  ...
</div>
```

### Class Composition Utility

```typescript
import { cn } from '@/lib/utils';

<button className={cn(
  'base-class',
  styles.customClass,
  isActive && 'active-state',
  className
)}>
```

---

## ESLint Rules

```javascript
rules: {
  "@typescript-eslint/no-unused-vars": ["warn", {
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_"
  }]
}
```

**Tip**: Prefix unused variables with `_`

---

## Import Organization

```typescript
// 1. External libraries
import { useState, useCallback } from 'react';
import { cva } from 'class-variance-authority';

// 2. Internal utilities
import { cn } from '@/lib/utils';

// 3. Internal services/hooks
import { useFileUpload } from '@/hooks/use-file-upload';

// 4. Components
import { Button } from '@/components/ui/button';

// 5. Types
import type { Analysis } from '@/lib/domain/entities/analysis';
```

---

## Component Pattern

```typescript
/**
 * Component Description
 */
import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const variants = cva(/* ... */);

export interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary';
}

const Component = forwardRef<HTMLDivElement, Props>(({
  variant, className, ...props
}, ref) => {
  return (
    <div ref={ref} className={cn(variants({ variant }), className)} {...props} />
  );
});

Component.displayName = 'Component';

export { Component, variants };
```

---

## Commit Conventions

### Format

```
type: description

feat: add user profile page
fix: resolve payment calculation (CRITICAL)
refactor: extract file upload logic
docs: update API documentation
test: add payment calculator tests
```

### Types

- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `docs:` - Documentation
- `test:` - Tests
- `style:` - Formatting
- `chore:` - Maintenance

### Severity (optional)

- `(CRITICAL)` - Production issues
- `(MEDIUM)` - Important fixes
- `(PHASE X)` - Refactoring phases

---

## Best Practices

### ✅ DO

- Use `pnpm` (NOT npm or yarn)
- Use TypeScript strict mode
- Prefer Tailwind utilities
- Use CSS variables for colors
- Extract reusable logic to hooks
- Keep components <200 lines
- Write JSDoc comments
- Run type-check regularly

### ❌ DON'T

- Use `any` type
- Hardcode colors
- Use inline styles
- Create 500+ line components
- Skip type checking
- Use `!important` (except legacy CSS)
- Import from node_modules source

---

## Code Quality Checklist

Before committing:

- ✅ `pnpm docker:type-check` passes
- ✅ `pnpm lint` passes
- ✅ `pnpm test:run` passes
- ✅ No console.log statements
- ✅ Code formatted consistently
- ✅ Comments added for complex logic
- ✅ No TODO comments
- ✅ Imports organized

---

## Quick Reference

```bash
# Type checking
pnpm docker:type-check   # <10s

# Linting
pnpm lint                # Check
pnpm lint:fix            # Auto-fix

# CSS
pnpm lint:css            # Check CSS
pnpm lint:css:fix        # Auto-fix CSS
```

---

**For More Details:**
- TypeScript Config → `tsconfig.json`
- ESLint Config → `eslint.config.mjs`
- Tailwind Config → `tailwind.config.ts`
