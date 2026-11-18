type Bucket = {
  count: number;
  resetAt: number;
  blockedUntil: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

export function resetRateLimits() {
  buckets.clear();
}

export function consumeRateLimit(key: string, options?: { limit?: number; windowMs?: number; blockMs?: number }): RateLimitResult {
  const limit = options?.limit ?? 5;
  const windowMs = options?.windowMs ?? 15 * 60 * 1000;
  const blockMs = options?.blockMs ?? 15 * 60 * 1000;
  const t = now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= t) {
    const fresh: Bucket = { count: 1, resetAt: t + windowMs, blockedUntil: 0 };
    buckets.set(key, fresh);
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.blockedUntil > t) {
    return { allowed: false, retryAfterMs: existing.blockedUntil - t };
  }
  existing.count += 1;
  if (existing.count > limit) {
    existing.blockedUntil = t + blockMs;
    return { allowed: false, retryAfterMs: blockMs };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function checkLoginRateLimit(input: { ip: string; email: string }) {
  const email = input.email.toLowerCase();
  const ipKey = `login:ip:${input.ip || "unknown"}`;
  const accountKey = `login:account:${email}`;
  const ip = consumeRateLimit(ipKey, { limit: 10, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
  const account = consumeRateLimit(accountKey, { limit: 5, windowMs: 15 * 60 * 1000, blockMs: 15 * 60 * 1000 });
  const allowed = ip.allowed && account.allowed;
  return {
    allowed,
    retryAfterMs: Math.max(ip.retryAfterMs, account.retryAfterMs),
    ipAllowed: ip.allowed,
    accountAllowed: account.allowed,
  };
}
