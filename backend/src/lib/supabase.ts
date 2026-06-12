import { createClient } from "@supabase/supabase-js";
import type { AuthUser } from "../graphql/context";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

// Secret-key client - used server-side only. Has full DB access.
// NEVER expose this to the client.
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Decode a Supabase JWT and return its expiration (seconds since epoch).
 * JWT format: header.payload.signature — payload is base64url JSON.
 * Returns 0 on parse failure.
 */
function jwtExp(token: string): number {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

/**
 * In-process cache of verified JWTs.
 *
 * Why: `supabase.auth.getUser(token)` issues a network call to the Supabase
 * Auth server on every request. For a feed page that fires 4–5 GraphQL
 * requests in parallel — each with its own `authMiddleware` invocation —
 * that adds 4–5 round-trips of pure auth overhead before the resolver
 * even starts. Caching by the JWT string itself is safe because:
 *   1. JWTs are stateless and self-contained.
 *   2. The same JWT is reused for the duration of the session.
 *   3. Cache entries expire when the JWT expires, so revocation via
 *      short-lived tokens is still respected.
 *
 * LRU-bounded so the cache can't grow unboundedly under bot traffic.
 */
const MAX_JWT_CACHE = 5_000;
const verifiedCache = new Map<string, AuthUser | null>();

function cacheGet(token: string): AuthUser | null | undefined {
  const entry = verifiedCache.get(token);
  if (entry === undefined) return undefined;
  // Touch for LRU
  verifiedCache.delete(token);
  verifiedCache.set(token, entry);
  return entry;
}

function cacheSet(token: string, user: AuthUser | null) {
  if (verifiedCache.size >= MAX_JWT_CACHE) {
    // Drop the oldest entry (Map preserves insertion order)
    const oldest = verifiedCache.keys().next().value;
    if (oldest !== undefined) verifiedCache.delete(oldest);
  }
  verifiedCache.set(token, user);
}

/**
 * Verify a Supabase JWT and return the user payload.
 * Called in the Apollo Server context function on every request.
 */
export async function verifySupabaseToken(token: string): Promise<AuthUser | null> {
  // 1. Fast path: cached verification (avoids the Supabase Auth round-trip)
  const cached = cacheGet(token);
  if (cached !== undefined) return cached;

  // 2. Cold path: hit Supabase Auth, then cache the result
  const { data, error } = await supabase.auth.getUser(token);
  const user = error || !data.user ? null : { id: data.user.id, email: data.user.email };
  cacheSet(token, user);
  return user;
}
