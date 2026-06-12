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
import { clearSessionCookie, syncSessionCookie } from "../lib/auth-session-cookie";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null; session: Session | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata?: { full_name?: string; username?: string },
    captchaToken?: string
  ) => Promise<{ error: AuthError | null; session: Session | null }>;
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
    supabase.auth.getSession().then(({ data, error }) => {
      console.log('[AUTH CONTEXT] Initial session loaded:', { 
        hasSession: !!data.session, 
        user: data.session?.user?.email,
        error 
      });
      syncSessionCookie(data.session).catch(() => {});
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth state changes (login, logout, token refresh, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[AUTH CONTEXT] Auth state changed:', { 
        event, 
        hasSession: !!newSession, 
        user: newSession?.user?.email 
      });
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      const shouldSyncSession =
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED";

      if (newSession && shouldSyncSession) {
        syncSessionCookie(newSession).catch(() => {});
      }

      // Security: Auto-sign out if token was revoked
      if (event === "TOKEN_REFRESHED" && !newSession) {
        console.log('[AUTH CONTEXT] Token refresh failed, signing out');
        supabase.auth.signOut();
      }

      // Security: Clear state on sign-out
      if (event === "SIGNED_OUT") {
        console.log('[AUTH CONTEXT] User signed out');
        clearSessionCookie().catch(() => {});
        setSession(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(
    async (email: string, password: string, captchaToken?: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      return { error, session: data.session ?? null };
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { full_name?: string; username?: string },
      captchaToken?: string
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          ...(captchaToken ? { captchaToken } : {}),
        },
      });
      return { error, session: data.session ?? null };
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    console.log('[AUTH] Attempting Google sign-in, redirect URL:', `${window.location.origin}/auth/callback`);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    console.log('[AUTH] Google sign-in result:', { data, error });
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
    await clearSessionCookie().catch(() => {});
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
