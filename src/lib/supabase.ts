import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cookie-only storage adapter for Supabase auth.
 *
 * Why ALL keys go to cookies (including PKCE code_verifier):
 * - The OAuth flow does: your site → Google (cross-origin) → your callback
 * - Safari and some browsers clear sessionStorage on cross-origin top-level
 *   navigations, causing AuthPKCECodeVerifierMissingError on the callback
 * - Cookies with SameSite=Lax survive cross-origin top-level redirects ✅
 *
 * Why chunked:
 * - Session JSON (JWT + metadata) can exceed the 4096-byte cookie limit
 * - Values > 3600 bytes are split into key.0, key.1, ... and reassembled
 * - Code verifier is short (~86 chars) → stored as a single cookie
 *
 * Security: SameSite=Lax blocks CSRF. Secure enforces HTTPS.
 * Not httpOnly (JS SPA limitation) — XSS protection via no user innerHTML.
 */

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const CHUNK_SIZE = 3600;
const MAX_CHUNKS = 10;

function cookieOptions(): string {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  return `; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function getRawCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const key = encodeURIComponent(name) + "=";
  const row = document.cookie.split("; ").find((c) => c.startsWith(key));
  return row ? decodeURIComponent(row.slice(key.length)) : null;
}

function setRawCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${cookieOptions()}`;
}

function deleteRawCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

// PKCE code verifier keys go to sessionStorage � survives OAuth redirects
// Everything goes to cookies — PKCE code_verifier must survive the
// cross-origin redirect (your site → Google → your site callback).
// sessionStorage is cleared by Safari on cross-origin top-level navigations.
// Code verifier is short (~86 chars) → single cookie.
// Session JWT is large → chunked cookies.
const cookieStorage = {
  getItem(key: string): string | null {
    // Try chunked read first (session token)
    let result = "";
    let found = false;
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const chunk = getRawCookie(`${key}.${i}`);
      if (chunk === null) break;
      result += chunk;
      found = true;
    }
    if (found) return result;
    // Single cookie fallback (code verifier + small values)
    return getRawCookie(key);
  },

  setItem(key: string, value: string): void {
    deleteRawCookie(key);
    for (let i = 0; i < MAX_CHUNKS; i++) deleteRawCookie(`${key}.${i}`);

    if (value.length <= CHUNK_SIZE) {
      setRawCookie(key, value);
    } else {
      let offset = 0;
      let chunk = 0;
      while (offset < value.length) {
        setRawCookie(`${key}.${chunk}`, value.slice(offset, offset + CHUNK_SIZE));
        offset += CHUNK_SIZE;
        chunk++;
      }
    }
  },

  removeItem(key: string): void {
    deleteRawCookie(key);
    for (let i = 0; i < MAX_CHUNKS; i++) deleteRawCookie(`${key}.${i}`);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: cookieStorage,
  },
});
