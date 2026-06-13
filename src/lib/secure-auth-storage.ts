const AUTH_STORAGE_KEY = "lokal-supabase-auth";
const PKCE_VERIFIER_SUFFIX = "-code-verifier";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function clearLegacySupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;

  try {
    for (const storage of [window.localStorage, window.sessionStorage]) {
      const keysToRemove: string[] = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (
          key === AUTH_STORAGE_KEY ||
          (key?.startsWith("sb-") && key.includes("-auth-token"))
        ) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Browser privacy settings may disable storage.
  }
}

export function clearPkceVerifier(): void {
  try {
    getSessionStorage()?.removeItem(`${AUTH_STORAGE_KEY}${PKCE_VERIFIER_SUFFIX}`);
  } catch {
    // Browser privacy settings may disable storage.
  }
}

// Persist only the one-time PKCE verifier needed across an OAuth redirect.
// Supabase session objects are deliberately discarded.
export const pkceOnlyAuthStorage = {
  getItem(key: string): string | null {
    return key.endsWith(PKCE_VERIFIER_SUFFIX)
      ? getSessionStorage()?.getItem(key) ?? null
      : null;
  },
  setItem(key: string, value: string): void {
    if (key.endsWith(PKCE_VERIFIER_SUFFIX)) {
      getSessionStorage()?.setItem(key, value);
    } else {
      getSessionStorage()?.removeItem(key);
    }
  },
  removeItem(key: string): void {
    getSessionStorage()?.removeItem(key);
  },
};

export { AUTH_STORAGE_KEY };
