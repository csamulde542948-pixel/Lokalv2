/**
 * In-memory per-user sliding-window rate limiter.
 *
 * Designed for use inside GraphQL resolvers where express-rate-limit
 * (which operates at the HTTP layer) cannot distinguish per-mutation
 * limits. Uses a Map of userId → timestamp[] for O(n) per-user tracking
 * with automatic pruning of old entries.
 *
 * Usage:
 *   const limiter = new PerUserRateLimiter({ windowMs: 60_000, maxRequests: 5 });
 *   limiter.check(userId); // throws if over limit
 */

export interface PerUserRateLimiterOptions {
  /** Rolling window in milliseconds */
  windowMs: number;
  /** Maximum allowed requests within the window */
  maxRequests: number;
  /** Human-readable action name for error messages */
  action?: string;
}

export class PerUserRateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly action: string;
  /** userId → sorted array of timestamps (ms) within the current window */
  private readonly store = new Map<string, number[]>();

  constructor(options: PerUserRateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.action = options.action ?? "this action";
  }

  /**
   * Check whether `userId` is within their rate limit quota.
   * Records the current timestamp and throws if over the limit.
   */
  check(userId: string): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Prune timestamps outside the window
    const timestamps = (this.store.get(userId) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterSec = Math.ceil((oldestInWindow + this.windowMs - now) / 1000);
      throw new Error(
        `Rate limit exceeded for ${this.action}. Try again in ${retryAfterSec} second(s).`
      );
    }

    timestamps.push(now);
    this.store.set(userId, timestamps);
  }

  /** Evict stale entries to prevent unbounded memory growth. Call periodically if needed. */
  prune(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [userId, timestamps] of this.store.entries()) {
      const pruned = timestamps.filter((t) => t > cutoff);
      if (pruned.length === 0) {
        this.store.delete(userId);
      } else {
        this.store.set(userId, pruned);
      }
    }
  }
}

// ─── Shared limiters for expensive resolver operations ───────────────────────

/** generateRoast (authenticated): max 10 per user per hour */
export const roastRateLimiter = new PerUserRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  action: "AI roast generation",
});

/** generateRoast (anonymous): max 3 per IP per hour */
export const ipRoastLimiter = new PerUserRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  action: "anonymous AI roast generation",
});

/** scrapeProjectInfo: max 10 per user per 10 minutes */
export const scrapeRateLimiter = new PerUserRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  action: "project URL scraping",
});

/**
 * HIGH-01: globalSearch / searchProfiles — max 30 searches per IP per minute.
 * Prevents enumeration attacks and ILIKE table-scan abuse.
 */
export const searchRateLimiter = new PerUserRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  action: "search",
});

// Prune stale entries every 30 minutes to prevent memory leaks
setInterval(() => {
  roastRateLimiter.prune();
  ipRoastLimiter.prune();
  scrapeRateLimiter.prune();
  searchRateLimiter.prune();
}, 30 * 60 * 1000).unref(); // .unref() so it doesn't prevent process exit

// ─── Roast Deduplication ─────────────────────────────────────────────────────

/**
 * Normalize a URL for deduplication comparison.
 *  - Lowercases hostname
 *  - Strips www.
 *  - Removes trailing slash from path
 *  - Strips utm_* / ref / fbclid / tracking query params
 *  - Strips the fragment (#section)
 */
export function normalizeRoastUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // If it can't be parsed just lowercase + trim
    return raw.toLowerCase().trim();
  }

  // Strip tracking params
  const TRACKING_PARAMS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "ref", "referrer", "fbclid", "gclid", "mc_cid", "mc_eid", "igshid",
    "s", "_ga",
  ];
  TRACKING_PARAMS.forEach(p => url.searchParams.delete(p));

  const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const search   = url.searchParams.toString() ? `?${url.searchParams.toString()}` : "";

  return `${url.protocol}//${hostname}${pathname}${search}`;
}

/**
 * Per-URL cooldown cache: the same canonical URL can only trigger a fresh
 * AI roast once per TTL window. After that, the cached result is returned.
 *
 * This protects AI API credits and prevents the feed from being flooded with
 * identical roasts of the same URL.
 */
export interface CachedRoastEntry {
  result: Record<string, unknown>;
  expiresAt: number;
}

export class RoastUrlCache {
  /** canonical URL → cached roast result */
  private readonly cache = new Map<string, CachedRoastEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000 /* 24 h */) {
    this.ttlMs = ttlMs;
  }

  get(canonicalUrl: string): CachedRoastEntry["result"] | null {
    const entry = this.cache.get(canonicalUrl);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(canonicalUrl);
      return null;
    }
    return entry.result;
  }

  set(canonicalUrl: string, result: Record<string, unknown>): void {
    this.cache.set(canonicalUrl, { result, expiresAt: Date.now() + this.ttlMs });
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }
}

/** Global per-URL roast cache (24 h TTL) */
export const roastUrlCache = new RoastUrlCache(24 * 60 * 60 * 1000);

/**
 * Per-user-per-URL dedup limiter.
 * Key: `${userId}:${canonicalUrl}`
 * A user can only generate a fresh roast for the same URL once per TTL.
 */
export class PerUserUrlLimiter {
  /** `userId:canonicalUrl` → expiry timestamp */
  private readonly store = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000 /* 24 h */) {
    this.ttlMs = ttlMs;
  }

  /**
   * Returns true if this (user, url) pair has been seen within the TTL window.
   * Records the pair so subsequent calls within the window also return true.
   */
  isDuplicate(userId: string, canonicalUrl: string): boolean {
    const key = `${userId}:${canonicalUrl}`;
    const expiresAt = this.store.get(key);
    if (expiresAt && Date.now() < expiresAt) return true;
    this.store.set(key, Date.now() + this.ttlMs);
    return false;
  }

  prune(): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.store.entries()) {
      if (now > expiresAt) this.store.delete(key);
    }
  }
}

/** Global per-user-per-URL dedup limiter (24 h TTL) */
export const perUserUrlLimiter = new PerUserUrlLimiter(24 * 60 * 60 * 1000);

// Include new caches in the prune cycle
setInterval(() => {
  roastUrlCache.prune();
  perUserUrlLimiter.prune();
}, 30 * 60 * 1000).unref();
