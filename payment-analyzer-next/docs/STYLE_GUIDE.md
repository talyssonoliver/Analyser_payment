# Payment Analyzer - Style Guide

> **Last Updated:** October 2025  
> **Tailwind Version:** v4.x  
> **Architecture:** Tailwind-first with CSS Modules for complex components

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Tailwind v4 Configuration](#tailwind-v4-configuration)
4. [CSS Layering Strategy](#css-layering-strategy)
5. [When to Use What](#when-to-use-what)
6. [Design Tokens](#design-tokens)
7. [Component Styling Patterns](#component-styling-patterns)
8. [Print Styling](#print-styling)
9. [Dark Mode](#dark-mode)
10. [Migration Patterns](#migration-patterns)
11. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
12. [Tooling & Linting](#tooling--linting)

---

## Overview

This project uses a **Tailwind-first** approach with strategic use of CSS Modules for complex, reusable components. The styling architecture is designed to:

- **Minimize global CSS** to design tokens, resets, and base styles
- **Leverage Tailwind utilities** for 80-90% of styling needs
- **Use CSS Modules** for component-specific styles that can't be elegantly expressed with utilities
- **Isolate legacy code** to prevent cascade conflicts
- **Centralize print styles** for report generation

---

## Architecture Principles

### 1. **Utility-First Development**
Start with Tailwind utilities. Only reach for custom CSS when:
- Complex state-dependent styling (e.g., multi-step wizards)
- Component-specific animations
- Print-specific overrides
- Reusable component patterns that need scoped naming

### 2. **Predictable Cascade**
All custom CSS must be wrapped in `@layer` directives:
- `@layer base` - Resets, typography, design tokens
- `@layer components` - Reusable component classes
- `@layer utilities` - Custom utility classes, print helpers

### 3. **Zero Global Collisions**
- Use `.module.css` for component-specific styles
- Never use plain `.css` files outside of `src/styles/base/` or `src/app/globals.css`
- All route-level styles must be CSS Modules

### 4. **Token-Driven Design**
- Reference CSS variables from `globals.css` (e.g., `var(--accent)`)
- Extend Tailwind theme with tokens in `tailwind.config.ts`
- Never hardcode colors, spacing, or shadows in components

---

## Tailwind v4 Configuration

### Key Changes from v3

**✅ What's Different:**
- `@import "tailwindcss"` instead of `@tailwind` directives
- No `content` property in config (auto-scans via PostCSS plugin)
- Theme tokens exposed via `@theme` directive in CSS
- Enhanced CSS variable support

**Configuration File:** `tailwind.config.ts`

```typescript
// Tailwind v4 - minimal config, tokens defined in globals.css
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
      // Colors, spacing, shadows extended from CSS variables
    }
  }
};
export default config;
```

### CSS Theme Definition

**File:** `src/app/globals.css`

```css
@import "tailwindcss";

@theme {
  /* Design tokens exposed to Tailwind */
  --color-brand-primary: #3b82f6;
  --color-brand-secondary: #2563eb;
  --spacing-card: 1.5rem;
}
```

---

## CSS Layering Strategy

### File Organization

```
src/
├── app/
│   └── globals.css           # Design tokens, base styles, layers
├── styles/
│   ├── base/
│   │   ├── print.css        # Print-specific utilities (@layer utilities)
│   │   └── reset.css        # Base resets (@layer base)
│   ├── legacy/
│   │   └── legacy.css       # Isolated legacy styles (load on-demand)
│   └── *.module.css          # Component modules (scoped by Next.js)
└── components/
    └── **/*.module.css       # Component-specific modules
```

### Layer Usage

**`@layer base`** - Foundation
```css
@layer base {
  body {
    font-family: var(--font-primary);
    color: var(--foreground);
  }
  
  h1, h2, h3 {
    font-weight: 600;
    line-height: 1.2;
  }
}
```

**`@layer components`** - Reusable patterns
```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-lg;
    @apply hover:bg-blue-700 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-md p-6;
  }
}
```

**`@layer utilities`** - Custom helpers
```css
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .print-only {
    display: none;
  }
}
```

---

## When to Use What

### Decision Matrix

| Scenario | Approach | Example |
|----------|----------|---------|
| **Simple layout** | Tailwind utilities | `<div className="flex gap-4 p-6">` |
| **Button/Badge variants** | `class-variance-authority` + Tailwind | `<Button variant="primary" size="sm">` |
| **Complex component** | CSS Module | `import styles from './card.module.css'` |
| **Global pattern** | `@layer components` | `.btn-primary` in `globals.css` |
| **Print-specific** | `@layer utilities` | `.print-only` in `print.css` |
| **Legacy isolation** | Scoped CSS file | `legacy.css` loaded conditionally |

### Examples

**✅ Good: Tailwind for layout**
```tsx
<div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 rounded-lg">
  <Card />
</div>
```

**✅ Good: CSS Module for component**
```tsx
// chart.module.css
.chartContainer {
  position: relative;
  aspect-ratio: 16 / 9;
}

.chartCanvas {
  position: absolute;
  inset: 0;
}
```

**❌ Bad: Inline styles**
```tsx
<div style={{ padding: '24px', background: '#f8fafc' }}> {/* NO! */}
```

**❌ Bad: Plain CSS file**
```css
/* dashboard.css - AVOID! Use dashboard.module.css */
.dashboard-header { /* Global pollution */ }
```

---

## Design Tokens

### Color System

**Defined in:** `src/app/globals.css`

```css
:root {
  /* Brand Colors */
  --accent: #3b82f6;
  --accent-dark: #2563eb;
  
  /* Semantic Colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  
  /* Neutral Palette */
  --slate-50: #f8fafc;
  --slate-100: #f1f5f9;
  --slate-200: #e2e8f0;
  /* ... */
  --slate-900: #0f172a;
  
  /* Surface Colors */
  --background: #ffffff;
  --foreground: #0f172a;
  --card-background: #ffffff;
}
```

### Using Tokens

**In Tailwind (via theme extension):**
```tsx
<div className="bg-brand-primary text-white">
```

**In CSS Modules:**
```css
.button {
  background: var(--accent);
  color: white;
}

.button:hover {
  background: var(--accent-dark);
}
```

**Never do this:**
```css
/* ❌ Hardcoded values */
.button {
  background: #3b82f6; /* NO! Use var(--accent) */
  color: #ffffff;
}
```

---

## Component Styling Patterns

### Button Component Example

**Using `class-variance-authority`:**

```tsx
// button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300',
        outline: 'border border-slate-300 hover:bg-slate-50',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  className?: string;
}

export function Button({ variant, size, className, children }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)}>
      {children}
    </button>
  );
}
```

### Complex Component with CSS Module

```tsx
// chart-widget.tsx
import styles from './chart-widget.module.css';

export function ChartWidget({ data }: Props) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-md"> {/* Tailwind for card */}
      <div className={styles.chartContainer}> {/* Module for complex layout */}
        <canvas ref={canvasRef} className={styles.chartCanvas} />
      </div>
    </div>
  );
}
```

```css
/* chart-widget.module.css */
@layer components {
  .chartContainer {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
  }

  .chartCanvas {
    position: absolute;
    inset: 0;
    max-width: 100%;
    max-height: 100%;
  }
}
```

---

## Print Styling

### Centralized Print Utilities

**File:** `src/styles/base/print.css`

All print-specific styles live here, wrapped in `@media print` and `@layer utilities`.

### Print-Only Elements

```tsx
// Show in print only
<div className="print-only">
  <h1>Report Header</h1>
</div>

// Hide in print
<button className="no-print">Download PDF</button>
```

### Print Section Isolation

For printing specific sections:

```tsx
function ReportPage() {
  const handlePrint = () => {
    document.body.classList.add('print-mode');
    window.print();
    document.body.classList.remove('print-mode');
  };

  return (
    <>
      <button onClick={handlePrint} className="no-print">Print</button>
      <div className="print-section">
        {/* Only this content will print */}
      </div>
    </>
  );
}
```

**CSS (already in `print.css`):**
```css
@media print {
  body.print-mode * {
    visibility: hidden;
  }
  
  body.print-mode .print-section,
  body.print-mode .print-section * {
    visibility: visible;
  }
  
  body.print-mode .print-section {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
```

### Print Guidelines

✅ **Do:**
- Use utility classes from `print.css`
- Set `@page` margins for A4
- Use `break-inside: avoid` for tables/cards

❌ **Don't:**
- Add inline print styles via `<style>` tags
- Override Tailwind utilities with `!important` in print
- Embed print CSS in component modules

---

## Dark Mode

### Implementation Strategy

**Current:** Class-based dark mode via Next.js `dark` class

**Token Definition:**
```css
:root {
  --background: #ffffff;
  --foreground: #0f172a;
}

.dark {
  --background: #0f172a;
  --foreground: #f8fafc;
}
```

### Usage

**In Tailwind:**
```tsx
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
```

**In CSS Modules:**
```css
.card {
  background: var(--card-background);
  color: var(--foreground);
}
```

### Dark Mode Checklist

- [ ] Use semantic tokens (`--foreground`, `--background`) instead of raw colors
- [ ] Test all components in both modes
- [ ] Ensure contrast ratios meet WCAG AA (4.5:1 for text)
- [ ] Use `dark:` variants for Tailwind overrides

---

## Migration Patterns

### Migrating from Global CSS to Tailwind

**Before (global CSS):**
```css
/* dashboard.css */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  padding: 24px;
  background: #f8fafc;
}
```

**After (Tailwind):**
```tsx
<header className="flex justify-between p-6 bg-slate-50">
```

### Migrating to CSS Module

**Before (global CSS):**
```css
/* actions.css */
.quick-action-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 12px;
}
```

**After (CSS Module):**
```tsx
// quick-actions.tsx
import styles from './quick-actions.module.css';

<div className={styles.actionCard}>
```

```css
/* quick-actions.module.css */
@layer components {
  .actionCard {
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
    padding: 1.25rem;
    border-radius: 0.75rem;
  }
}
```

---

## Anti-Patterns to Avoid

### ❌ Don't: Hardcode Colors

```tsx
<div style={{ color: '#3b82f6' }}> {/* NO! */}
```

### ❌ Don't: Use `!important` in Components

```css
.my-class {
  color: blue !important; /* Avoid unless absolutely necessary */
}
```

**Exception:** Print styles and legacy overrides (isolated).

### ❌ Don't: Create Plain `.css` Files

```
src/
  components/
    header.css  ❌ Should be header.module.css
```

### ❌ Don't: Override Tailwind in Global CSS

```css
/* globals.css */
.text-blue-600 {
  color: red !important; /* NEVER DO THIS */
}
```

### ❌ Don't: Mix Strategies in One Component

```tsx
// BAD: Mixing inline styles, global classes, and Tailwind
<div style={{ padding: 12 }} className="dashboard-card flex gap-4">
```

### ✅ Do: Pick One Strategy

```tsx
// GOOD: Pure Tailwind
<div className="p-3 bg-white rounded-lg flex gap-4">

// GOOD: CSS Module for complex styling
<div className={styles.card}>
```

---

## Tooling & Linting

### Recommended VS Code Extensions

- **Tailwind CSS IntelliSense** - Autocomplete for utilities
- **PostCSS Language Support** - Syntax highlighting
- **Stylelint** - CSS linting

### Stylelint Configuration

**File:** `.stylelintrc.json`

```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  "rules": {
    "at-rule-no-unknown": [true, {
      "ignoreAtRules": ["tailwind", "layer", "apply", "theme"]
    }],
    "declaration-no-important": true,
    "color-no-hex": true,
    "unit-disallowed-list": ["px"]
  }
}
```

### Pre-commit Hooks

```json
// package.json
{
  "scripts": {
    "lint:css": "stylelint '**/*.css'",
    "format:css": "stylelint '**/*.css' --fix"
  }
}
```

---

## File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| **Global styles** | `globals.css` | `src/app/globals.css` |
| **Base styles** | `*.css` (in `styles/base/`) | `src/styles/base/print.css` |
| **Component modules** | `*.module.css` | `card.module.css` |
| **Legacy isolation** | `legacy.css` | `src/styles/legacy.css` |

---

## Quick Reference

### Import Order

```tsx
// 1. External CSS (if needed)
import 'external-library/styles.css';

// 2. Global styles (automatic in _app.tsx)
import '@/app/globals.css';

// 3. Component modules
import styles from './component.module.css';

// 4. Component code
export function Component() {}
```

### Class Composition

```tsx
import { cn } from '@/lib/utils'; // tailwind-merge + clsx

<div className={cn(
  'base-class', // Base Tailwind
  styles.customClass, // CSS Module
  isActive && 'active-state', // Conditional
  className // Prop override
)}>
```

---

## Summary

✅ **Use Tailwind** for 80-90% of styling (layout, spacing, colors, typography)  
✅ **Use CSS Modules** for complex components (charts, wizards, animations)  
✅ **Use `@layer`** for all custom CSS (base, components, utilities)  
✅ **Reference tokens** from `globals.css` (`var(--accent)`)  
✅ **Centralize print** styles in `src/styles/base/print.css`  
✅ **Isolate legacy** code in separate files loaded on-demand  
✅ **Lint and automate** to prevent regressions  

---

**Questions or Improvements?** Update this guide as patterns evolve. Keep it pragmatic, not dogmatic.
