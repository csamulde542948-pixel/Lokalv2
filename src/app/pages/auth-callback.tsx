import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { recordLoginAttempt } from "../../lib/auth-security";

/**
 * Handles the OAuth / magic-link callback.
 *
 * Supabase redirects here after Google / GitHub OAuth with a `code` param
 * (PKCE flow) or a `#access_token` fragment (implicit flow).
 * We call `exchangeCodeForSession` to complete the PKCE exchange, then
 * redirect the user to the app.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      // Handle OAuth errors
      if (error) {
        console.error("[auth/callback] OAuth error:", error, errorDescription);

        // Handle account linking / deduplication errors
        if (errorDescription?.includes("already registered") || errorDescription?.includes("already linked")) {
          navigate(
            `/login?error=${encodeURIComponent(
              "An account with this email already exists. Please log in with the original method you used to sign up."
            )}`,
            { replace: true }
          );
          return;
        }

        navigate(`/login?error=${encodeURIComponent(errorDescription ?? error)}`, { replace: true });
        return;
      }

      // PKCE flow — exchange code for session
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError);
          navigate(`/login?error=${encodeURIComponent(exchangeError.message)}`, { replace: true });
          return;
        }

        // Record the successful OAuth login
        if (data.session?.user?.email) {
          const provider = data.session.user.app_metadata?.provider || "oauth";
          recordLoginAttempt(data.session.user.email, true, provider, data.session.access_token).catch(() => {});
        }

        // Session is now set — onAuthStateChange in AuthContext will pick it up
        const redirectTo = sessionStorage.getItem("lokal:auth_redirect") || "/";
        sessionStorage.removeItem("lokal:auth_redirect");
        navigate(redirectTo, { replace: true });
        return;
      }

      // Implicit flow — fragment-based (#access_token=...) handled automatically by supabase-js
      // onAuthStateChange will fire with the new session, just redirect
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Record the successful OAuth login
        if (session.user?.email) {
          const provider = session.user.app_metadata?.provider || "oauth";
          recordLoginAttempt(session.user.email, true, provider, session.access_token).catch(() => {});
        }
        const redirectTo = sessionStorage.getItem("lokal:auth_redirect") || "/";
        sessionStorage.removeItem("lokal:auth_redirect");
        navigate(redirectTo, { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
