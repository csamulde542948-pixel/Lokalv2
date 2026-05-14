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

      console.log('[AUTH CALLBACK] URL:', window.location.href);
      console.log('[AUTH CALLBACK] Code:', code);
      console.log('[AUTH CALLBACK] Error:', error, errorDescription);

      // Check if we have tokens in the URL hash (implicit flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      console.log('[AUTH CALLBACK] Hash tokens:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken 
      });

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
        console.log('[AUTH CALLBACK] Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[AUTH CALLBACK] Exchange result:', { data: !!data?.session, error: exchangeError });
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
      console.log('[AUTH CALLBACK] Checking session after implicit flow...');
      
      // Try to manually set session from hash params if needed
      if (accessToken && refreshToken) {
        console.log('[AUTH CALLBACK] Manually setting session from hash params...');
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        console.log('[AUTH CALLBACK] Manual session set result:', {
          hasSession: !!sessionData.session,
          user: sessionData.session?.user?.email,
          error: setSessionError,
        });
        
        if (setSessionError) {
          console.error('[AUTH CALLBACK] Failed to set session:', setSessionError);
          navigate(`/login?error=${encodeURIComponent(setSessionError.message)}`, { replace: true });
          return;
        }
        
        if (sessionData.session) {
          // Record the successful OAuth login
          if (sessionData.session.user?.email) {
            const provider = sessionData.session.user.app_metadata?.provider || "oauth";
            recordLoginAttempt(sessionData.session.user.email, true, provider, sessionData.session.access_token).catch(() => {});
          }
          const redirectTo = sessionStorage.getItem("lokal:auth_redirect") || "/";
          sessionStorage.removeItem("lokal:auth_redirect");
          console.log('[AUTH CALLBACK] Redirecting to:', redirectTo);
          navigate(redirectTo, { replace: true });
          return;
        }
      }
      
      // Fallback: wait for Supabase to parse URL automatically
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[AUTH CALLBACK] Session result:', { 
        hasSession: !!session, 
        user: session?.user?.email,
        error: sessionError 
      });
      
      if (sessionError) {
        console.error('[AUTH CALLBACK] Session error:', sessionError);
        navigate(`/login?error=${encodeURIComponent(sessionError.message)}`, { replace: true });
        return;
      }
      
      if (session) {
        // Record the successful OAuth login
        if (session.user?.email) {
          const provider = session.user.app_metadata?.provider || "oauth";
          recordLoginAttempt(session.user.email, true, provider, session.access_token).catch(() => {});
        }
        const redirectTo = sessionStorage.getItem("lokal:auth_redirect") || "/";
        sessionStorage.removeItem("lokal:auth_redirect");
        console.log('[AUTH CALLBACK] Redirecting to:', redirectTo);
        navigate(redirectTo, { replace: true });
      } else {
        console.log('[AUTH CALLBACK] No session found, redirecting to login');
        navigate("/login?error=Session could not be established. Please try again.", { replace: true });
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
