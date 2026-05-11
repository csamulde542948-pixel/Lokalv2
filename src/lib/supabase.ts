import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Hybrid storage adapter: sessionStorage for PKCE code verifier,
 * chunked cookies for the session token.
 *
 * Why split:
 * - PKCE code_verifier is written before OAuth redirect and read on callback.
 *   sessionStorage survives same-origin top-level redirects reliably.
 * - Session token uses chunked cookies (SameSite=Lax, Secure) so it's not
 *   exposed to browser extension localStorage APIs and is CSRF-safe.
 *
 * Note: cookies are NOT httpOnly (JS SPA limitation).
 * XSS protection: no user-controlled innerHTML + CSP headers.
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
// Session/token keys go to chunked cookies
function isSessionStorageKey(key: string): boolean {
  return key.includes("-code-verifier") || key.includes("pkce");
}

const hybridStorage = {
  getItem(key: string): string | null {
    if (isSessionStorageKey(key)) {
      return typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(key)
        : null;
    }
    // Chunked cookie read
    let result = "";
    let found = false;
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const chunk = getRawCookie(`${key}.${i}`);
      if (chunk === null) break;
      result += chunk;
      found = true;
    }
    if (found) return result;
    // Fallback: unchunked cookie (small values)
    return getRawCookie(key);
  },

  setItem(key: string, value: string): void {
    if (isSessionStorageKey(key)) {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(key, value);
      }
      return;
    }
    // Clear old cookies then write chunks
    deleteRawCookie(key);
    for (let i = 0; i < MAX_CHUNKS; i++) deleteRawCookie(`${key}.${i}`);
    let offset = 0;
    let chunk = 0;
    while (offset < value.length) {
      setRawCookie(`${key}.${chunk}`, value.slice(offset, offset + CHUNK_SIZE));
      offset += CHUNK_SIZE;
      chunk++;
    }
  },

  removeItem(key: string): void {
    if (isSessionStorageKey(key)) {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(key);
      }
      return;
    }
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
    storage: hybridStorage,
  },
});
