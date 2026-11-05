import { createFileRoute } from "@tanstack/react-router";

import {
  MAIN_DOCTYPES,
  MAX_UPLOAD_BYTES,
  ORG_DOCTYPE,
  buildLinkQuery,
  classifyRequest,
  linkTargetsFromMeta,
} from "@/lib/frappe-proxy";
import { frappeBaseUrl, getSession, jsonResponse, readEnv, sessionSecret } from "@/lib/server-auth";
import { isSameOrigin } from "@/lib/session";

/**
 * Authenticated, allow-listed proxy to the Frappe CRM site.
 *
 * - Requires a signed-in session (cookie set by /api/auth/login).
 * - Holds FRAPPE_API_KEY / FRAPPE_API_SECRET server-side; the browser never sees them.
 * - Only CRM Organization, CRM Deal, CRM Lead, CRM Task, and Contact can be read/written. Link-field DocTypes can be listed (names only).
 *   See src/lib/frappe-proxy.ts for the exact rules.
 */

const PROXY_PREFIX = "/api/frappe/";
const META_TTL_MS = 5 * 60 * 1000;

const DEFAULT_LINK_TARGETS = new Set([
  "Currency",
  "CRM Territory",
  "CRM Industry",
  "Address",
  "Country",
  "User",
  "Contact",
  "CRM Organization",
  "CRM Deal",
  "CRM Deal Status",
  "CRM Lead",
  "CRM Lead Status",
  "CRM Lead Source",
  "CRM Task",
  "Salutation",
  "Gender",
  "CRM Service Level Agreement",
  "CRM Communication Status",
  "CRM Lost Reason",
  "Quotation",
  "Sales Order",
  "Item",
  "Item Group",
  "UOM",
  "Price List",
  "Company",
  "Customer",
  "Sales Taxes and Charges Template",
  "Quotation Item",
  "Sales Order Item",
  "Tax Category",
  "Payment Terms Template",
]);

let linkTargetsCache: { targets: Set<string>; expires: number } | undefined;

async function allowedLinkTargets(baseUrl: string, authHeader: string): Promise<Set<string>> {
  if (linkTargetsCache && linkTargetsCache.expires > Date.now()) return linkTargetsCache.targets;
  try {
    const response = await fetch(
      `${baseUrl}/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(ORG_DOCTYPE)}`,
      {
        headers: { Authorization: authHeader, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      return DEFAULT_LINK_TARGETS;
    }
    const payload = (await response.json()) as { docs?: unknown[]; message?: { docs?: unknown[] } };
    const dynamicTargets = linkTargetsFromMeta(payload.docs?.[0] ?? payload.message?.docs?.[0]);
    const targets = new Set([...DEFAULT_LINK_TARGETS, ...dynamicTargets]);
    linkTargetsCache = { targets, expires: Date.now() + META_TTL_MS };
    return targets;
  } catch {
    return DEFAULT_LINK_TARGETS;
  }
}

async function forward(request: Request): Promise<Response> {
  const apiKey = readEnv("FRAPPE_API_KEY");
  const apiSecret = readEnv("FRAPPE_API_SECRET");
  if (!apiKey || !apiSecret || !sessionSecret()) {
    return jsonResponse(
      {
        _proxy_error:
          "Server is not configured. Set FRAPPE_API_KEY, FRAPPE_API_SECRET and SESSION_SECRET (32+ chars).",
      },
      503,
    );
  }

  const session = await getSession(request);
  if (!session) return jsonResponse({ _proxy_error: "Not authenticated" }, 401);

  if (request.method !== "GET" && !isSameOrigin(request)) {
    return jsonResponse({ _proxy_error: "Cross-site request blocked" }, 403);
  }

  const incoming = new URL(request.url);
  let rawPath: string;
  try {
    rawPath = decodeURIComponent(incoming.pathname.slice(PROXY_PREFIX.length));
  } catch {
    return jsonResponse({ _proxy_error: "Bad path" }, 400);
  }

  const classification = classifyRequest(request.method, rawPath, incoming.searchParams);
  if (!classification) {
    return jsonResponse({ _proxy_error: `Blocked ${request.method} ${rawPath}` }, 403);
  }

  const baseUrl = frappeBaseUrl();
  const authHeader = `token ${apiKey}:${apiSecret}`;
  const headers = new Headers({ Authorization: authHeader, Accept: "application/json" });

  let search = incoming.search;
  let body: ArrayBuffer | undefined;

  try {
    if (classification.kind === "link-read") {
      const targets = await allowedLinkTargets(baseUrl, authHeader);
      if (!classification.doctype || !targets.has(classification.doctype)) {
        return jsonResponse({ _proxy_error: `Blocked read of ${classification.doctype}` }, 403);
      }
      search = `?${buildLinkQuery(incoming.searchParams)}`;
    }

    if (classification.kind === "upload") {
      const length = Number(request.headers.get("content-length") ?? "0");
      if (length > MAX_UPLOAD_BYTES) {
        return jsonResponse({ _proxy_error: "File too large (max 10 MB)" }, 413);
      }
      const form = await request.clone().formData();
      if (!MAIN_DOCTYPES.has(String(form.get("doctype") ?? ""))) {
        return jsonResponse(
          { _proxy_error: "Uploads are only allowed for CRM and Sales DocTypes" },
          403,
        );
      }
      const file = form.get("file");
      if (file instanceof File && file.size > MAX_UPLOAD_BYTES) {
        return jsonResponse({ _proxy_error: "File too large (max 10 MB)" }, 413);
      }
    }

    if (request.method !== "GET" && request.method !== "DELETE") {
      body = await request.arrayBuffer();
      if (body.byteLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
        return jsonResponse({ _proxy_error: "Request too large" }, 413);
      }
      const contentType = request.headers.get("content-type");
      if (contentType) headers.set("Content-Type", contentType);
    }

    const target = `${baseUrl}/${rawPath.split("/").map(encodeURIComponent).join("/")}${search}`;
    const init: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(30_000),
    };
    if (body) init.body = body;
    const upstream = await fetch(target, init);

    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("Content-Type", upstreamType);
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return jsonResponse(
      { _proxy_error: "Could not reach the Frappe site. Check FRAPPE_BASE_URL or the network." },
      502,
    );
  }
}

export const Route = createFileRoute("/api/frappe/$")({
  server: {
    handlers: {
      GET: ({ request }) => forward(request),
      POST: ({ request }) => forward(request),
      PUT: ({ request }) => forward(request),
      DELETE: ({ request }) => forward(request),
    },
  },
});
