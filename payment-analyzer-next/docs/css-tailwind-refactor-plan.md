# CSS & Tailwind Refactor Plan

## Executive Summary (Key Findings)
- Global stylesheet still carries 1.3k lines, imports legacy bundles, and applies transitions to every element, bloating bundles and causing repaint churn.
- Components lean on route-level class names rather than colocated styles or Tailwind primitives, making reuse and testing brittle.
- Repeated gradients and raw hex codes appear across modules instead of referencing central tokens, so visual tweaks require manual edits in many files.
- Legacy fixes rely on `!important` overrides and global selectors that fight Tailwind utilities, signalling uncontrolled cascade conflicts.
- Print and legacy workflows ship in the global bundle, forcing every page to download hundreds of selectors that most users never touch.
- Tailwind v4 is installed but nearly unconfigured, so design tokens exposed as CSS variables never surface as first-class utilities.
- Tooling lacks linting or dead-code guards, leaving the door open for regressions and future duplication.

## 1. Context
- The Next.js app mixes Tailwind utilities with 4.8k lines of legacy CSS spread across global and module scopes (`src/app/globals.css`, `src/styles/**`).
- Legacy imports (`@import '../styles/step3-enhanced-v2.css'`) drag step-specific styles into every page and keep dead selectors alive.
- Tailwind v4 is installed but only minimally configured (`tailwind.config.ts`), so design tokens defined in CSS variables (e.g. `--accent`, `--slate-*`) never surface as utilities.

## 2. Goals & Non-Goals
- **Goals**
  - Reduce global CSS to design tokens, resets, and cross-app primitives.
  - Codify the design system in Tailwind (tokens, components, utilities) and migrate components onto it.
  - Isolate legacy and print styles so they load only where required.
  - Remove duplication, `!important` overrides, and raw hex codes in favor of shared tokens.
- **Non-Goals**
  - Rewriting component logic or data flows.
  - Introducing a brand-new design language; the aim is to preserve the existing visual identity while making it maintainable.

## 3. Named Concerns
1. **Global Bloat** — `src/app/globals.css` imports two large files and applies transitions and overrides to `*`, causing unnecessary repaints and bundle size inflation.
2. **Style Drift** — Components like `ExecutiveSummary` rely on page-level classes (`executive-summary` in `dashboard.css`), preventing reuse and forcing CSS coupling.
3. **Token Fragmentation** — Identical gradients and hex values appear across modules (`actions.module.css`, `welcome.module.css`) instead of referencing the existing `:root` variables.
4. **Cascade Conflicts** — Legacy fixes (`summary-cards-fix.css`) rely on `!important`, signalling uncontrolled inheritance and making Tailwind utilities unreliable.
5. **Print and Legacy Entanglement** — Print rules and historic step flows live in the global bundle, even for users who never print reports or visit legacy flows.
6. **Tailwind Underuse** — Tailwind v4 is present but lacks theme extensions for colors, spacing, or shadows, so developers fall back to raw CSS.
7. **Testing Blind Spots** — No automated guard rails (stylelint, CSS dead-code checks) prevent regressions or reintroduction of bad patterns.

## 4. Target Architecture
- **Design Tokens**
  - Define colors, spacing, radii, shadows, and typography in `tailwind.config.ts` using the existing CSS variable values.
  - Expose tokens through Tailwind semantic names (`brand.primary`, `surface.card`, etc.) and keep the CSS custom properties as runtime fallbacks.
- **Layered Styles**
  - Use Tailwind `@layer base` for resets and tokens, `@layer components` for shared primitives, and `@layer utilities` for bespoke helpers.
  - Move print-only styles into `@layer utilities` gated by `@media print` in a dedicated file (e.g., `styles/print.css`) imported with `media="print"`.
- **Component Styling Strategy**
  - For reusable UI (buttons, cards, modals, badges), create headless components using `class-variance-authority` plus Tailwind classes.
  - Keep domain-specific layouts in colocated CSS modules or Tailwind class strings, but ensure they consume shared tokens.
