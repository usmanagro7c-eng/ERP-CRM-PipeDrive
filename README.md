# AgroCRM — React frontend for Frappe CRM

A Pipedrive-style frontend (TanStack Start + React + Tailwind + shadcn/ui) that reads and
writes **CRM Organization** records in a Frappe CRM site. Fields, columns and forms are
built dynamically from the DocType metadata, so custom fields show up automatically.

Built so far: login, Organizations (list, search, sort, pagination, column chooser,
create, edit, delete, detail page, image/file attach). Leads, Deals, Contacts and
Activities are placeholders.

## How it works

```
Browser ──(signed session cookie)──> /api/frappe/*  ──(token KEY:SECRET)──> Frappe CRM (dev03)
```

- The browser never sees the Frappe API key/secret. They live in server-side env vars.
- `/api/auth/login` checks the user's **Frappe username + password** against the Frappe
  site, then sets a signed, HttpOnly cookie. `ALLOWED_USERS` limits who may sign in.
- `/api/frappe/*` is an **authenticated, allow-listed** proxy:
  - only the `CRM Organization` DocType can be read/written;
  - other DocTypes can only be listed (names only) when they are Link targets of
    `CRM Organization` (industry, territory, ...);
  - path traversal, other methods/doctypes and cross-site writes are blocked.
  Rules live in `src/lib/frappe-proxy.ts` (unit-tested).

## Setup

1. Frappe (dev03): create a dedicated integration user, give it only the permissions it
   needs on **CRM Organization**, then *Settings → API Access → Generate Keys*.
   Use keys from the **CRM site**, not the ERP site.
2. Copy `.env.example` to `.env` and fill in the values (or set them as secrets on your host).
3. Run:

```sh
npm install
npm run dev      # http://localhost:8080 (port may differ, see terminal)
```

4. Open the app, sign in with a Frappe user listed in `ALLOWED_USERS`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm test` | unit tests (proxy rules, session cookies, routing) |
| `npx tsc --noEmit` | type check |

## Security notes

- Rotate any API key/secret that was ever pasted into a chat, ticket or commit.
- Set a strong `SESSION_SECRET`; changing it signs everyone out.
- Keep the API user's permissions minimal; the proxy limits *which* requests are forwarded,
  Frappe permissions limit *what* that user can do.
- Serve the app over HTTPS (the cookie is marked `Secure` automatically on HTTPS).
