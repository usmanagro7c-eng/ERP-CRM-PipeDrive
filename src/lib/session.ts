/**
 * Minimal signed-cookie session (HMAC-SHA256 via Web Crypto, so it runs on Node and
 * Cloudflare Workers alike). The cookie only carries the user's id and an expiry; it is
 * HttpOnly, so browser scripts never see it, and it cannot be forged without SESSION_SECRET.
 */

export const SESSION_COOKIE = "agrocrm_session";
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export interface SessionPayload {
  /** Canonical Frappe user id (usually the email). */
  u: string;
  /** Display name. */
  n: string;
  /** Expiry, unix seconds. */
  exp: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  try {
    const padded =
      text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function importKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret, "sign");
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifySession(
  token: string | undefined | null,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return null;

  const key = await importKey(secret, "verify");
  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(body));
  if (!valid) return null;

  const bodyBytes = fromBase64Url(body);
  if (!bodyBytes) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(bodyBytes)) as Partial<SessionPayload>;
    if (typeof payload.u !== "string" || typeof payload.exp !== "number" || payload.exp <= now) {
      return null;
    }
    return {
      u: payload.u,
      n: typeof payload.n === "string" ? payload.n : payload.u,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      cookies[name] = part.slice(index + 1).trim();
    }
  }
  return cookies;
}

export function buildSessionCookie(
  value: string,
  opts: { maxAge: number; secure: boolean },
): string {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(secure: boolean): string {
  return buildSessionCookie("", { maxAge: 0, secure });
}

/**
 * Cross-site request check for state-changing requests: if the browser sent an Origin
 * header it must match the host we are served from. (SameSite=Lax already blocks most
 * cross-site cookie use; this is a second layer.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const forwarded = request.headers.get("x-forwarded-host");
    const host = forwarded ?? request.headers.get("host") ?? new URL(request.url).host;
    return originHost === host || originHost === new URL(request.url).host;
  } catch {
    return false;
  }
}

/**
 * Whether the request reached us over HTTPS. Plain HTTP is only accepted for
 * local development, so the session cookie is always marked `Secure` in
 * production (even when a proxy forgets to send `x-forwarded-proto`).
 */
export function isSecureRequest(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]?.trim() === "https";
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return !isLocalHost(host);
}

function isLocalHost(host: string): boolean {
  const name = host.split(":")[0]?.toLowerCase() ?? "";
  return name === "localhost" || name === "127.0.0.1" || name === "[::1]" || name === "0.0.0.0";
}
