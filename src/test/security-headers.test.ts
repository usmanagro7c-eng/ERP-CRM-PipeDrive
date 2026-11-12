import { describe, expect, it } from "vitest";

import {
  SECURITY_HEADERS,
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "@/lib/security-headers";

describe("content security policy", () => {
  it("restricts every resource type to self", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("font-src 'self' data:");
  });

  it("allows the inline styles tailwind and radix need", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("does not allow scripts from other origins and blocks inline handlers", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*https?:/);
    expect(csp).toContain("script-src-attr 'none'");
  });

  it("allows images from the frappe and erpnext sites", () => {
    const csp = buildContentSecurityPolicy({
      imageOrigins: ["https://dev03.agrovisions.pk", "https://dev06.agrovisions.pk"],
    });
    expect(csp).toContain(
      "img-src 'self' data: blob: https://dev03.agrovisions.pk https://dev06.agrovisions.pk",
    );
  });
});

describe("applySecurityHeaders", () => {
  it("sets every security header", () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    expect(headers.get("Content-Security-Policy")).toBeTruthy();
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("same-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(headers.get(name)).toBe(value);
    }
  });

  it("denies powerful features without deprecated policy tokens", () => {
    const headers = new Headers();
    applySecurityHeaders(headers);
    const policy = headers.get("Permissions-Policy") ?? "";
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("geolocation=()");
    // Chrome removed FLoC; the token only produces an "Unrecognized feature" warning.
    expect(policy).not.toContain("interest-cohort");
  });
});
