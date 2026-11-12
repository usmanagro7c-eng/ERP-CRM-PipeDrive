import { describe, expect, it } from "vitest";

import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  clientIp,
  createKvAttemptStore,
  createMemoryAttemptStore,
  loginAttemptKey,
  resetMemoryAttemptStore,
  resolveLoginRateLimiter,
  type KvNamespaceLike,
} from "@/lib/login-rate-limit";
import { registerCloudflareEnv, resetCloudflareEnv } from "@/lib/cloudflare-bindings";

function kvStub(): KvNamespaceLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

describe("login attempt key", () => {
  it("is scoped to the ip and the (case insensitive) username", () => {
    expect(loginAttemptKey("1.2.3.4", "User@Example.com")).toBe("1.2.3.4|user@example.com");
    expect(loginAttemptKey("1.2.3.4", "a@b.c")).not.toBe(loginAttemptKey("5.6.7.8", "a@b.c"));
  });
});

describe("clientIp", () => {
  it("prefers the cloudflare header, then x-forwarded-for", () => {
    const cf = new Request("https://app.example.com/api/auth/login", {
      headers: { "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "8.8.8.8, 7.7.7.7" },
    });
    expect(clientIp(cf)).toBe("9.9.9.9");

    const forwarded = new Request("https://app.example.com/api/auth/login", {
      headers: { "x-forwarded-for": "8.8.8.8, 7.7.7.7" },
    });
    expect(clientIp(forwarded)).toBe("8.8.8.8");

    expect(clientIp(new Request("https://app.example.com/api/auth/login"))).toBe("unknown");
  });
});

describe("in-memory attempt store", () => {
  it("counts failures, blocks after 5 and forgets them on reset", async () => {
    resetMemoryAttemptStore();
    const limiter = resolveLoginRateLimiter();
    expect(limiter.backend).toBe("memory");

    const key = "1.1.1.1|user@example.com";
    for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt++) {
      const result = await limiter.recordFailure(key);
      expect(result.attempts).toBe(attempt);
      expect(result.blocked).toBe(false);
    }

    // The next attempt is rejected: 5 failures were already made.
    const blocked = await limiter.check(key);
    expect(blocked.blocked).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(LOGIN_WINDOW_MS / 1000);

    // A different user from the same ip is not affected.
    expect((await limiter.check("1.1.1.1|other@example.com")).blocked).toBe(false);

    await limiter.reset(key);
    expect((await limiter.check(key)).blocked).toBe(false);
  });

  it("expires counters after the window", async () => {
    let now = 1_000_000;
    const store = createMemoryAttemptStore(() => now);
    await store.write("k", { count: 5, expiresAt: now + 1_000 });
    expect(await store.read("k")).not.toBeNull();
    now += 2_000;
    expect(await store.read("k")).toBeNull();
  });
});

describe("KV attempt store", () => {
  it("stores and clears the counter in the namespace", async () => {
    const kv = kvStub();
    const store = createKvAttemptStore(kv);
    expect(store.kind).toBe("kv");

    await store.write("1.2.3.4|user@example.com", {
      count: 3,
      expiresAt: Date.now() + LOGIN_WINDOW_MS,
    });
    const state = await store.read("1.2.3.4|user@example.com");
    expect(state?.count).toBe(3);

    await store.clear("1.2.3.4|user@example.com");
    expect(await store.read("1.2.3.4|user@example.com")).toBeNull();
  });

  it("ignores corrupted values", async () => {
    const kv = kvStub();
    kv.store.set("login-fail:broken", "not json");
    const store = createKvAttemptStore(kv);
    expect(await store.read("broken")).toBeNull();
  });
});

describe("resolveLoginRateLimiter", () => {
  it("uses the cloudflare rate limiting binding when it is configured", async () => {
    resetCloudflareEnv();
    resetMemoryAttemptStore();
    let allowed = true;
    registerCloudflareEnv({
      LOGIN_RATE_LIMITER: {
        async limit() {
          return { success: allowed };
        },
      },
    });

    const limiter = resolveLoginRateLimiter();
    expect(limiter.backend).toBe("cloudflare");
    expect((await limiter.check("k")).blocked).toBe(false);

    allowed = false;
    expect((await limiter.check("k")).blocked).toBe(true);
    resetCloudflareEnv();
  });

  it("uses the KV namespace when only that is configured", async () => {
    resetCloudflareEnv();
    resetMemoryAttemptStore();
    registerCloudflareEnv({ LOGIN_RATE_LIMIT_KV: kvStub() });
    expect(resolveLoginRateLimiter().backend).toBe("kv");
    resetCloudflareEnv();
  });

  it("falls back to the in-memory store", () => {
    resetCloudflareEnv();
    resetMemoryAttemptStore();
    expect(resolveLoginRateLimiter().backend).toBe("memory");
  });
});