- **Legacy Isolation**
  - Convert legacy CSS to route-specific modules or CSS-in-JS segments that can be lazy-loaded or deleted after parity checks.
  - Retire unused files (`step3-enhanced.css`, `legacy-step2.css`) after verifying no live references.

## 5. Workstreams & Milestones
- **Phase 0 – Audit & Guard Rails**
  - Validate unused selectors with tooling (e.g., `@fullhuman/postcss-purgecss` dry-run or `tailwindcss --compile` reports).
  - Introduce `stylelint` with Tailwind plugin and rules to block raw hex and `!important` in new code.
- **Phase 1 – Tokenization**
  - Expand `tailwind.config.ts` with color palette derived from `:root` variables, spacing scale, font families, and shadows.
  - Shrink `globals.css` to root variables, font-face imports, base resets, and app shell helpers.
- **Phase 2 – Core Primitives**
  - Implement shared Button, Card, Badge, Toast, Modal primitives with Tailwind and replace current hand-authored modules.
  - Remove `summary-cards-fix.css` and `toast-legacy.css` after migrating logic to primitives.
- **Phase 3 – Feature Modules Migration**
  - Dashboard: migrate `QuickActions`, `CalendarWidget`, `DayDataModal`, `WeeklyRevenueChart` to Tailwind plus scoped modules.
  - Reports: update `ReportHeaderBar`, `ReportKPIGrid`, and `ReportDataDisplay` to use shared primitives, then remove duplicate gradients.
  - Analysis Flow: split `step3-enhanced-v2.css` into modular Tailwind-friendly chunks or replace with component-scoped styles.
- **Phase 4 – Print & Legacy Cleanup**
  - Move print styles into `styles/report-print.css` and load with `next/head` only on report routes.
  - Delete unused legacy files, confirm no regressions via visual diffing (Playwright screenshot tests).
- **Phase 5 – Optimization & Verification**
  - Measure CSS bundle size before and after (`next build --profile`, `analyze` script).
  - Add automated tests (vitest snapshots for class names, Playwright visual coverage) to lock in new structure.

## 6. Supporting Data
- CSS footprint is 4,825 lines across 17 files; the largest are `src/app/globals.css` (1,384 lines) and `src/styles/step3-enhanced-v2.css` (742 lines).
- Eleven components import CSS modules via `import styles from ...`, while others still depend on global class names, highlighting inconsistent styling strategies.
- Tailwind config currently extends only font family and accordion animations, leaving color, spacing, and shadow tokens undefined.
- Reports page imports global theme classes like `theme-background`, confirming double dependency on legacy globals.
- Legacy fixes such as `summary-cards-fix.css` use `!important` on 13 selectors, indicating cascade struggles.

## 7. Tooling & Process Updates
- Add `stylelint` plus `stylelint-config-tailwindcss` with CI integration to enforce conventions.
- Configure `tailwind-merge` and `clsx` helpers to centralize class composition inside utilities.
- Use Storybook or dedicated preview routes to QA refactored components during migration.
- Document styling rules in `docs/STYLE_GUIDE.md` (naming rules, when to use modules versus utilities).

## 8. Risks & Mitigations
- **Regression Risk**: Large CSS removals may break less-visible states. Mitigate with screenshot tests and staggered removals.
- **Team Adoption**: Developers might fall back to custom CSS. Address with documentation, lint rules, and pairing sessions.
- **Tailwind Upgrade Unknowns**: Tailwind v4 is still stabilizing. Keep config minimal, pin version, and monitor release notes.
- **Timeline Creep**: Migrating the analysis flow (742-line file) could expand scope. Break work into sub-stories per component and track velocity.

## 9. Success Metrics & Exit Criteria
- Global CSS trimmed by at least 60 percent, with route-level CSS loaded on demand.
- Fewer than 5 percent of selectors use raw hex colors; zero new `!important` declarations.
- Tailwind config hosts canonical tokens, and documentation exists for how to extend them.
- Component catalog demonstrates shared primitives replacing bespoke CSS modules.
- Build artifacts show reduced CSS chunk size in `next build --profile` reports.

