import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { applySecurityHeaders } from "./lib/security-headers";
import { erpnextBaseUrl, frappeBaseUrl } from "./lib/server-auth";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

function originOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "";
  }
}

/**
 * Adds the security headers to every response (HTML, API and errors).
 * It is the outermost middleware so that even the error page gets them.
 */
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response = result instanceof Response ? result : result.response;
  if (!response) return result;

  const headers = new Headers(response.headers);
  applySecurityHeaders(headers, {
    imageOrigins: [originOf(frappeBaseUrl()), originOf(erpnextBaseUrl())],
  });

  try {
    for (const [name, value] of headers) {
      response.headers.set(name, value);
    }
    return response;
  } catch {
    // Some responses have immutable headers; copy them into a new response.
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
