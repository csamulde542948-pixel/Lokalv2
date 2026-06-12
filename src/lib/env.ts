/**
 * env.ts — centralised runtime environment configuration for the frontend.
 *
 * All VITE_* variables are validated here at module load time so the app
 * fails loudly with a clear message instead of silently using undefined values.
 *
 * Import from this file instead of using import.meta.env directly.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const env = (import.meta as any).env as Record<string, string | undefined>;

function requireEnv(key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
      `Make sure it is set in .env.local (local), .env.staging (staging), or .env.production (prod).`
    );
  }
  return value.trim();
}

function requireEnvPrefix(key: string, prefix: string): string {
  const value = requireEnv(key);
  if (!value.startsWith(prefix)) {
    throw new Error(
      `[env] ${key} must use the modern Supabase ${prefix}... key format. ` +
      "Legacy JWT API keys are not supported."
    );
  }
  return value;
}

// ─── App Environment ──────────────────────────────────────────────────────────
export const APP_ENV = env["VITE_APP_ENV"] ?? "development";

export const IS_PRODUCTION = APP_ENV === "production";
export const IS_STAGING    = APP_ENV === "staging";
export const IS_DEV        = APP_ENV === "development";

// ─── Validated Variables ──────────────────────────────────────────────────────
export const SUPABASE_URL = requireEnv("VITE_SUPABASE_URL");
export const SUPABASE_PUBLISHABLE_KEY =
  requireEnvPrefix("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_");
export const GRAPHQL_URL          = requireEnv("VITE_GRAPHQL_URL");
export const BACKEND_URL          = requireEnv("VITE_BACKEND_URL");
export const GETSTREAM_API_KEY    = requireEnv("VITE_GETSTREAM_API_KEY");
export const TURNSTILE_SITE_KEY   =
  env["VITE_TURNSTILE_SITE_KEY"]?.trim() || "0x4AAAAAADjZ4hySnmu1zEUk";