## 10. Immediate Next Steps
1. Socialize this plan with the engineering and design leads and convert each phase into tracked work items.
2. Schedule Phase 0 audit tasks (unused selector scan, stylelint introduction) to establish baselines before any refactors.
3. Draft a STYLE_GUIDE outline capturing the agreed naming and usage rules for Tailwind versus CSS modules.
4. Set up automated bundle-size reporting from `next build --profile` so changes can be measured as work progresses.

# CSS & Tailwind Refactor Plan

## 1. Current State Analysis

### Configuration & Setup
- **Tailwind Config**: `tailwind.config.ts` extends container, fonts, and keyframes; includes `content` globs (no longer used in Tailwind v4 with PostCSS plugin)
- **Tailwind Version**: v4 is installed and uses `@import "tailwindcss";` instead of `@tailwind` directives (correct for v4)
- **Global CSS**: `src/app/globals.css` (~1,384 lines) defines theme tokens, dark scheme, broad print styles, and legacy blocks

### CSS File Organization
- **Heavy globals**: Single massive file mixing concerns (tokens, resets, print, legacy, component styles)
- **Feature CSS mix**: 
  - Large global files like `src/app/(dashboard)/dashboard/dashboard.css` (~569 lines)
  - Several `.module.css` files under `src/styles/` and subfolders (proper scoping)
  - Non-module `.css` files (global scope, risk of collisions)
- **Utility usage**: Components use Tailwind classes extensively (grids, spacing), mixed with global classes (e.g., `.dashboard-content`) and CSS Modules
- **Centralized TS styles**: `src/styles/analysis-styles.ts` groups Tailwind utility strings for analysis pages

### Pattern Analysis
- **Mixed strategies**: Tailwind utilities + global CSS + CSS Modules without clear boundaries
- **Naming collisions**: Most `.css` files don't follow `.module.css` convention (except `analysis-page.module.css`, `report-*.module.css`)
- **Token duplication**: Components replicate design tokens (colors, spacing) as raw values instead of using CSS variables from `:root`
- **Inconsistent scoping**: `dashboard.css` is plain global CSS; others like `actions.module.css`, `welcome.module.css` use modules

## 2. Key Issues

### Over-reliance on Global CSS
- **Bloated globals.css**: Contains UI classes, theme variables, print overrides, and legacy styles in one file
  - Hard to reason about
  - Brittle cascade
  - Everything loads upfront
- **Large global page CSS**: `dashboard.css` introduces global class names instead of CSS Modules or Tailwind utilities
  - Prevents component reuse
  - Forces CSS coupling
  - Risk of naming collisions

### Tailwind Anti-Patterns
- **Utility class selectors in CSS**: Overriding Tailwind utilities (`.text-slate-900`, `.grid`, `.flex`) with `!important` in `@media print` blocks
  - Found at `globals.css:251`
  - Broad scope with unintended interactions
  - Anti-pattern for maintenance
- **231 occurrences of `!important`**: Many in global/print overrides
  - Hard to maintain and debug
  - Signals uncontrolled inheritance
  - Makes Tailwind utilities unreliable
  - Necessary for print in some cases, but overused

### Theme Duplication and Drift
- **Repeated raw values**: Color scales and sizes duplicated across many CSS files
  - Tokens exist in `:root` but files hardcode hex/px values
  - Identical gradients in `actions.module.css`, `welcome.module.css`
  - Should reference shared variables or Tailwind scale
- **Dark mode parallel paths**: Both `.dark` and `@media (prefers-color-scheme: dark)` in `globals.css`
  - Creates duplicate code paths
  - Risk of inconsistency
  - Need to keep in sync

