import type { Session } from "@supabase/supabase-js";
import { BACKEND_URL } from "./env";

const SESSION_SYNC_RETRY_COOLDOWN_MS = 30_000;

let lastSyncedFingerprint: string | null = null;
let lastAttemptFingerprint: string | null = null;
let lastAttemptAt = 0;
let inFlightFingerprint: string | null = null;
let inFlightPromise: Promise<void> | null = null;

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

    lastSyncedFingerprint = fingerprint;
  })().finally(() => {
    if (inFlightFingerprint === fingerprint) {
      inFlightFingerprint = null;
      inFlightPromise = null;
    }
  });

  return inFlightPromise;
}

export async function clearSessionCookie(): Promise<void> {
  lastSyncedFingerprint = null;
  lastAttemptFingerprint = null;
  lastAttemptAt = 0;
  inFlightFingerprint = null;
  inFlightPromise = null;

  await fetch(`${BACKEND_URL}/auth/session-cookie`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}
