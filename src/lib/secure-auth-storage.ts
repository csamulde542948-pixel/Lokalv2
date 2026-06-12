const AUTH_STORAGE_KEY = "lokal-supabase-auth";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function removeProviderTokens(value: string): string {
  try {
    const storedSession = JSON.parse(value);
    if (!storedSession || typeof storedSession !== "object") return value;

    delete storedSession.provider_token;
    delete storedSession.provider_refresh_token;

    if (storedSession.currentSession && typeof storedSession.currentSession === "object") {
      delete storedSession.currentSession.provider_token;
      delete storedSession.currentSession.provider_refresh_token;
    }

    return JSON.stringify(storedSession);
  } catch {
    return value;
  }
}

export function clearLegacySupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("sb-") && key.includes("-auth-token")) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Privacy settings can disable browser storage. The auth client can still
    // maintain its in-memory state for the current page.
  }
}

export const secureAuthStorage = {
  getItem(key: string): string | null {
    return getSessionStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    getSessionStorage()?.setItem(key, removeProviderTokens(value));
  },
  removeItem(key: string): void {
    getSessionStorage()?.removeItem(key);
  },
};

export { AUTH_STORAGE_KEY };
