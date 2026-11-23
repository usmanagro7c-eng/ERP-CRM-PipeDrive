import { createFileRoute } from "@tanstack/react-router";

import { ensureCloudflareEnv } from "@/lib/cloudflare-bindings";
import {
  frappeApiKey,
  frappeApiSecret,
  frappeBaseUrl,
  getSession,
  isDedicatedSystemUser,
  isSystemUserRoles,
  jsonResponse,
  sessionSecret,
} from "@/lib/server-auth";
import {
  SESSION_TTL_SECONDS,
  buildSessionCookie,
  isSecureRequest,
  signSession,
} from "@/lib/session";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureCloudflareEnv();
        const session = await getSession(request);
        if (!session) return jsonResponse({ error: "Not authenticated" }, 401);

        let roles = session.roles ?? [];
        let isSystemUser = Boolean(session.isSystemUser);
        let isDedicatedSystem = Boolean(session.isDedicatedSystem);
        let updated = false;

        // If roles are missing or isSystemUser is false, check live user record from Frappe
        // so that existing active sessions are seamlessly refreshed without requiring relogin.
        if (!isSystemUser || roles.length === 0) {
          if (session.u.toLowerCase() === "administrator") {
            if (!roles.includes("Administrator")) roles.push("Administrator");
            isSystemUser = true;
            isDedicatedSystem = false;
            updated = true;
          } else {
            const apiKey = frappeApiKey();
            const apiSecret = frappeApiSecret();
            const base = frappeBaseUrl();
            if (apiKey && apiSecret && base) {
              try {
                const authHeader = `token ${apiKey}:${apiSecret}`;
                const res = await fetch(
                  `${base}/api/resource/User/${encodeURIComponent(session.u)}`,
                  {
                    headers: {
                      Authorization: authHeader,
                      Accept: "application/json",
                    },
                    signal: AbortSignal.timeout(5000),
                  },
                );
                if (res.ok) {
                  const doc = (await res.json()) as {
                    data?: { roles?: Array<{ role?: string } | string> };
                  };
                  const rawRoles = doc.data?.roles;
                  if (Array.isArray(rawRoles)) {
                    roles = rawRoles
                      .map((r) => (typeof r === "string" ? r : r.role ?? ""))
                      .filter(Boolean);
                    isSystemUser = isSystemUserRoles(roles);
                    isDedicatedSystem = isDedicatedSystemUser(roles);
                    updated = true;
                  }
                }
              } catch {
                // keep current session state
              }
            }
          }
        }

        const headers: Record<string, string> = {};

        // If roles or flags were refreshed, update the signed session cookie
        if (updated) {
          const secret = sessionSecret();
          if (secret) {
            try {
              const token = await signSession(
                {
                  u: session.u,
                  n: session.n,
                  roles,
                  isSystemUser,
                  isDedicatedSystem,
                  exp: session.exp ?? Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
                },
                secret,
              );
              headers["Set-Cookie"] = buildSessionCookie(token, {
                maxAge: SESSION_TTL_SECONDS,
                secure: isSecureRequest(request),
              });
            } catch {
              // ignore cookie signing error
            }
          }
        }

        return jsonResponse(
          {
            user: session.u,
            name: session.n,
            roles,
            isSystemUser,
            isDedicatedSystem,
          },
          200,
          headers,
        );
      },
    },
  },
});