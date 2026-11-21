import { SESSION_COOKIE, parseCookies, verifySession, type SessionPayload } from "@/lib/session";

/** Server-only configuration. Read inside handlers: on the deployed worker env is injected per request. */
export const DEFAULT_FRAPPE_BASE_URL = "https://dev03.agrovisions.pk";
export const DEFAULT_ERPNEXT_BASE_URL = "https://dev06.agrovisions.pk";

export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function frappeBaseUrl(): string {
  return (readEnv("FRAPPE_BASE_URL") ?? DEFAULT_FRAPPE_BASE_URL).replace(/\/$/, "");
}

export function erpnextBaseUrl(): string {
  return (readEnv("ERPNEXT_BASE_URL") ?? DEFAULT_ERPNEXT_BASE_URL).replace(/\/$/, "");
}

export function frappeApiKey(): string | undefined {
  return readEnv("FRAPPE_API_KEY");
}

export function frappeApiSecret(): string | undefined {
  return readEnv("FRAPPE_API_SECRET");
}

/**
 * ERPNext (dev06) credentials. There are deliberately no fallback values:
 * a missing secret must break the request instead of silently using a
 * hard-coded key that is committed to the repository.
 */
export function erpnextApiKey(): string | undefined {
  return readEnv("ERPNEXT_API_KEY");
}

export function erpnextApiSecret(): string | undefined {
  return readEnv("ERPNEXT_API_SECRET");
}

export function sessionSecret(): string | undefined {
  const secret = readEnv("SESSION_SECRET");
  return secret && secret.length >= 32 ? secret : undefined;
}

/** Comma-separated Frappe user ids allowed to sign in. "*" or unset lets any valid Frappe/ERPNext user in. */
export function allowedUsers(): "*" | string[] {
  const raw = readEnv("ALLOWED_USERS");
  if (!raw || raw === "*") return "*";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isUserAllowed(userId: string, typed: string): boolean {
  const allowed = allowedUsers();
  if (allowed === "*") return true;
  return allowed.includes(userId.toLowerCase()) || allowed.includes(typed.toLowerCase());
}

/** Check if user roles qualify as System User (System Manager, System User, or Administrator). */
export function isSystemUserRoles(roles: string[] = []): boolean {
  const normalized = roles.map((r) => r.trim().toLowerCase());
  return (
    normalized.includes("system manager") ||
    normalized.includes("system user") ||
    normalized.includes("administrator")
  );
}

/** Check if user is strictly a system user (no sales roles, excluding Administrator). */
export function isDedicatedSystemUser(roles: string[] = []): boolean {
  const normalized = roles.map((r) => r.trim().toLowerCase());
  const isSys =
    normalized.includes("system manager") ||
    normalized.includes("system user");
  if (!isSys) return false;
  // If user is Administrator or has sales roles, they retain full CRM access
  if (normalized.includes("administrator")) return false;
  const hasSales =
    normalized.includes("sales user") ||
    normalized.includes("sales manager") ||
    normalized.includes("sales master manager");
  return !hasSales;
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json");
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

/** Returns the verified session for this request, or null. */
export async function getSession(request: Request): Promise<SessionPayload | null> {
  const secret = sessionSecret();
  if (!secret) return null;
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  return verifySession(token, secret);
}