### Legacy Blocks Embedded in Globals
- **Legacy-step2 section**: Lives inside `globals.css:744`
  - Large block in global bundle
  - No usages found outside analysis code
  - Likely dead or should be isolated
  - Domain-specific class in global scope

### Tailwind v4 Config Leftovers
- **`content` property in `tailwind.config.ts`**: v3 concept, redundant with v4 + `@tailwindcss/postcss`
  - Confusing for future developers
  - v4 scans automatically via PostCSS
  - Should be removed and documented

## 3. Impact

### Maintainability
- Mixed strategy (Tailwind + global CSS + CSS Modules) without clear boundaries
- Slows change velocity
- Introduces regressions
- New developers unsure which approach to use

### Performance & Compatibility
- Mass `!important` overrides risk cross-page issues
- Global print resets affect all pages
- Large CSS bundle loaded upfront (~1,384 lines in globals alone)
- Print styles in global bundle even for non-printing users

### Theming Velocity
- Tokens exist but not integrated with Tailwind's theme
- Utility-first composition can't leverage design system directly
- Developers fall back to raw CSS instead of utilities

### Bundle Size
- Duplicate legacy/near-duplicate styles (e.g., large "Step 3" and dashboard CSS)
- Inflate compiled CSS
- No tree-shaking of unused global styles

## 4. Refactor Strategy

### Guiding Principle
Keep Tailwind for 80–90% of layout/spacing/typography; use CSS Modules for component-specific visuals; keep globals minimal (tokens, base, app-wide rules) and isolate print/legacy.

### Execution Sequence
Low risk first (structure + config) → high-churn UI → special cases consolidation

## 5. Implementation Phases

### Phase 1 — Baseline Cleanup (Low Risk)

#### Tailwind v4 Hygiene
- **Remove `content` from `tailwind.config.ts`**
  - Document v4 scanning via PostCSS
  - Add comment explaining automatic scanning
- **Keep `darkMode: 'class'`**
  - Document app strategy: class-driven dark mode with optional system fallback
  - Remove redundant `@media (prefers-color-scheme: dark)` where duplicate

#### Globals Split by Concern
- **Keep only tokens and base scaffolding in `globals.css`**
  - Design tokens (CSS variables)
  - Font imports
  - Base resets
  - App shell helpers
- **Move print block to `src/styles/print.css`**
  - Extract from `globals.css:251`
  - Import from `globals.css` initially (or use conditional import)
  - Later: load only on print routes
- **Move legacy blocks to `src/styles/legacy.css`**
  - Extract `.legacy-step2` section from `globals.css:744`
  - Keep import off by default
  - Load only where verified needed

#### Reduce Global Transitions
- **Remove/limit `* { transition: background-color ... }`**
  - Apply to specific elements or use `motion-safe:` utilities
  - Avoid unexpected transitions and repaints

#### Adopt Tailwind Theme Tokens
- **Add `@theme` tokens**
  - Create small theme file or add to top of `globals.css`
  - Map CSS variables to Tailwind tokens
  - Example: `--color-background: var(--background)`
  - Enable `bg-background`, `text-foreground`, etc.

### Phase 2 — Print Strategy (Medium Risk, High Payoff)

#### Replace Global Class Overrides with Tailwind's `print:` Variant
- **Use `print:*` utilities for controlled markup**
  - Headings: `print:text-black`
  - Tables: `print:border-solid`
  - Spacing: `print:mb-2`
- **For generated/3rd-party content**
  - Create scoped wrapper `.printable`
  - Add targeted component-level overrides
  - Avoid changing `.grid`, `.flex`, `.text-*` globally

#### Create Print Utilities with `@layer utilities`
- **Examples**:
  - `.print-table`: optimized table layout for print
  - `.print-card`: print-friendly card styles
  - `.print-mono`: monospace for money values
- **Compose in components/pages as needed**

#### Remove Broad `!important` Usage
- **Use Tailwind `!` prefix on specific utilities**
  - Example: `print:!text-slate-900`
  - Explicit and scoped
