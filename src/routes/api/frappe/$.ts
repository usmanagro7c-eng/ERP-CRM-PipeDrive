import { createFileRoute } from "@tanstack/react-router";

import {
  BLOCKED_LINK_TARGETS,
  DEFAULT_LINK_TARGETS,
  ERPNEXT_DOCTYPES,
  MAIN_DOCTYPES,
  MAX_MAIN_ROWS,
  MAX_REFERENCE_ROWS,
  MAX_UPLOAD_BYTES,
  ORG_DOCTYPE,
  bodyContradictsDocType,
  buildLinkQuery,
  capPageLength,
  classifyRequest,
  doctypeFromResourcePath,
  isErpNextRequest,
  linkTargetsFromMeta,
  referenceScopeFor,
  validateMethodBody,
  validateUploadForm,
  type ReferenceScope,
  type UploadInfo,
} from "@/lib/frappe-proxy";
import {
  erpnextApiKey,
  erpnextApiSecret,
  erpnextBaseUrl,
  frappeApiKey,
  frappeApiSecret,
  frappeBaseUrl,
  getSession,
  jsonResponse,
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

/** Methods whose JSON body is validated (and rewritten) before forwarding. */
const VALIDATED_METHODS = new Set([
  "api/method/frappe.client.set_value",
  "api/method/frappe.client.cancel",
  "api/method/frappe.desk.form.utils.add_comment",
  "api/method/frappe.core.doctype.communication.email.make",
]);

let linkTargetsCache: { targets: Set<string>; expires: number } | undefined;

async function allowedLinkTargets(baseUrl: string, authHeader: string): Promise<Set<string>> {
  if (linkTargetsCache && linkTargetsCache.expires > Date.now()) return linkTargetsCache.targets;
  const fallback = new Set([...DEFAULT_LINK_TARGETS]);
  try {
    const response = await fetch(
      `${baseUrl}/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(ORG_DOCTYPE)}`,
      {
        headers: { Authorization: authHeader, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      return fallback;
    }
    const payload = (await response.json()) as { docs?: unknown[]; message?: { docs?: unknown[] } };
    const dynamicTargets = linkTargetsFromMeta(payload.docs?.[0] ?? payload.message?.docs?.[0]);
    const targets = new Set([...DEFAULT_LINK_TARGETS, ...dynamicTargets]);
    // Never expose sensitive DocTypes, not even through metadata.
    for (const blocked of BLOCKED_LINK_TARGETS) targets.delete(blocked);
    linkTargetsCache = { targets, expires: Date.now() + META_TTL_MS };
    return targets;
  } catch {
    return fallback;
  }
}

/**
 * Parse and validate a multipart upload. The body has already been buffered,
 * so it is re-read from the buffer instead of cloning the (used) request.
 */ async function readUploadInfo(
  body: ArrayBuffer,
  contentType: string,
): Promise<{ ok: true; info: UploadInfo } | { ok: false; status: number; reason: string }> {
  let form: FormData;
  try {
    form = await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    return { ok: false, status: 400, reason: "Could not read the upload form" };
  }
  return validateUploadForm(form);
}

async function forward(request: Request): Promise<Response> {
  const crmApiKey = frappeApiKey();
  const crmApiSecret = frappeApiSecret();
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

  // Uploads carry their target DocType in the multipart body, so they have to
  // be parsed before the target site can be chosen.
  let uploadInfo: UploadInfo | undefined;
  if (classification.kind === "upload") {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_UPLOAD_BYTES) {
      return jsonResponse({ _proxy_error: "File too large (max 10 MB)" }, 413);
    }
    if (!body) {
      return jsonResponse({ _proxy_error: "Upload needs a body" }, 400);
    }
    const parsed = await readUploadInfo(
      body,
      request.headers.get("content-type") ?? "multipart/form-data",
    );
    if (!parsed.ok) {
      return jsonResponse({ _proxy_error: parsed.reason }, parsed.status);
    }
    uploadInfo = parsed.info;
  }

  // Validate the body of the allow-listed RPC methods and of writes on a main
  // resource, then forward the sanitized body.
  let forwardBody = body;
  if (body && VALIDATED_METHODS.has(rawPath)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(body));
    } catch {
      return jsonResponse({ _proxy_error: "Invalid JSON body" }, 400);
    }
    const result = validateMethodBody(rawPath, parsed);
    if (!result.ok) {
      return jsonResponse({ _proxy_error: result.reason }, 403);
    }
    forwardBody = new TextEncoder().encode(JSON.stringify(result.body)).buffer as ArrayBuffer;
    bodyDocType = typeof result.body["doctype"] === "string" ? result.body["doctype"] : undefined;
    if (!bodyDocType && typeof result.body["reference_doctype"] === "string") {
      // add_comment addresses its parent document with "reference_doctype".
      bodyDocType = result.body["reference_doctype"];
    }
  }

  if (body && (request.method === "POST" || request.method === "PUT")) {
    const urlDocType = doctypeFromResourcePath(rawPath);
    if (urlDocType && MAIN_DOCTYPES.has(urlDocType)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(body));
      } catch {
        parsed = undefined;
      }
      if (bodyContradictsDocType(urlDocType, parsed)) {
        return jsonResponse({ _proxy_error: `Body doctype does not match ${urlDocType}` }, 403);
      }
    }
  }

  // A File / Comment / Communication list read must be scoped to one parent
  // document before anything is forwarded.
  let scope: ReferenceScope | undefined;
  if (classification.kind === "scoped-read") {
    const doctype = classification.doctype ?? "";
    scope = referenceScopeFor(doctype, incoming.searchParams) ?? undefined;
    if (!scope) {
      return jsonResponse(
        {
          _proxy_error: `Reading ${doctype} requires a reference filter on an allowed document`,
        },
        403,
      );
    }
  }

  // Determine whether this request targets ERPNext (dev06) or Frappe CRM (dev03)
  const isErpNext = uploadInfo
    ? uploadInfo.isErpNext
    : (scope ? ERPNEXT_DOCTYPES.has(scope.doctype) : false) ||
      isErpNextRequest(rawPath, incoming.searchParams, bodyDocType);

  const targetBaseUrl = isErpNext ? erpnextBaseUrl() : frappeBaseUrl();
  let targetAuthHeader: string;
  if (isErpNext) {
    const erpKey = erpnextApiKey();
    const erpSecret = erpnextApiSecret();
    if (!erpKey || !erpSecret) {
      return jsonResponse(
        { _proxy_error: "Server is not configured: set ERPNEXT_API_KEY and ERPNEXT_API_SECRET." },
        503,
      );
    }
    targetAuthHeader = `token ${erpKey}:${erpSecret}`;
  } else {
    targetAuthHeader = `token ${crmApiKey}:${crmApiSecret}`;
  }

  const headers = new Headers({ Authorization: targetAuthHeader, Accept: "application/json" });
  if (forwardBody) {
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
  }

  let search = incoming.search;

  try {
    if (classification.kind === "link-read") {
      const targets = await allowedLinkTargets(targetBaseUrl, targetAuthHeader);
      if (
        !classification.doctype ||
        BLOCKED_LINK_TARGETS.has(classification.doctype) ||
        !targets.has(classification.doctype)
      ) {
        return jsonResponse({ _proxy_error: `Blocked read of ${classification.doctype}` }, 403);
      }
      search = `?${buildLinkQuery(incoming.searchParams)}`;
    }

    if (classification.kind === "scoped-read") {
      search = `?${capPageLength(incoming.searchParams, MAX_REFERENCE_ROWS)}`;
    } else if (
      classification.kind === "org-read" &&
      !rawPath.slice("api/resource/".length).includes("/")
    ) {
      // A list read may never ask for an unbounded page.
      search = `?${capPageLength(incoming.searchParams, MAX_MAIN_ROWS)}`;
    }

    const target = `${targetBaseUrl}/${rawPath.split("/").map(encodeURIComponent).join("/")}${search}`;
    const init: RequestInit = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(30_000),
    };
    if (forwardBody) init.body = forwardBody;
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
