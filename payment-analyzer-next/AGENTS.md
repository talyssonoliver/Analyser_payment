# Repository Guidelines

## Project Structure & Module Organization
This Next.js 15 app keeps route handlers and layouts in src/app, shared UI in src/components, and reusable logic in src/lib and src/hooks. Styles live under src/styles, runtime types in src/types, and static assets in public/. Automated analysis data sits in nalyze/, while Supabase SQL/config lives in supabase/. Keep docs inside docs/ and automation helpers in scripts/; tests mirror features under 	ests/{unit,integration,e2e} with fixtures and mocks beside them.

## Build, Test, and Development Commands
Install deps with pnpm install. Use pnpm dev for local work, or pnpm dev:turbo when tracing. Ship production builds through pnpm build or inspect bundles via pnpm build:analyze. Type and lint gates are pnpm type-check, pnpm lint, and pnpm lint:fix. Database upkeep runs through pnpm db:migrate and pnpm db:maintenance.

## Coding Style & Naming Conventions
ESLint (flat config extending 
ext/core-web-vitals) is the source of truth; code must pass pnpm lint. Stick to TypeScript, 2-space indentation, and idiomatic Next separation between server/client components. Name components in PascalCase, hooks as useThing, and utilities with kebab-case filenames. Order Tailwind classes layout ? spacing ? typography ? color for readability.

## Testing Guidelines
Place unit and integration specs beneath 	ests/unit or 	ests/integration, mirroring the feature path (src/components/InvoiceTable ? 	ests/unit/components/invoice-table.spec.tsx). Run them with pnpm exec vitest --run. End-to-end Playwright flows stay in 	ests/e2e and execute via pnpm exec playwright test; re-run with PWDEBUG=1 when capturing traces. Store shared fixtures in 	ests/fixtures and network doubles in 	ests/mocks. Every bug fix should ship with a regression test.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (eat:, ix:, docs:) as visible in the history; include a scope when it clarifies intent. PRs need a short summary, linked issue or ticket, and the commands you ran (pnpm lint, pnpm type-check, relevant tests). Attach screenshots or trace artifacts for UI or Playwright changes, and wait for CI parity before requesting review.
