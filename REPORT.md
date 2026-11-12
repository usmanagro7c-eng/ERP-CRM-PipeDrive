# UI Polish Report

Branch: `ui-polish`
Date: 2026-11-12

## 1. Before/after screenshots
- Baseline screenshots: not captured (audit tooling deferred; see known issues).
- After baselines saved to `e2e/visual.spec.ts-snapshots/` (dashboard, organizations, deals × light/dark on Desktop).

## 2. Lighthouse / axe scores
- axe-core (@axe-core/playwright): 10 routes scanned, 0 serious/critical violations (Desktop project).
- Lighthouse: not run (Chrome headless via installed Chromium not wired); deferred.

## 3. Changes by phase
- Phase 1 Tooling: npm ci, approved install scripts, Playwright config with 7 viewport projects, mock Frappe server.
- Phase 2 Test infra: `scripts/mock-frappe.mjs` (seeded 40 orgs, 60 leads, 50 deals + contacts/tasks/notes/calls/quotations/sales orders with stress data), `scripts/dev-test.mjs`, npm scripts (mock, dev:test, test:e2e, test:a11y, audit:lighthouse).
- Phase 4 Design tokens: added semantic status colors (won/lost/open/overdue) to `src/styles.css` (light + dark, oklch), safe-area helpers.
- Phase 5 Mobile: bottom navigation in `src/components/app-shell.tsx` (Dashboard, Leads, Deals, Contacts, More), safe-area padding, mobile header simplified.
- Phase 7 UX: login form converted to uncontrolled inputs with refs (works with automated tests and real input).
- Phase 8 A11y: aria-labels on icon buttons (contact kanban more actions, sales-orders status filter), focus rings via existing shadcn classes.
- Phase 9 Tests: smoke E2E, axe a11y suite, visual regression baselines.
- Phase 10 Report: this file.

## 4. Tools/skills installed
- MCP available: playwright, rea, opencode. Missing (not configured): shadcn, context7, chrome-devtools.
- Skills: frontend-design, vercel-react-best-practices available; webapp-testing now available; web-design-guidelines not installed.
- Playwright Chromium installed to D:\pw-browsers (C: drive full).

## 5. Intentionally not changed / known issues
- Card-list mobile tables, bottom sheets (vaul), kanban touch drag, split view, column chooser, command palette shortcuts help, celebration effect, optimistic kanban moves, undo toast, skeletons beyond existing: deferred due to scope/time.
- Visual regression only for 3 screens × 2 themes on Desktop (not all viewports).
- Lighthouse not executed.
- Baseline `ui-audit/before/` screenshots not captured.
- UI_AUDIT.md not written.

## 6. Manual checklist
- Test on real iPhone and Android.
- Real dev03/dev06 smoke test.
- Rotate any secrets.
- Review branch before merging.