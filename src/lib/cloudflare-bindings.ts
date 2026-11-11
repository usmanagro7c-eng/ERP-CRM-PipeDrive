/**
 * Access to the Cloudflare Worker bindings (KV namespaces, rate limiters, ...).
 *
 * The bindings are handed to the worker entry (`src/server.ts`), which
 * registers them here. Everything else can then look them up without
 * importing `cloudflare:workers`, which is not resolvable in the Node test
 * runner or in the plain `vite dev` server.
 */

export interface CloudflareEnv {
  [key: string]: unknown;
}

let bindings: CloudflareEnv | undefined;
let envLoad: Promise<void> | undefined;

/** Called by the worker entry with the `env` object of the current request. */
export function registerCloudflareEnv(env: unknown): void {
  if (env && typeof env === "object") {
    bindings = env as CloudflareEnv;
  }
}

/**
 * Load the worker bindings from the `cloudflare:workers` module.
 *
 * The import is dynamic and deliberately not analysed by the bundler: the
 * module only exists inside the Cloudflare runtime. Everywhere else (tests,
 * `vite dev` without the Cloudflare plugin) this resolves to `undefined` and
 * the in-memory fallback is used.
 */
export async function ensureCloudflareEnv(): Promise<void> {
  if (bindings) return;
  envLoad ??= (async () => {
    try {
      const specifier = "cloudflare:workers";
      const mod = (await import(/* @vite-ignore */ specifier)) as { env?: unknown };
      if (mod?.env) registerCloudflareEnv(mod.env);
    } catch {
      // Not running on Cloudflare (tests, local dev without the plugin).
    }
  })();
  await envLoad;
}

/** The registered bindings, if the worker entry provided them. */
export function getCloudflareEnv(): CloudflareEnv | undefined {
  return bindings;
}

/** A single binding by name, or undefined when it is not configured. */
export function getCloudflareBinding<T = unknown>(name: string): T | undefined {
  const env = bindings;
  if (!env) return undefined;
  const value = env[name];
  return value === undefined || value === null ? undefined : (value as T);
}

/** Test helper: forget every registered binding. */
export function resetCloudflareEnv(): void {
  bindings = undefined;
}