- **Narrow CSS selectors within `@media print`**
  - Target specific components, not utility classes
- **Goal**: Reduce from 231 to <20 occurrences

### Phase 3 — Componentization and Scope (Medium Risk)

#### Convert Large Global Page CSS to CSS Modules
- **`dashboard.css` → `dashboard.module.css`**
  - ~569 lines to convert
  - Adopt `styles.dashboardContent`, etc.
  - Keep semantic class names where needed
  - Use local scoping to avoid global leaks and `!important`
- **Repeat for other global page CSS files**

#### Use Tailwind Utilities for Common Layout/Spacing
- **Replace raw values in CSS with Tailwind utilities in JSX**
  - `font-size` → `text-lg`, `text-xl`
  - `padding` → `p-4`, `px-6`
  - `gap` → `gap-4`
  - `border-radius` → `rounded-lg`
- **Keep complex visuals/animations in CSS Modules**
- **Move repetitive values to Tailwind tokens**

#### Consolidate Style Constants
- **Continue using `src/styles/analysis-styles.ts`** for analysis-specific variants
- **Consider extending to dashboard/report domains**
  - Reduce duplication
  - Centralize variant management
  - Type-safe style composition

### Phase 4 — Theme Integration (Medium Risk)

#### Map Tokens to Tailwind Theme
- **Expose brand colors, semantic colors, radii, and spacing**
  - Via `tailwind.config.ts` theme extension
  - Enable: `bg-brand`, `text-muted`, `rounded-lg` consistently
- **Bridge CSS variables with Tailwind utilities**
  - Use existing `:root` values
  - Create semantic Tailwind tokens

#### Normalize Dark Mode
- **Prefer class-based `.dark`**
  - Single source of truth
  - Programmatic control
- **Ensure all token-based colors swap via variables**
- **Remove redundant `@media (prefers-color-scheme: dark)` blocks**
  - Keep only if system preference detection needed
  - Document the strategy

### Phase 5 — Legacy, Dead Code, and Duplicates (Low/Medium Risk)

#### Verify and Remove Unused Legacy Blocks
- **Audit `.legacy-step2` usage**
  - Search codebase for references
  - If truly unused, delete
  - If needed, load only on legacy routes (dynamic import or route-level CSS)

#### Audit Duplicates
- **Large "Step 3" and dashboard CSS blocks**
  - Identify near-duplicate rules
  - Fold remaining into modules or Tailwind utilities
  - Remove redundancy

#### CSS File Organization
- **Structure**:
  ```
  styles/
    base/
      globals.css       # tokens + base resets only
      print.css         # print-specific utilities
    modules/
      *.module.css      # component/page-level CSS Modules
  ```
- **Keep reports and dashboard modularized**
- **Avoid new globals**

## 6. Guardrails & Tooling

### Conventions
- **Tailwind for structure/layout**: Grids, flexbox, spacing, typography
- **CSS Modules for component visuals**: Complex styling, animations, special cases
- **Zero new globals**: Exception for true app-wide primitives
- **No overriding Tailwind utilities in global CSS**: If necessary, scope to feature wrapper or print wrapper

### Linting & Formatting
- **Stylelint with Tailwind plugin** (optional)
  - Enforce class order
  - Block `!important` in new code
  - Use `no-restricted-selectors` rule
- **Prettier with Tailwind class sorter** (optional if already configured)
  - Consistent class order
  - Better diffs

### Utilities
- **Continue using `clsx`/`tailwind-merge`** for composed classnames
- **Centralize helpers**: e.g., `cn()` utility in one location
- **Type-safe style composition**: Continue pattern from `analysis-styles.ts`

## 7. Concrete Next Steps

### Immediate Actions (Week 1)
1. **Create `src/styles/print.css`**
   - Move `@media print` block from `globals.css:251`
   - Import from `globals.css` with `@import "print.css";`
   
2. **Create `src/styles/legacy.css`**
   - Move `.legacy-step2` block from `globals.css:744`
   - Disable import initially (comment out)
   - Search for usage before deciding to keep/delete

