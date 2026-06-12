import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { recordLoginAttempt } from "../../lib/auth-security";

/**
 * Handles Supabase Auth redirects using PKCE only.
 *
 * Supabase should redirect here with `?code=...`; URL fragments containing
 * access or refresh tokens are intentionally rejected so tokens are never
 * accepted from the browser URL.
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

      if (error) {
        console.error("[auth/callback] OAuth error:", error, errorDescription);

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

      if (window.location.hash.includes("access_token") || window.location.hash.includes("refresh_token")) {
        await supabase.auth.signOut();
        navigate(
          `/login?error=${encodeURIComponent("Insecure auth callback rejected. Please sign in again.")}`,
          { replace: true }
        );
        return;
      }

      if (!code) {
        navigate(
          `/login?error=${encodeURIComponent("Missing auth code. Please sign in again.")}`,
          { replace: true }
        );
        return;
      }

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError || !data.session) {
        console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError);
        navigate(
          `/login?error=${encodeURIComponent(exchangeError?.message ?? "Session could not be established. Please try again.")}`,
          { replace: true }
        );
        return;
      }

      if (data.session.user?.email) {
        const provider = data.session.user.app_metadata?.provider || "oauth";
        recordLoginAttempt(data.session.user.email, true, provider, data.session.access_token).catch(() => {});
      }

      const redirectTo = sessionStorage.getItem("lokal:auth_redirect") || "/";
      sessionStorage.removeItem("lokal:auth_redirect");
      navigate(redirectTo, { replace: true });
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
