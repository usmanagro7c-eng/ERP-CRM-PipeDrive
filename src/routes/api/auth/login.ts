import { createFileRoute } from "@tanstack/react-router";

import { frappeBaseUrl, isUserAllowed, jsonResponse, sessionSecret } from "@/lib/server-auth";
import {
  SESSION_TTL_SECONDS,
  buildSessionCookie,
  isSameOrigin,
  isSecureRequest,
  signSession,
} from "@/lib/session";

/**
 * Sign in with a Frappe username + password. The credentials are verified against the
 * Frappe site itself; we only keep a signed, HttpOnly session cookie (no password, no Frappe sid).
 * Access is further limited by the ALLOWED_USERS env var.
 */
async function login(request: Request): Promise<Response> {
  const secret = sessionSecret();
  if (!secret) {
    return jsonResponse(
      { error: "Server is not configured: set SESSION_SECRET (32+ characters)." },
      503,
    );
  }
  if (!isSameOrigin(request)) return jsonResponse({ error: "Cross-site request blocked" }, 403);

  let usr = "";
  let pwd = "";
  try {
    const body = (await request.json()) as { usr?: unknown; pwd?: unknown };
    usr = typeof body.usr === "string" ? body.usr.trim() : "";
    pwd = typeof body.pwd === "string" ? body.pwd : "";
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  if (!usr || !pwd || usr.length > 140 || pwd.length > 200) {
    return jsonResponse({ error: "Enter your username and password" }, 400);
  }

  const base = frappeBaseUrl();
  let loginResponse: Response;
  try {
    loginResponse = await fetch(`${base}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ usr, pwd }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return jsonResponse({ error: "Could not reach the Frappe site" }, 502);
  }

  if (loginResponse.status === 401 || loginResponse.status === 403) {
    return jsonResponse({ error: "Invalid username or password" }, 401);
  }
  if (!loginResponse.ok) {
    return jsonResponse({ error: `Frappe login failed (${loginResponse.status})` }, 502);
  }

  let fullName = usr;
  try {
    const payload = (await loginResponse.json()) as { full_name?: unknown };
    if (typeof payload.full_name === "string" && payload.full_name) fullName = payload.full_name;
  } catch {
    // keep typed name
  }

  // Resolve the canonical user id (email) using the temporary Frappe session cookie.
  let userId = usr;
  const setCookie = loginResponse.headers.get("set-cookie") ?? "";
  const sid = /(?:^|[,\s])sid=([^;,\s]+)/.exec(setCookie)?.[1];
  if (sid && sid !== "Guest") {
    try {
      const who = await fetch(`${base}/api/method/frappe.auth.get_logged_user`, {
        headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (who.ok) {
        const data = (await who.json()) as { message?: unknown };
        if (typeof data.message === "string" && data.message) userId = data.message;
      }
    } catch {
      // fall back to the typed username
    }
  }

  if (!isUserAllowed(userId, usr)) {
    return jsonResponse({ error: "This account is not allowed to use this app" }, 403);
  }

  const token = await signSession(
    { u: userId, n: fullName, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS },
    secret,
  );
  return jsonResponse({ user: userId, name: fullName }, 200, {
    "Set-Cookie": buildSessionCookie(token, {
      maxAge: SESSION_TTL_SECONDS,
      secure: isSecureRequest(request),
    }),
  });
}

export const Route = createFileRoute("/api/auth/login")({
  server: { handlers: { POST: ({ request }) => login(request) } },
});
