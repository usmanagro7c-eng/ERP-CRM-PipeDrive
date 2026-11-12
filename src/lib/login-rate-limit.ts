/**
 * Brute-force protection for /api/auth/login.
 *
 * At most 5 failed sign-in attempts are allowed per (IP + username) within a
 * 10 minute window; further attempts are answered with 429.
 *
 * Backends, in order of preference:
 *  1. a Cloudflare rate limiting binding (`LOGIN_RATE_LIMITER`) - the limit
 *     is then enforced by Cloudflare itself;
 *  2. a Cloudflare KV namespace (`LOGIN_RATE_LIMIT_KV`) - the counter is
 *     shared by every isolate;
 *  3. an in-memory counter - per isolate only, so it is lost on a cold start
 *     and not shared between isolates (see the README).
 */

import { getCloudflareBinding } from "@/lib/cloudflare-bindings";

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 10 * 60 * 1000;

/** Name of the (optional) Cloudflare rate limiting binding. */
export const RATE_LIMITER_BINDING = "LOGIN_RATE_LIMITER";
/** Name of the (optional) Cloudflare KV namespace used as a counter store. */
export const RATE_LIMIT_KV_BINDING = "LOGIN_RATE_LIMIT_KV";

export interface AttemptState {
  count: number;
  /** Unix milliseconds at which the counter expires. */
  expiresAt: number;
}

export interface AttemptStore {
  readonly kind: "memory" | "kv";
  read(key: string): Promise<AttemptState | null>;
  write(key: string, state: AttemptState): Promise<void>;
  clear(key: string): Promise<void>;
}

/** Minimal shape of a Cloudflare KV namespace. */
export interface KvNamespaceLike {
  get(key: string, type?: "text"): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Minimal shape of a Cloudflare rate limiting binding. */
export interface RateLimiterBindingLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
  reset?(options: { key: string }): Promise<void>;
}

export type LoginRateLimiterBackend = "cloudflare" | "kv" | "memory";

export interface LoginRateLimiter {
  readonly backend: LoginRateLimiterBackend;
  /** True when the attempt is blocked (too many recent failures). */
  check(key: string): Promise<{ blocked: boolean; attempts: number; retryAfterSeconds: number }>;
  /** Register a failed sign-in attempt. */
  recordFailure(key: string): Promise<{
    blocked: boolean;
    attempts: number;
    retryAfterSeconds: number;
  }>;
  /** Forget the failures of this key (successful sign-in). */
  reset(key: string): Promise<void>;
}

/** Key used to count the failures of one (IP, username) pair. */
export function loginAttemptKey(ip: string, username: string): string {
  return `${ip.trim()}|${username.trim().toLowerCase()}`;
}

/** Best effort client IP of a request. */
export function clientIp(request: Request): string {
  const connecting = request.headers.get("cf-connecting-ip");
  if (connecting) return connecting.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** In-memory counter store (per isolate). */
export function createMemoryAttemptStore(now: () => number = Date.now): AttemptStore {
  const entries = new Map<string, AttemptState>();
  return {
    kind: "memory",
    async read(key) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return null;
      }
      return entry;
    },
    async write(key, state) {
      entries.set(key, state);
    },
    async clear(key) {
      entries.delete(key);
    },
  };
}

/** KV backed counter store (shared by every isolate). */
export function createKvAttemptStore(kv: KvNamespaceLike): AttemptStore {
  const prefix = "login-fail:";
  return {
    kind: "kv",
    async read(key) {
      const raw = await kv.get(prefix + key, "text");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as Partial<AttemptState>;
        if (typeof parsed?.count !== "number" || typeof parsed?.expiresAt !== "number") {
          return null;
        }
        return { count: parsed.count, expiresAt: parsed.expiresAt };
      } catch {
        return null;
      }
    },
    async write(key, state) {
      const ttlSeconds = Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 1000));
      await kv.put(prefix + key, JSON.stringify(state), { expirationTtl: ttlSeconds });
    },
    async clear(key) {
      await kv.delete(prefix + key);
    },
  };
}

function counterLimiter(store: AttemptStore): LoginRateLimiter {
  return {
    backend: store.kind,
    async check(key) {
      const state = await store.read(key);
      if (!state) return { blocked: false, attempts: 0, retryAfterSeconds: 0 };
      const blocked = state.count >= LOGIN_MAX_ATTEMPTS;
      return {
        blocked,
        attempts: state.count,
        retryAfterSeconds: blocked
          ? Math.max(1, Math.ceil((state.expiresAt - Date.now()) / 1000))
          : 0,
      };
    },
    async recordFailure(key) {
      const now = Date.now();
      const current = await store.read(key);
      const state: AttemptState = current
        ? { count: current.count + 1, expiresAt: current.expiresAt }
        : { count: 1, expiresAt: now + LOGIN_WINDOW_MS };
      await store.write(key, state);
      // The limit allows LOGIN_MAX_ATTEMPTS failures; the next attempt is
      // rejected by check().
      const blocked = state.count > LOGIN_MAX_ATTEMPTS;
      return {
        blocked,
        attempts: state.count,
        retryAfterSeconds: blocked ? Math.max(1, Math.ceil((state.expiresAt - now) / 1000)) : 0,
      };
    },
    async reset(key) {
      await store.clear(key);
    },
  };
}

function cloudflareLimiter(binding: RateLimiterBindingLike): LoginRateLimiter {
  return {
    backend: "cloudflare",
    async check(key) {
      const result = await binding.limit({ key });
      return {
        blocked: !result.success,
        attempts: result.success ? 0 : LOGIN_MAX_ATTEMPTS,
        retryAfterSeconds: result.success ? 0 : Math.ceil(LOGIN_WINDOW_MS / 1000),
      };
    },
    async recordFailure() {
      // The binding counts the attempt itself (limit() was called before).
      return { blocked: false, attempts: 0, retryAfterSeconds: 0 };
    },
    async reset(key) {
      await binding.reset?.({ key });
    },
  };
}

let memoryStore: AttemptStore | undefined;

/** Pick the best available backend for this request. */
export function resolveLoginRateLimiter(): LoginRateLimiter {
  const binding = getCloudflareBinding<RateLimiterBindingLike>(RATE_LIMITER_BINDING);
  if (binding && typeof binding.limit === "function") {
    return cloudflareLimiter(binding);
  }
  const kv = getCloudflareBinding<KvNamespaceLike>(RATE_LIMIT_KV_BINDING);
  if (kv && typeof kv.get === "function" && typeof kv.put === "function") {
    return counterLimiter(createKvAttemptStore(kv));
  }
  memoryStore ??= createMemoryAttemptStore();
  return counterLimiter(memoryStore);
}

/** Test helper: drop the in-memory counters. */
export function resetMemoryAttemptStore(): void {
  memoryStore = undefined;
}
