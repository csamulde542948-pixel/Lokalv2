import type { Session, User } from "@supabase/supabase-js";
import { BACKEND_URL } from "./env";

const SESSION_SYNC_RETRY_COOLDOWN_MS = 30_000;
const CSRF_STORAGE_KEY = "lokal-csrf-token";

let lastSyncedFingerprint: string | null = null;
let lastAttemptFingerprint: string | null = null;
let lastAttemptAt = 0;
let inFlightFingerprint: string | null = null;
let inFlightPromise: Promise<void> | null = null;
let cachedCsrfToken: string | null = null;

function storeCsrfToken(token: unknown): void {
  if (typeof token !== "string" || !token) return;
  cachedCsrfToken = token;
  try {
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    // The in-memory copy still protects requests in this page.
  }
}

function clearCsrfToken(): void {
  cachedCsrfToken = null;
  try {
    window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // Browser privacy settings may disable storage.
  }
}

export function getSessionCsrfToken(): string | null {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    cachedCsrfToken = window.sessionStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    cachedCsrfToken = null;
  }
  return cachedCsrfToken;
}

function getSessionFingerprint(session: Session): string {
  return [
    session.user.id,
    session.access_token,
    session.refresh_token,
  ].join(":");
}

export async function syncSessionCookie(session: Session | null): Promise<void> {
  if (!session?.access_token || !session.refresh_token) return;

  const fingerprint = getSessionFingerprint(session);
  const now = Date.now();

  if (lastSyncedFingerprint === fingerprint) {
    return;
  }

  if (inFlightPromise && inFlightFingerprint === fingerprint) {
    return inFlightPromise;
  }

  if (
    lastAttemptFingerprint === fingerprint &&
    now - lastAttemptAt < SESSION_SYNC_RETRY_COOLDOWN_MS
  ) {
    return;
  }

  lastAttemptFingerprint = fingerprint;
  lastAttemptAt = now;
  inFlightFingerprint = fingerprint;

  inFlightPromise = (async () => {
    const response = await fetch(`${BACKEND_URL}/auth/session-cookie`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error(`Session cookie sync failed with status ${response.status}`);
    }

    const payload = await response.json().catch(() => null);
    storeCsrfToken(payload?.csrfToken);
    lastSyncedFingerprint = fingerprint;
  })().finally(() => {
    if (inFlightFingerprint === fingerprint) {
      inFlightFingerprint = null;
      inFlightPromise = null;
    }
  });

  return inFlightPromise;
}

export async function getSessionCookieUser(): Promise<User | null> {
  const response = await fetch(`${BACKEND_URL}/auth/session-cookie`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  storeCsrfToken(payload?.csrfToken);
  return payload?.authenticated && payload.user ? payload.user as User : null;
}

export async function clearSessionCookie(): Promise<void> {
  lastSyncedFingerprint = null;
  lastAttemptFingerprint = null;
  lastAttemptAt = 0;
  inFlightFingerprint = null;
  inFlightPromise = null;
  clearCsrfToken();

  await fetch(`${BACKEND_URL}/auth/session-cookie`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}
