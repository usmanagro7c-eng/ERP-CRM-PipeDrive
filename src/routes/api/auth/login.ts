import { createFileRoute } from "@tanstack/react-router";

import { ensureCloudflareEnv } from "@/lib/cloudflare-bindings";
import { clientIp, loginAttemptKey, resolveLoginRateLimiter } from "@/lib/login-rate-limit";
import {
  erpnextBaseUrl,
  frappeBaseUrl,
  isDedicatedSystemUser,
  isSystemUserRoles,
  isUserAllowed,
  jsonResponse,
  sessionSecret,
} from "@/lib/server-auth";
import {
  SESSION_TTL_SECONDS,
  buildSessionCookie,
  isSameOrigin,
  isSecureRequest,
  signSession,
} from "@/lib/session";

/**
 * Sign in with a Frappe / ERPNext username + password. The credentials are verified against
 * the Frappe CRM site (dev03) with an automatic fallback to ERPNext (dev06); we keep a signed,
 * HttpOnly session cookie carrying the user's id, display name, roles, and isSystemUser flag.
 *
 * Failed attempts are rate limited per IP + username (see lib/login-rate-limit.ts).
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

  // Pick up Cloudflare bindings
  await ensureCloudflareEnv();
  const limiter = resolveLoginRateLimiter();
  const attemptKey = loginAttemptKey(clientIp(request), usr);
  const before = await limiter.check(attemptKey);
  if (before.blocked) {
    return jsonResponse(
      { error: `Too many failed sign-in attempts. Try again in ${before.retryAfterSeconds}s.` },
      429,
      { "Retry-After": String(before.retryAfterSeconds) },
    );
  }

  const primaryBase = frappeBaseUrl();
  const secondaryBase = erpnextBaseUrl();

  let effectiveBase = primaryBase;
  let loginResponse: Response;

  try {
    loginResponse = await fetch(`${primaryBase}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ usr, pwd }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    loginResponse = new Response(null, { status: 502 });
  }

  // If primary site fails with any error and secondary is configured, try secondary (ERPNext)
  if (!loginResponse.ok && secondaryBase && secondaryBase !== primaryBase) {
    try {
      const secondaryResponse = await fetch(`${secondaryBase}/api/method/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ usr, pwd }),
        signal: AbortSignal.timeout(20_000),
      });
      if (secondaryResponse.ok) {
        loginResponse = secondaryResponse;
        effectiveBase = secondaryBase;
      }
    } catch {
      // keep primary response
    }
  }

  if (loginResponse.status === 401 || loginResponse.status === 403) {
    const after = await limiter.recordFailure(attemptKey);
    if (after.blocked) {
      return jsonResponse(
        {
          error: `Too many failed sign-in attempts. Try again in ${after.retryAfterSeconds}s.`,
        },
        429,
        { "Retry-After": String(after.retryAfterSeconds) },
      );
    }
    return jsonResponse({ error: "Invalid username or password" }, 401);
  }
  if (!loginResponse.ok) {
    if (loginResponse.status === 523) {
      return jsonResponse(
        {
          error:
            "Backend ERP/CRM server is currently unreachable (Cloudflare 523). Please check if your Frappe server is online.",
        },
        502,
      );
    }
    return jsonResponse({ error: `Login failed (${loginResponse.status})` }, 502);
  }

  let fullName = usr;
  try {
    const payload = (await loginResponse.json()) as { full_name?: unknown };
    if (typeof payload.full_name === "string" && payload.full_name) fullName = payload.full_name;
  } catch {
    // keep typed name
  }

  // Resolve canonical user id & roles using temporary session cookie
  let userId = usr;
  let roles: string[] = [];
  const setCookie = loginResponse.headers.get("set-cookie") ?? "";
  const sid = /(?:^|[,\s])sid=([^;,\s]+)/.exec(setCookie)?.[1];
  if (sid && sid !== "Guest") {
    try {
      const who = await fetch(`${effectiveBase}/api/method/frappe.auth.get_logged_user`, {
        headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (who.ok) {
        const data = (await who.json()) as { message?: unknown };
        if (typeof data.message === "string" && data.message) userId = data.message;
      }
    } catch {
      // fall back to typed username
    }

    try {
      // Fetch user document to get assigned roles
      const userRes = await fetch(
        `${effectiveBase}/api/resource/User/${encodeURIComponent(userId)}`,
        {
          headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (userRes.ok) {
        const userData = (await userRes.json()) as {
          data?: { roles?: Array<{ role?: string } | string> };
        };
        const rawRoles = userData.data?.roles;
        if (Array.isArray(rawRoles)) {
          roles = rawRoles
            .map((r) => (typeof r === "string" ? r : r.role ?? ""))
            .filter(Boolean);
        }
      } else {
        // Fallback: try desk form load getdoc
        const docRes = await fetch(
          `${effectiveBase}/api/method/frappe.desk.form.load.getdoc?doctype=User&name=${encodeURIComponent(userId)}`,
          {
            headers: { Cookie: `sid=${sid}`, Accept: "application/json" },
            signal: AbortSignal.timeout(10_000),
          },
        );
        if (docRes.ok) {
          const docData = (await docRes.json()) as {
            docs?: Array<{ roles?: Array<{ role?: string } | string> }>;
          };
          const rawRoles = docData.docs?.[0]?.roles;
          if (Array.isArray(rawRoles)) {
            roles = rawRoles
              .map((r) => (typeof r === "string" ? r : r.role ?? ""))
              .filter(Boolean);
          }
        }
      }
    } catch {
      // proceed with fallback or empty roles
    }

    if (userId.toLowerCase() === "administrator" && !roles.includes("Administrator")) {
      roles.push("Administrator");
    }
  }

  if (!isUserAllowed(userId, usr)) {
    return jsonResponse({ error: "This account is not allowed to use this app" }, 403);
  }

  await limiter.reset(attemptKey);

  const isSystemUser = isSystemUserRoles(roles);
  const isDedicatedSystem = isDedicatedSystemUser(roles);

  const token = await signSession(
    {
      u: userId,
      n: fullName,
      roles,
      isSystemUser,
      isDedicatedSystem,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    },
    secret,
  );
  return jsonResponse(
    { user: userId, name: fullName, roles, isSystemUser, isDedicatedSystem },
    200,
    {
      "Set-Cookie": buildSessionCookie(token, {
        maxAge: SESSION_TTL_SECONDS,
        secure: isSecureRequest(request),
      }),
    },
  );
}

export const Route = createFileRoute("/api/auth/login")({
  server: { handlers: { POST: ({ request }) => login(request) } },
});
