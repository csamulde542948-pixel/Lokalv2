import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Cookie-based session storage adapter.
 *
 * Why cookies over localStorage:
 * - SameSite=Strict blocks CSRF attacks
 * - Secure flag enforces HTTPS-only transmission
 * - Not accessible via browser extension localStorage APIs
 *
 * Note: These are NOT httpOnly cookies (JS SPA cannot set those —
 * only a server can). True httpOnly would require SSR (e.g. Next.js).
 * XSS protection comes from our CSP headers + no user-controlled innerHTML.
 */
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year (Supabase manages expiry internally)

const cookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${encodeURIComponent(key)}=`));
    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
  },

  setItem(key: string, value: string): void {
    if (typeof document === "undefined") return;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = [
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      `path=/`,
      `max-age=${SESSION_COOKIE_MAX_AGE}`,
      `SameSite=Strict`,
      secure,
    ].join("; ");
  },

  removeItem(key: string): void {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0; SameSite=Strict`;
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
