import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: { full_name?: string; username?: string }
  ) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithGithub: () => Promise<{ error: AuthError | null }>;
  signInWithWeb3: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth state changes (login, logout, token refresh, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      // Security: Auto-sign out if token was revoked
      if (event === "TOKEN_REFRESHED" && !newSession) {
        supabase.auth.signOut();
      }

      // Security: Clear state on sign-out
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { full_name?: string; username?: string }
    ) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signInWithGithub = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Request GitHub username + primary email so we can auto-fill profile
        scopes: "read:user user:email",
      },
    });
    return { error };
  }, []);

  const signInWithWeb3 = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      // Check for window.ethereum (MetaMask or any EIP-1193 wallet)
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        return { error: new Error("No Web3 wallet detected. Please install MetaMask.") };
      }

      // Request account access
      const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (!address) {
        return { error: new Error("No wallet account selected.") };
      }

      // Create a sign message for SIWE-style auth
      const message = `Sign in to lokalhost.club\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signature: string = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Use Supabase's signInWithIdToken for Web3 wallets (via the crypto provider)
      // Supabase Web3 uses the wallet address as the identifier
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "ethereum" as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) return { error };

      return { error: null };
    } catch (err: any) {
      // User rejected the request
      if (err.code === 4001) {
        return { error: new Error("Wallet connection rejected.") };
      }
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithGithub,
        signInWithWeb3,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
