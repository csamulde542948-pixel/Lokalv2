import type { Session } from "@supabase/supabase-js";
import { BACKEND_URL } from "./env";

export async function syncSessionCookie(session: Session | null): Promise<void> {
  if (!session?.access_token || !session.refresh_token) return;

  await fetch(`${BACKEND_URL}/auth/session-cookie`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    }),
  });
}

export async function clearSessionCookie(): Promise<void> {
  await fetch(`${BACKEND_URL}/auth/session-cookie`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}
