import { createFileRoute } from "@tanstack/react-router";

import {
  DEFAULT_LINK_TARGETS,
  MAIN_DOCTYPES,
  MAX_UPLOAD_BYTES,
  ORG_DOCTYPE,
  buildLinkQuery,
  classifyRequest,
  isErpNextRequest,
  linkTargetsFromMeta,
} from "@/lib/frappe-proxy";
import {
  erpnextApiKey,
  erpnextApiSecret,
  erpnextBaseUrl,
  frappeBaseUrl,
  getSession,
  jsonResponse,
  readEnv,
  sessionSecret,
} from "@/lib/server-auth";
import { isSameOrigin } from "@/lib/session";

/**
 * Authenticated, allow-listed proxy to Frappe CRM (dev03) and ERPNext (dev06).
 *
 * - Requires a signed-in session (cookie set by /api/auth/login).
 * - Holds integration credentials server-side; the browser never sees them.
 * - Routes Quotation, Sales Order, Item, and Customer directly to ERPNext (dev06).
 * - Routes CRM Leads, Deals, Tasks, Organizations, and Contacts to Frappe CRM (dev03).
 */

const PROXY_PREFIX = "/api/frappe/";
const META_TTL_MS = 5 * 60 * 1000;

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
  const crmApiKey = readEnv("FRAPPE_API_KEY");
  const crmApiSecret = readEnv("FRAPPE_API_SECRET");
  if (!crmApiKey || !crmApiSecret || !sessionSecret()) {
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

  let body: ArrayBuffer | undefined;
  let bodyDocType: string | undefined;

  if (request.method !== "GET" && request.method !== "DELETE") {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_UPLOAD_BYTES + 1024 * 1024) {
      return jsonResponse({ _proxy_error: "Request too large" }, 413);
    }
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const text = new TextDecoder().decode(body);
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.doctype === "string") {
          bodyDocType = parsed.doctype;
        }
      } catch {
        // ignore JSON parse error here
      }
    }
  }

  // Determine whether this request targets ERPNext (dev06) or Frappe CRM (dev03)
  const isErpNext = isErpNextRequest(rawPath, incoming.searchParams, bodyDocType);
  const targetBaseUrl = isErpNext ? erpnextBaseUrl() : frappeBaseUrl();
  const targetAuthHeader = isErpNext
    ? `token ${erpnextApiKey()}:${erpnextApiSecret()}`
    : `token ${crmApiKey}:${crmApiSecret}`;

  const headers = new Headers({ Authorization: targetAuthHeader, Accept: "application/json" });
  if (body) {
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
  }

  let search = incoming.search;

  try {
    if (classification.kind === "link-read") {
      const targets = await allowedLinkTargets(targetBaseUrl, targetAuthHeader);
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
      const formDocType = String(form.get("doctype") ?? "");
      if (!MAIN_DOCTYPES.has(formDocType)) {
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

    const target = `${targetBaseUrl}/${rawPath.split("/").map(encodeURIComponent).join("/")}${search}`;
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
      {
        _proxy_error: `Could not reach ${isErpNext ? "ERPNext (dev06)" : "Frappe CRM (dev03)"}. Check network or credentials.`,
      },
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
