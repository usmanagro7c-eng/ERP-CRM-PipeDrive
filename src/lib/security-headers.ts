/**
 * Security headers applied to every response by the request middleware in
 * `src/start.ts`.
 *
 * The policy is "self only" for every resource type. Two exceptions are
 * needed by the app itself:
 *
 *  - `style-src 'unsafe-inline'`: Tailwind and the Radix/shadcn primitives
 *    position popovers with inline `style` attributes.
 *  - `script-src 'unsafe-inline'`: TanStack Start injects the SSR hydration
 *    payload as an inline <script> whose content differs per request, so it
 *    cannot be allow-listed by hash. `script-src-attr 'none'` still blocks
 *    inline event handlers, and no script may be loaded from another origin.
 */

/** Extra origins that may serve images (the Frappe CRM / ERPNext sites). */
export interface SecurityHeaderOptions {
  imageOrigins?: string[] | undefined;
}

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  // `interest-cohort` was removed from Chrome (FLoC is gone) and logs a
  // "Unrecognized feature" warning. `browsing-topics` is its modern replacement.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
};

export function buildContentSecurityPolicy(options: SecurityHeaderOptions = {}): string {
  const origins = (options.imageOrigins ?? []).filter(
    (origin): origin is string => typeof origin === "string" && origin.length > 0,
  );
  const imgSrc = ["'self'", "data:", "blob:", ...origins].join(" ");
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}

/** Add every security header to the given header collection. */
export function applySecurityHeaders(headers: Headers, options: SecurityHeaderOptions = {}): void {
  headers.set("Content-Security-Policy", buildContentSecurityPolicy(options));
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
}
