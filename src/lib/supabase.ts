import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cookie-based session storage for Supabase.
 *
 * Why cookies over localStorage:
 * - SameSite=Lax blocks CSRF attacks (Strict would break OAuth redirects)
 * - Secure flag enforces HTTPS-only transmission
 * - Not accessible via browser extension localStorage APIs
 *
 * Why chunked:
 * - Supabase session JSON (JWT + user metadata + Google profile) can exceed
 *   the 4096-byte cookie limit. We split into 3600-byte chunks so nothing
 *   gets silently truncated and sessions survive page reloads.
 *
 * Note: These are NOT httpOnly (JS SPA cannot set those — only a server can).
 * XSS protection comes from no user-controlled innerHTML and strict CSP.
 */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const CHUNK_SIZE = 3600;  // bytes per chunk (conservative, leaves room for cookie overhead)
const MAX_CHUNKS = 10;

function cookieOptions() {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
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

const cookieStorage = {
  getItem(key: string): string | null {
    // Try reading as chunks first
    let result = "";
    let found = false;
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const chunk = getRawCookie(`${key}.${i}`);
      if (chunk === null) break;
      result += chunk;
      found = true;
    }
    if (found) return result;

    // Fallback: single cookie (pre-chunking sessions or small values)
    return getRawCookie(key);
  },

  setItem(key: string, value: string): void {
    // Clear old single cookie + old chunks
    deleteRawCookie(key);
    for (let i = 0; i < MAX_CHUNKS; i++) deleteRawCookie(`${key}.${i}`);

    // Split value into chunks and store each
    let offset = 0;
    let chunk = 0;
    while (offset < value.length) {
      setRawCookie(`${key}.${chunk}`, value.slice(offset, offset + CHUNK_SIZE));
      offset += CHUNK_SIZE;
      chunk++;
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
    storage: cookieStorage,
  },
});
