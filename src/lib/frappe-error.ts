/**
 * Helpers for turning raw Frappe/ERPNext error payloads into text that is
 * safe and readable to render inside our UI (toasts, dialogs, etc.).
 *
 * Frappe messages often embed raw HTML (e.g. links to documents) which looks
 * broken and confusing when rendered as plain text, so we strip the tags and
 * decode the common entities.
 */

const HTML_TAG_RE = /<[^>]*>/g;

export function stripHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, " ")
    .replace(HTML_TAG_RE, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Return a single friendly sentence extracted from a Frappe error. */
export function friendlyFrappeError(err: unknown, fallback = "Something went wrong"): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const text = stripHtml(raw);
  if (!text) return fallback;
  // Drop noisy library prefixes like "FrappeApiError: " if present.
  return text.replace(/^FrappeApiError:\s*/i, "").trim() || fallback;
}

/** Detect the classic "Cannot delete/cancel because ... is linked with ..." conflict. */
export function isLinkedRecordConflict(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /\bis linked with\b/i.test(err.message) || /\blinked with\b/i.test(err.message);
}
