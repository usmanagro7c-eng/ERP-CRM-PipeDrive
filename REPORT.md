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

## 7. Follow-up: "login not working / wrong data" incident (2026-11-12)

**Symptom:** sign-in appeared to fail and the lists showed generated data instead of live CRM records.

**Root cause:** the _test_ stack was left running on the developer's port. `npm run dev:test` (mock Frappe backend on `:8099`, seeded records, `ALLOWED_USERS=*`) was serving **http://localhost:5173**, the same port `npm run dev` uses. A second `npm run dev` then silently moved to `:5174`, so the browser on `:5173` kept talking to the mock: fake organisations (`ORG-001`), fake leads and a session that does not match the real account.

**Not a product bug.** Verified against the live `dev03` backend with the real account:

- `POST /api/auth/login` → 200, `GET /api/auth/me` → `{"user":"…","name":"Usman"}`
- `/dashboard`, `/organizations`, `/deals`, `/leads`, `/contacts`, `/notes` → 200 with live records
- 0 console errors, 0 failed requests (only the expected pre-login `401 /api/auth/me`)
- `CRM Industry` / `CRM Territory` link queries → 200

**Guard rails added**

- `scripts/dev-test.mjs` now runs the test stack on **port 5180** (`--strictPort`); `npm run dev` keeps 5173 and can no longer be hijacked by the mock.
- `npm run dev` uses `--strictPort`, so a busy 5173 fails loudly instead of quietly moving to another port.
- The app shows a **"TEST DATA · mock backend"** badge whenever it runs against the mock (`VITE_TEST_DATA=1`), so generated records can never be mistaken for live data.
- `playwright.config.ts` points at 5180; the e2e stack no longer interferes with a running dev server.
- `scripts/check-secrets.mjs` ignores `.ui-audit-cache/` and `ui-audit/` (audit artefacts are not source).

**Housekeeping**

- ESLint: 0 errors (11 pre-existing `react-refresh` warnings). `.agents/skills` (external, untracked) is excluded; `e2e/` is no longer gitignored, so the Playwright specs and the visual baselines are actually tracked.
- Prettier applied to `scripts/`, `e2e/`, `vite.config.ts`, `playwright.config.ts`.

## 8. Bugs found by testing against the live dev03 backend (Playwright MCP)

All confirmed on the real backend with the real account — no product bug in the two
commits named in the report; the mock stack on port 5173 was the cause of the
"login / wrong data" complaint.

| #   | Area           | Problem                                                                                                                                                                                                                                                      | Fix                                                                                                                            |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Deals search   | Search always returned **0 results**: the query filtered on `organization_name`, which does not exist on `CRM Deal` (the doctype has the `organization` link). Verified: `organization_name like %Testing%` → 0 rows, `organization like %Testing%` → 1 row. | `src/hooks/use-deals.ts` searches the `organization` field (list + count).                                                     |
| 2   | Leads search   | Search only matched `first_name`, so a surname never matched.                                                                                                                                                                                                | `src/hooks/use-leads.ts` searches `lead_name` ("First Last").                                                                  |
| 3   | List search UX | All four list pages only searched when you pressed Enter; typing looked broken (all rows stayed visible).                                                                                                                                                    | Live, debounced (350 ms) search on Organizations, Leads, Contacts and Deals; Enter still works.                                |
| 4   | Theme          | Dark mode was not persisted — every reload went back to light.                                                                                                                                                                                               | `src/lib/theme.ts`: stored in `localStorage` (`agrocrm.theme`) and applied before the first paint, so there is no light flash. |

**Verified working against dev03** (read-only checks): login + `/api/auth/me`,
dashboard KPIs (9 leads / 7 ongoing / 2 won — identical to the API counts),
all 10 list routes, record detail pages (organisation, lead, deal) with every
tab, attachments (file opens with `200 image/png`, `Content-Disposition: inline`),
lead → deal attachment hand-over (the file stays on the lead and is shown on the
converted deal), command palette, mobile layout at 375 px (no horizontal
overflow, bottom nav + sheet work), and the `File` proxy correctly refusing an
unscoped file list (`403` — reference filter required).

## 9. Accessibility pass (axe, WCAG 2.1 A/AA)

Running axe on **all 10 routes at every viewport** (not just Desktop) surfaced
violations that the previous Desktop-only run never saw:

| Rule                       | Problem                                                                                                   | Fix                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `button-name` (critical)   | 22 icon-only "⋮" row menus had no accessible name.                                                        | `aria-label="More actions"` on every one of them (tables, kanban cards, grids, detail pages). |
| `color-contrast` (serious) | The brand green `--primary` was `oklch(0.56 0.115 158)`; white text on it is **4.24:1** (AA needs 4.5:1). | Lightness lowered to `0.53` → **4.79:1**. Dark theme already passed (7.0:1).                  |

Also fixed while testing:

- The theme script that restores the saved theme caused a React **hydration
  mismatch** (`<html class="dark">` added before hydration). Fixed with
  `suppressHydrationWarning` on `<html>`; the console is clean again.
- The a11y/visual specs analysed the page **1 s after navigation**, i.e. while
  the loading skeleton was still on screen, which produced false positives and
  unstable screenshots. Both specs now wait for `networkidle` + 1.5 s.
- The visual spec used `emulateMedia({ colorScheme })` to capture the dark theme.
  Now that the theme is a stored preference, the spec sets `agrocrm.theme`
  directly — otherwise every "dark" screenshot was actually the light theme.

Result: **0 axe violations on all 10 routes** at 1920×1080 and 375×667 against
the live backend, and the same on the mock stack.
