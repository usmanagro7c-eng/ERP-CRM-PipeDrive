import { describe, expect, it } from "vitest";

import { isDedicatedSystemUser, isSystemUserRoles } from "@/lib/server-auth";
import {
  buildSessionCookie,
  isSameOrigin,
  parseCookies,
  signSession,
  verifySession,
} from "@/lib/session";

const secret = "x".repeat(40);
const now = 1_000_000;

describe("session cookie", () => {
  it("round-trips a valid session with roles and system user flags", async () => {
    const token = await signSession(
      {
        u: "admin@agrovisions.pk",
        n: "System Admin",
        roles: ["System Manager"],
        isSystemUser: true,
        isDedicatedSystem: true,
        exp: now + 60,
      },
      secret,
    );
    const payload = await verifySession(token, secret, now);
    expect(payload).toEqual({
      u: "admin@agrovisions.pk",
      n: "System Admin",
      roles: ["System Manager"],
      isSystemUser: true,
      isDedicatedSystem: true,
      exp: now + 60,
    });
  });

  it("rejects expired, tampered and wrong-secret tokens", async () => {
    const token = await signSession({ u: "a@b.com", n: "A", exp: now + 60 }, secret);
    expect(await verifySession(token, secret, now + 61)).toBeNull();
    expect(await verifySession(token, "y".repeat(40), now)).toBeNull();

    const [body, sig] = token.split(".");
    const forgedBody = btoa(JSON.stringify({ u: "admin", n: "x", exp: now + 999 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySession(`${forgedBody}.${sig}`, secret, now)).toBeNull();
    expect(await verifySession(`${body}.`, secret, now)).toBeNull();
    expect(await verifySession("garbage", secret, now)).toBeNull();
    expect(await verifySession(undefined, secret, now)).toBeNull();
  });

  it("builds a hardened cookie and parses cookie headers", () => {
    const cookie = buildSessionCookie("abc", { maxAge: 10, secure: true });
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(parseCookies("a=1; agrocrm_session=abc%2E; b=2")).toMatchObject({
      agrocrm_session: "abc.",
    });
  });

  it("checks the Origin header", () => {
    const same = new Request("https://app.example.com/api/x", {
      method: "POST",
      headers: { origin: "https://app.example.com", host: "app.example.com" },
    });
    const other = new Request("https://app.example.com/api/x", {
      method: "POST",
      headers: { origin: "https://evil.example.org", host: "app.example.com" },
    });
    expect(isSameOrigin(same)).toBe(true);
    expect(isSameOrigin(other)).toBe(false);
  });

  it("accurately classifies system user and dedicated system user roles", () => {
    // System User / Manager
    expect(isSystemUserRoles(["System Manager"])).toBe(true);
    expect(isSystemUserRoles(["System User"])).toBe(true);
    expect(isSystemUserRoles(["Administrator"])).toBe(true);
    expect(isSystemUserRoles(["Sales User"])).toBe(false);
    expect(isSystemUserRoles(["Sales Manager"])).toBe(false);

    // Dedicated System User (no sales access, excluding Administrator who is super-admin)
    expect(isDedicatedSystemUser(["System Manager"])).toBe(true);
    expect(isDedicatedSystemUser(["System User"])).toBe(true);
    // Hybrid sales users retain full CRM access
    expect(isDedicatedSystemUser(["System Manager", "Sales User"])).toBe(false);
    expect(isDedicatedSystemUser(["System Manager", "Sales Manager"])).toBe(false);
    // Administrator retains full CRM access
    expect(isDedicatedSystemUser(["Administrator"])).toBe(false);
  });
});
