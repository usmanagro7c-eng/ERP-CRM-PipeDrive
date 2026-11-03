import { SESSION_COOKIE, parseCookies, verifySession, type SessionPayload } from "@/lib/session";

/** Server-only configuration. Read inside handlers: on the deployed worker env is injected per request. */
export const DEFAULT_FRAPPE_BASE_URL = "https://dev03.agrovisions.pk";

export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function frappeBaseUrl(): string {
  return (readEnv("FRAPPE_BASE_URL") ?? DEFAULT_FRAPPE_BASE_URL).replace(/\/$/, "");
}

export function sessionSecret(): string | undefined {
  const secret = readEnv("SESSION_SECRET");
  return secret && secret.length >= 32 ? secret : undefined;
}

/** Comma-separated Frappe user ids allowed to sign in. "*" lets any valid Frappe user in. */
export function allowedUsers(): "*" | string[] {
  const raw = readEnv("ALLOWED_USERS");
  if (!raw) return [];
  if (raw === "*") return "*";
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
