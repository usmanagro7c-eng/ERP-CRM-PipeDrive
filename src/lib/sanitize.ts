import DOMPurify from "dompurify";

/**
 * Safely sanitizes HTML content to prevent XSS attacks.
 * Works both on client (using DOMPurify) and during SSR.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  if (typeof window === "undefined") {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/javascript:[^"']*/gi, "");
  }
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ["target"],
  });
}
