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
                                             └──────────────────────────> ERPNext (dev06)
```

- The browser never sees the Frappe API key/secret. They live in server-side env vars
  (or Cloudflare secrets) and are injected by the proxy.
- `/api/auth/login` checks the user's **Frappe username + password** against the Frappe
  site, then sets a signed, HttpOnly, SameSite=Lax cookie (`Secure` in production).
  `ALLOWED_USERS` limits who may sign in, and failed attempts are rate limited.
- `/api/frappe/*` is an **authenticated, allow-listed** proxy:
  - only the CRM and Sales DocTypes can be read/written;
  - `File`, `Comment` and `Communication` can only be listed when the request is
    scoped to one allowed parent document (reference filter required);
  - other DocTypes can only be listed (names only) when they are Link targets of
    `CRM Organization`; `User` is never readable;
  - the body of `frappe.client.set_value` (only the `status` of a `Quotation`),
    `frappe.client.cancel` (only `Quotation` / `Sales Order`),
    `frappe.desk.form.utils.add_comment` and
    `frappe.core.doctype.communication.email.make` (only CRM and sales records)
    is validated and rewritten;
  - a write whose body carries a different `doctype` than the URL is rejected;
  - uploads are limited to a type allow-list and routed to the site that owns the
    document;
  - path traversal, other methods/doctypes and cross-site writes are blocked.
    Rules live in `src/lib/frappe-proxy.ts` (unit-tested).

## Setup

1. Frappe (dev03): create a dedicated integration user, give it only the permissions it
   needs on **CRM Organization**, then _Settings → API Access → Generate Keys_.
   Use keys from the **CRM site**, not the ERP site.
2. Copy `.env.example` to `.env` and fill in the values (or set them as secrets on your host).
3. Run:

```sh
npm install
npm run dev      # http://localhost:8080 (port may differ, see terminal)
```

4. Open the app, sign in with a Frappe user listed in `ALLOWED_USERS`.

## Deploying to Cloudflare Workers

The worker needs five secrets. Set them with `wrangler secret put` (the value is read
from stdin, so it never lands in your shell history):

```sh
npx wrangler secret put FRAPPE_API_KEY
npx wrangler secret put FRAPPE_API_SECRET
npx wrangler secret put ERPNEXT_API_KEY
npx wrangler secret put ERPNEXT_API_SECRET
npx wrangler secret put SESSION_SECRET
```

`SESSION_SECRET` must be at least 32 characters — generate one with
`openssl rand -hex 32` (or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

Non-secret configuration lives in `wrangler.jsonc` → `vars` (`FRAPPE_BASE_URL`,
`ERPNEXT_BASE_URL`, `ALLOWED_USERS`). **Never** put a key or a secret in `vars`: they
are committed to the repository. `npm run check:secrets` fails if you do.

Deploy with:

```sh
npm run build
npx wrangler deploy
```

## Scripts

| Command                 | What it does                                                          |
| ----------------------- | --------------------------------------------------------------------- |
| `npm run dev`           | dev server                                                            |
| `npm run build`         | production build                                                      |
| `npm test`              | unit tests (proxy rules, session cookies, rate limiter, secrets scan) |
| `npm run check:secrets` | fails when a hard-coded credential is committed                       |
| `npx tsc --noEmit`      | type check                                                            |

## Security notes

- Rotate any API key/secret that was ever pasted into a chat, ticket or commit.
- Set a strong `SESSION_SECRET`; changing it signs everyone out.
- Keep the API user's permissions minimal; the proxy limits _which_ requests are forwarded,
  Frappe permissions limit _what_ that user can do.
- Serve the app over HTTPS (the cookie is marked `Secure` automatically on HTTPS).
- Every response carries `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: same-origin` and `X-Frame-Options: DENY` (added in
  `src/start.ts`). Inline **styles** are allowed because Tailwind/Radix position
  popovers with inline `style` attributes; inline **scripts** are allowed because
  TanStack Start injects the SSR hydration payload as an inline `<script>` whose
  content differs per request (it cannot be allow-listed by hash). `script-src-attr
'none'` still blocks inline event handlers and no script may be loaded from another
  origin. Images may be loaded from the configured Frappe/ERPNext origins.

### Brute-force protection (known limitation)

`/api/auth/login` allows **5 failed attempts per IP + username per 10 minutes** and
answers further attempts with `429`. The counter is stored in:

1. a Cloudflare **rate limiting binding** named `LOGIN_RATE_LIMITER`, if one is
   configured (then Cloudflare enforces the limit);
2. otherwise a Cloudflare **KV namespace** named `LOGIN_RATE_LIMIT_KV`, if one is
   configured (the counter is then shared by every isolate);
3. otherwise an **in-memory** counter.

The in-memory fallback is per worker isolate: it is lost on a cold start and it is
_not_ shared between isolates, so a distributed attacker can still make more than
5 attempts in total. To get a global limit, configure one of the bindings.

**Cloudflare rate limiting binding** — add it to `wrangler.jsonc` (the `namespace_id`
is an arbitrary number you choose, it must be unique per binding):

```jsonc
"ratelimits": [
  { "name": "LOGIN_RATE_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 600 } }
]
```

**Cloudflare KV namespace** — create the namespace and add the binding:

```sh
npx wrangler kv namespace create LOGIN_RATE_LIMIT_KV
```

```jsonc
"kv_namespaces": [{ "binding": "LOGIN_RATE_LIMIT_KV", "id": "<your namespace id>" }]
```

Until one of them is configured the app keeps working with the in-memory fallback.
