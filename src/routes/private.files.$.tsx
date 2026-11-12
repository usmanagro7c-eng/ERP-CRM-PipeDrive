import { createFileRoute } from "@tanstack/react-router";

import { frappeApiKey, frappeApiSecret, frappeBaseUrl, jsonResponse } from "@/lib/server-auth";

/**
 * Serves private files stored on the Frappe backend (e.g. attachments marked
 * private) through the app origin so that relative `/private/files/...` URLs
 * returned by Frappe resolve correctly and are fetched with the server's
 * credentials.
 */
export const Route = createFileRoute("/private/files/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const splat = url.pathname.replace(/^\/private\/files\//, "");
        const target = `${frappeBaseUrl()}/private/files/${splat}${url.search}`;
        const headers: HeadersInit = { Accept: "*/*" };
        const key = frappeApiKey();
        const secret = frappeApiSecret();
        if (key && secret) headers["Authorization"] = `token ${key}:${secret}`;
        try {
          const upstream = await fetch(target, { headers, signal: AbortSignal.timeout(30_000) });
          if (!upstream.ok) {
            return jsonResponse({ error: `File not found (${upstream.status})` }, upstream.status);
          }
          const ct = upstream.headers.get("content-type") || "application/octet-stream";
          const buf = await upstream.arrayBuffer();
          const filename = decodeURIComponent(splat.split("/").pop() ?? "").replace(/"/g, "");
          const outHeaders: Record<string, string> = {
            "Content-Type": ct,
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "private, max-age=600",
            "X-Content-Type-Options": "nosniff",
          };
          if (/text\/html|image\/svg|application\/xml/i.test(ct)) {
            outHeaders["Content-Security-Policy"] = "sandbox";
          }
          return new Response(buf, { status: 200, headers: outHeaders });
        } catch {
          return jsonResponse({ error: "Could not reach Frappe" }, 502);
        }
      },
    },
  },
});
