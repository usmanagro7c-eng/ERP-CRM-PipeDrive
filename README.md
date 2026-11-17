# PipeDrive CRM — Modern CRM & ERPNext Sales Suite

A modern, high-performance CRM and Sales Pipeline frontend built with **TanStack Start**, **React 19**, **Tailwind CSS v4**, and **shadcn/ui**. PipeDrive CRM delivers an intuitive Pipedrive-style user experience backed by a **dual-backend architecture**: **Frappe CRM** for core customer relationship workflows and **ERPNext** for quotations, sales orders, and product catalogs.

---

## Architecture Overview

PipeDrive CRM sits between the client browser and two distinct Frappe/ERPNext backends, using server-side rendering (SSR) and an authenticated reverse proxy deployed on **Cloudflare Workers**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Client Browser (React 19)                    │
│      Deals Kanban • Quotations • Orders • Leads • Settings Hub        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Signed Session Cookie (HMAC-SHA256)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            TanStack Start Server / Cloudflare Worker Proxy             │
│            /api/auth/* (Login, Logout, Rate Limiter)                  │
│            /api/frappe/* (Scoped Allowlist & Routing Proxy)           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
      CRM Requests  │                                │ ERP / Catalog
      (CRM Site)    ▼                                ▼ (ERPNext Site)
┌───────────────────────────────┐  ┌─────────────────────────────────────┐
│          Frappe CRM           │  │               ERPNext               │
│ • CRM Deals & Pipeline Stages │  │ • Quotations (Items, Tax, Terms)    │
│ • CRM Leads & Qualification   │  │ • Sales Orders & Delivery Dates     │
│ • CRM Organizations & Contacts│  │ • Item Master & Stock Catalog       │
│ • Tasks, Notes, Call Logs     │  │ • Customer Master                   │
│ • Email Dispatch Carrier      │  │                                     │
└───────────────────────────────┘  └─────────────────────────────────────┘
```

### Dual-Backend Routing Strategy

| Category | Target Backend | Managed DocTypes & Methods |
|---|---|---|
| **CRM Records** | **Frappe CRM** | `CRM Deal`, `CRM Lead`, `CRM Organization`, `CRM Contact`, `CRM Task`, `CRM Note`, `CRM Call Log`, `Activity Log` |
| **Sales & Inventory** | **ERPNext** | `Quotation`, `Sales Order`, `Item`, `Customer`, `Address`, `Contact` |
| **Communication & Alerts** | **Frappe CRM** | `frappe.core.doctype.communication.email.make` (routes all system change notifications through CRM carrier documents) |

---

## Key Features

### 1. Deals Pipeline & Visual Kanban Board (`/deals`)
- **Drag-and-Drop Kanban Stages**: Fluid stage progression (Qualification, Needs Analysis, Proposal Sent, Negotiation, Won, Lost) with stage monetary totals and deal counters.
- **Won Deal Celebrations**: Integrated confetti celebratory visual feedback when a deal is dragged or updated to "Won".
- **Deal Detail View (`/deals/$dealId`)**:
  - **Stage Progression Bar**: Interactive stepper allowing one-click stage advancing or rollback.
  - **Summary Tab**: Contact details, linked organization, deal probability, expected close date, and territory.
  - **Data Tab (Line Items)**: Add/remove line items, select items with live search, adjust quantities and unit rates, with automated calculation of total `deal_value`.
  - **Activity Feed & Comments**: Real-time record audit trail, notes history, and team comments thread.
  - **One-Click Conversions**: Direct buttons to **"Convert to Quotation"** or **"Convert to Sales Order"**.

### 2. Quotation & Sales Order Lifecycle (`/quotations`, `/sales-orders`)
- **Deal ➔ Quotation Seamless Conversion**: Automatically transfers Deal line items, quantities, rates, customer details, and the parent Deal reference (`crm_deal`) into the ERPNext Quotation.
- **Deal Value Synchronization**: Updating or saving quotation line items syncs the Deal's products and recalculates total deal value.
- **Quotation ➔ Sales Order Conversion**: Converts submitted quotations into official ERPNext Sales Orders with full audit lineage (`prevdoc_docname` and `prevdoc_doctype: "Quotation"`).
- **Direct Deal ➔ Sales Order**: Instant sales order generation directly from high-velocity deals.
- **Document Status Lifecycles**: Full support for Draft, Submitted, and Cancelled document states with ERPNext workflow rules.

### 3. Leads Management & Conversion (`/leads`)
- **Lead Qualification Pipeline**: Track potential clients through lead statuses (New, Contacted, Qualified, Lost).
- **One-Click Convert Lead Modal**: Converts qualified leads into **Deals**, **Contacts**, and **Organizations** simultaneously in a single transaction.

### 4. Comprehensive Settings Hub (`/settings`)
A unified administration center organized into three specialized tabs:

#### A. Automated Change Notifications
- **System Users Multi-Select Dropdown**: Search and select any active Frappe CRM system user with a single click, selection counter badge, and `Select All` / `Deselect All` controls.
- **External Custom Recipients**: Add custom email addresses as tags with quick delete.
- **Event Presets Dropdown**: Instant switching between presets:
  - *Enable All Events* (complete activity tracking)
  - *Deal Stage Changes Only* (pipeline milestone tracking)
  - *Sales Pipeline Only* (Deals, Quotations, and Sales Orders)
  - *Disable All*
- **Granular Event Switches**: Toggle email alerts individually for Deal Stages, Deal Data Updates, Quotations, Sales Orders, Leads, Tasks, Notes, and Comments.
- **Granular Field-by-Field HTML Emails**: Every alert includes modified field comparisons, item tables, totals, user attribution, and direct links to the record in the CRM.
- **Send Test Email**: Live test trigger to confirm SMTP delivery to configured recipients.

#### B. Appearance & Display Preferences
- **Theme Selection**:
  - **Light Mode**: High-contrast, clean daylight UI.
  - **Dark Mode**: Sleek, low-glare dark aesthetic with balanced contrast.
  - **System Default**: Automatically synchronizes with OS preference.
  - Zero-flicker startup script (`THEME_INIT_SCRIPT`) injected in HTML head.
- **Display Density**: Toggle between comfortable and compact table padding.
- **Animations**: Toggle confetti celebration effects.

#### C. Account & System Status
- **Active Session Profile**: Logged-in user name, email, avatar badge, and system user role.
- **Backend Connection Monitors**: Live status badges verifying connectivity to Frappe CRM and ERPNext.
- **Quick Sign-Out**: Secure session termination.

### 5. Core CRM Masters
- **Organizations (`/organizations`)**: Searchable data table, column visibility toggle, pagination, detail drawer, file attachments, and linked contacts/deals.
- **Contacts (`/contacts`)**: Directory of individuals linked to organizations with phone, email, and communication history.
- **Activities & Tasks (`/activities`)**: Unified activity agenda with task completion checkmarks, priority flags, and due date filters.
- **Calls (`/calls`)**: Incoming and outgoing call logger with duration and notes.
- **Notes (`/notes`)**: Quick standalone and record-linked markdown notes.

---

## Security & Production Hardening

The application is engineered with defense-in-depth principles:

1. **Zero Secret Exposure**:
   - Backend API keys (`FRAPPE_API_KEY`, `ERPNEXT_API_KEY`) and secrets are never sent to the client browser.
   - All external API calls route through the server-side proxy (`/api/frappe/*`).
2. **Session Authentication & Rate Limiting**:
   - Secure HMAC-SHA256 signed HTTP-only cookies (`agrocrm_session`).
   - Brute-force rate limiting: 5 failed login attempts per IP / username per 10 minutes.
   - User allowlist filtering via `ALLOWED_USERS` environment variable.
3. **Proxy Boundary & Scoped Allowlists**:
   - Strict DocType allowlist: Only explicitly permitted CRM and ERP doctypes can be queried.
   - File & Communication Scope: Reads on `File`, `Comment`, and `Communication` require a valid parent doctype filter.
   - Method sanitization: Strict validation of allowed remote RPC method calls.
4. **Security Headers**:
   - `Content-Security-Policy`: Restricts scripts, styles, and frames.
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
5. **Automated Secret Scanning**:
   - `npm run check:secrets` runs on CI/pre-commit to ensure no keys or tokens are ever committed.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Framework & Routing** | [TanStack Start](https://tanstack.com/start) (SSR on Nitro / Cloudflare Workers), [TanStack Router](https://tanstack.com/router) |
| **Frontend UI** | [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com), [shadcn/ui](https://ui.shadcn.com) |
| **State & Data Fetching** | [TanStack Query v5](https://tanstack.com/query) with optimistic updates and cache invalidation |
| **Visuals & Charts** | [Lucide React](https://lucide.dev), [Recharts](https://recharts.org), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) |
| **Form Management** | [React Hook Form](https://react-hook-form.com), [Zod](https://zod.dev) schema validation |
| **Testing** | [Vitest](https://vitest.dev), [Playwright](https://playwright.dev), [Axe Core](https://github.com/dequelabs/axe-core) |
| **Deployment Target** | [Cloudflare Workers](https://workers.cloudflare.com) (`nodejs_compat` runtime) via Wrangler |

---

## Project Structure

```
PipeDrive/
├── src/
│   ├── components/            # Reusable UI components & dialogs
│   │   ├── ui/                # Radix / shadcn/ui primitives (dialog, button, table, dropdown, etc.)
│   │   ├── app-shell.tsx      # Main layout shell with sidebar, search, and user menu
│   │   ├── convert-lead-modal.tsx
│   │   ├── deal-form-modal.tsx
│   │   ├── quotation-form-modal.tsx
│   │   ├── sales-order-form-modal.tsx
│   │   └── item-row-picker.tsx
│   ├── hooks/                 # React Query data hooks
│   │   ├── use-deals.ts       # Deals CRUD, stage updates, line items, and change emails
│   │   ├── use-quotations.ts  # Quotation operations and notifications
│   │   ├── use-sales-orders.ts# Sales order creation and status tracking
│   │   ├── use-leads.ts       # Leads fetching, qualifying, and conversion
│   │   ├── use-organizations.ts
│   │   ├── use-contacts.ts
│   │   ├── use-tasks.ts
│   │   ├── use-notes.ts
│   │   └── use-comments.ts
│   ├── lib/                   # Utility libraries & configuration
│   │   ├── change-notifications.ts # Email formatting, carrier resolution & dispatch
│   │   ├── notification-settings.ts# Settings persistence & recipient resolvers
│   │   ├── theme.ts           # Dark mode / Light mode / System theme controller
│   │   ├── frappe-client.ts   # API proxy client
│   │   ├── session.ts         # HMAC signed session cookie manager
│   │   └── utils.ts           # Formatting, currency, and class merging
│   ├── routes/                # File-based TanStack Start routes
│   │   ├── _app.tsx           # Authenticated app layout
│   │   ├── _app.dashboard.tsx # Dashboard with metrics & charts
│   │   ├── _app.deals.tsx     # Deals Kanban board
│   │   ├── _app.deals_.$dealId.tsx # Deal detail view & product tables
│   │   ├── _app.leads.tsx     # Leads management
│   │   ├── _app.quotations.tsx# Quotations list & conversion
│   │   ├── _app.sales-orders.tsx # Sales orders tracking
│   │   ├── _app.organizations.index.tsx
│   │   ├── _app.contacts.tsx
│   │   ├── _app.activities.tsx
│   │   ├── _app.settings.tsx  # Settings Hub (Notifications, Appearance, Account)
│   │   ├── login.tsx          # Secure login page
│   │   └── api/               # Server-side API endpoints
│   │       ├── auth/          # Login, logout, session verification
│   │       └── frappe/$.ts    # Dual-backend authenticated reverse proxy
│   └── test/                  # Test suites (unit, security, proxy, notifications)
├── scripts/                   # Development and verification scripts
│   ├── check-secrets.mjs      # Pre-commit secret scanning
│   ├── mock-frappe.mjs        # Standalone mock Frappe server for offline testing
│   └── run-lighthouse.mjs     # Performance and accessibility auditor
├── wrangler.jsonc             # Cloudflare Workers configuration
├── vite.config.ts             # Vite + TanStack Start configuration
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js**: `20.x` or higher
- **npm**: `10.x` or higher

### 1. Installation
Clone the repository and install dependencies:
```sh
git clone <repository-url>
cd PipeDrive
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```sh
cp .env.example .env
```

Configure the environment variables using your server credentials:
```env
# Frappe CRM Backend Site
FRAPPE_BASE_URL=https://crm.example.com
FRAPPE_API_KEY=your_frappe_crm_api_key
FRAPPE_API_SECRET=your_frappe_crm_api_secret

# ERPNext Backend Site
ERPNEXT_BASE_URL=https://erp.example.com
ERPNEXT_API_KEY=your_erpnext_api_key
ERPNEXT_API_SECRET=your_erpnext_api_secret

# Session Security (Generate with: openssl rand -hex 32)
SESSION_SECRET=your_random_32_character_hex_string

# Access Control (Comma-separated emails, or * for all valid Frappe users)
ALLOWED_USERS=admin@example.com,user@example.com
```

### 3. Start Development Server
```sh
npm run dev
```
The application will start at `http://localhost:5173`.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Compiles application for production SSR |
| `npm test` | Runs Vitest unit tests (94 tests covering routing, security, proxy, and email notifications) |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run check:secrets` | Scans workspace to verify zero API keys or secrets are committed |
| `npm run test:e2e` | Runs Playwright end-to-end browser test suite |
| `npm run test:a11y` | Runs automated accessibility audits with Axe-Core |
| `npm run lint` | Runs ESLint across TypeScript and TSX files |
| `npm run format` | Formats all code with Prettier |
| `npm run preview` | Previews local production build |

---

## Cloudflare Workers Deployment

The application is deployed on Cloudflare Workers using Wrangler.

### 1. Store Production Secrets
Configure secrets securely in Cloudflare using Wrangler:
```sh
npx wrangler secret put FRAPPE_API_KEY
npx wrangler secret put FRAPPE_API_SECRET
npx wrangler secret put ERPNEXT_API_KEY
npx wrangler secret put ERPNEXT_API_SECRET
npx wrangler secret put SESSION_SECRET
```

### 2. Deploy
```sh
npm run build
npx wrangler deploy
```

Production Worker: `https://pipedrive-crm.your-subdomain.workers.dev`

---

## License & Support
Internal Proprietary Software for PipeDrive CRM. For access or configuration requests, contact the system administrator at `admin@example.com`.