3. **Strip `content` from `tailwind.config.ts`**
   - Remove the property
   - Add comment: `// Tailwind v4 scans automatically via @tailwindcss/postcss`
   - Document v4 behavior in README

4. **Add `@layer` wrappers in `globals.css`**
   - Wrap custom rules in `@layer base`, `@layer components`, or `@layer utilities`
   - Enables predictable ordering
   - Natural reduction of `!important` usage

### Pilot Conversion (Week 2)
5. **Convert `dashboard.css` to `dashboard.module.css`**
   - Rename file
   - Update imports in `page.tsx`
   - Use module classes: `styles.dashboardContent`, etc.
   - Replace easy spacing with Tailwind utilities (e.g., `padding: 20px` → `p-5`)
   - Test thoroughly

6. **Add theme tokens**
   - Introduce `@theme` mapping for:
     - `background`, `foreground`
     - `accent`, `muted`
     - States (success, error, warning)
   - Update a couple of components to use `bg-background`, `text-foreground`
   - Validate developer experience

### Validation (Week 2-3)
7. **Search for usage patterns**
   - `.legacy-step2` class usage
   - Other domain-specific classes
   - Print override impact
   
8. **Measure baseline**
   - CSS bundle size (`next build --profile`)
   - Count of `!important` occurrences
   - Global CSS line count

## 8. Success Metrics

### Quantitative
- Global `globals.css` reduced from 1,384 lines to <400 lines
- `!important` occurrences reduced from 231 to <20
- CSS bundle size reduction of 30%+ (measured via `next build`)
- Zero new global CSS files (all new styles in modules or Tailwind)

### Qualitative
- Clear separation of concerns (tokens, base, components, utilities)
- Developers can find styles quickly
- New features use Tailwind-first approach
- Print styles isolated and maintainable
- Dark mode uses single strategy (class-based)

### Exit Criteria
- [ ] `content` removed from `tailwind.config.ts`
- [ ] Print styles in separate file
- [ ] Legacy blocks isolated or removed
- [ ] At least one page CSS converted to CSS Module (dashboard)
- [ ] Theme tokens mapped to Tailwind
- [ ] Documentation updated (README, STYLE_GUIDE.md)
- [ ] No regressions in visual tests

## 9. Risks & Mitigations

### Regression Risk
- **Risk**: Large CSS removals may break less-visible states
- **Mitigation**: 
  - Staggered removals
  - Screenshot tests (Playwright)
  - Manual QA of key flows
  - Feature flags for gradual rollout

### Team Adoption
- **Risk**: Developers might fall back to custom CSS
- **Mitigation**: 
  - Clear documentation (`docs/STYLE_GUIDE.md`)
  - Lint rules blocking anti-patterns
  - Pairing sessions
  - Code review checklist

### Tailwind v4 Stability
- **Risk**: Tailwind v4 is still stabilizing
- **Mitigation**: 
  - Keep config minimal
  - Pin version in `package.json`
  - Monitor release notes
  - Test thoroughly before upgrading

### Timeline Creep
- **Risk**: Analysis flow migration (742-line file) could expand scope
- **Mitigation**: 
  - Break work into sub-stories per component
  - Track velocity
  - Time-box explorations
  - Defer non-critical work to later phases

## 10. Long-Term Vision

### Target State
- **Minimal globals**: <400 lines (tokens + base resets + app shell)
- **Tailwind-first**: 80-90% of styling via utilities
- **Modular components**: All page/component styles in `.module.css` or inline Tailwind
- **Isolated special cases**: Print and legacy styles load on-demand
- **Design system**: Tailwind theme reflects brand tokens, easily extendable

### Maintenance Mode
- **Stylelint CI checks**: Block new anti-patterns
- **Automated tests**: Visual regression coverage
- **Documentation**: Living style guide for new developers
- **Periodic audits**: Review CSS bundle size, unused styles
