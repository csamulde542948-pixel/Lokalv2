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

import { GraphQLError } from "graphql";

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
      throw new GraphQLError(
        `Rate limit exceeded for ${this.action}. Try again in ${retryAfterSec} second(s).`,
        { extensions: { code: "RATE_LIMITED" } }
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

// ─── Calendar-day Rate Limiter ────────────────────────────────────────────────

/**
 * Resets the counter at UTC midnight each day, so "N per day" means N requests
 * from 00:00 to 23:59 UTC — not a rolling 24-hour window.
 *
 * For anonymous roast limits the key is the public network IP from
 * X-Forwarded-For. Because most home/office networks use NAT, all devices
 * behind the same router share one public IP, satisfying the requirement that
 * "even different devices on the same network count as one user".
 */
export class DailyRateLimiter {
  private readonly maxRequests: number;
  private readonly action: string;
  /** key → { date: "YYYY-MM-DD" (UTC), count: number } */
  private readonly store = new Map<string, { date: string; count: number }>();

  constructor(options: { maxRequests: number; action?: string }) {
    this.maxRequests = options.maxRequests;
    this.action = options.action ?? "this action";
  }

  private todayUtc(): string {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  check(key: string): void {
    const today = this.todayUtc();
    const entry = this.store.get(key);

    // First request today — allow and record
    if (!entry || entry.date !== today) {
      this.store.set(key, { date: today, count: 1 });
      return;
    }

    if (entry.count >= this.maxRequests) {
      const now = new Date();
      const midnight = new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
      ));
      const secsLeft = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
      const h = Math.floor(secsLeft / 3600);
      const m = Math.floor((secsLeft % 3600) / 60);
      throw new GraphQLError(
        `Daily limit reached for ${this.action}. Resets in ${h}h ${m}m (at UTC midnight).`,
        { extensions: { code: "RATE_LIMITED" } }
      );
    }

    entry.count += 1;
  }

  /** How many requests this key has used today */
  getCount(key: string): number {
    const entry = this.store.get(key);
    if (!entry || entry.date !== this.todayUtc()) return 0;
    return entry.count;
  }

  /** How many requests this key still has left today */
  getRemaining(key: string): number {
    return Math.max(0, this.maxRequests - this.getCount(key));
  }

  /** Evict entries from past days to prevent unbounded memory growth */
  prune(): void {
    const today = this.todayUtc();
    for (const [key, entry] of this.store.entries()) {
      if (entry.date !== today) this.store.delete(key);
    }
  }
}

// ─── Shared limiters for expensive resolver operations ───────────────────────

/**
 * generateRoast (authenticated): 3 roasts per user per calendar day (UTC).
 * Keyed on the stable Supabase user ID.
 */
export const roastDailyLimiter = new DailyRateLimiter({
  maxRequests: 3,
  action: "AI roast generation",
});

/**
 * generateRoast (anonymous): 1 roast per network IP per calendar day (UTC).
 *
 * Keyed on the public IP from X-Forwarded-For[0]. Because home/office networks
 * use NAT, every device on the same router shares one public IP — so the limit
 * is effectively per-network, not per-device, exactly as intended.
 */
export const ipRoastDailyLimiter = new DailyRateLimiter({
  maxRequests: 1,
  action: "anonymous AI roast generation",
});

/**
 * generateRoast (authenticated, per-IP): 3 roasts per network IP per calendar
 * day (UTC), shared across ALL authenticated accounts originating from the
 * same public IP.
 *
 * This prevents multi-account abuse where someone creates several accounts
 * to multiply their daily roast quota. Every authenticated account on the
 * same NAT network shares a single pool of 3 roasts per day.
 *
 * Keyed on the public IP from X-Forwarded-For[0].
 */
export const ipAuthRoastDailyLimiter = new DailyRateLimiter({
  maxRequests: 3,
  action: "AI roast generation (IP limit)",
});

// ── Keep old sliding-window limiters for non-roast uses ──────────────────────

/** @deprecated Use roastDailyLimiter instead */
export const roastRateLimiter = new PerUserRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  action: "AI roast generation (legacy)",
});

/** @deprecated Use ipRoastDailyLimiter instead */
export const ipRoastLimiter = new PerUserRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  action: "anonymous AI roast generation (legacy)",
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
  roastDailyLimiter.prune();
  ipRoastDailyLimiter.prune();
  ipAuthRoastDailyLimiter.prune();
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

  hasDuplicate(userId: string, canonicalUrl: string): boolean {
    const key = `${userId}:${canonicalUrl}`;
    const expiresAt = this.store.get(key);
    return !!expiresAt && Date.now() < expiresAt;
  }

  record(userId: string, canonicalUrl: string): void {
    const key = `${userId}:${canonicalUrl}`;
    this.store.set(key, Date.now() + this.ttlMs);
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
