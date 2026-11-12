import { createFileRoute } from "@tanstack/react-router";

import { frappeApiKey, frappeApiSecret, frappeBaseUrl, jsonResponse } from "@/lib/server-auth";

/**
 * Serves files stored on the Frappe backend (e.g. attachments) through the app
 * origin so that relative `/files/...` URLs returned by Frappe resolve correctly.
 */
export const Route = createFileRoute("/files/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const splat = url.pathname.replace(/^\/files\//, "");
        const target = `${frappeBaseUrl()}/files/${splat}${url.search}`;
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
          return new Response(buf, {
            status: 200,
            headers: {
              "Content-Type": ct,
              "Cache-Control": "public, max-age=3600",
            },
          });
        } catch {
          return jsonResponse({ error: "Could not reach Frappe" }, 502);
        }
      },
    },
  },
});