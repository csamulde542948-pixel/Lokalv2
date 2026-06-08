import { Navigate, Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

/**
 * Wraps routes that require authentication.
 * - While session is being loaded, shows a blank screen (avoids flash redirect).
 * - If there is no session, redirects to /login, preserving the intended URL.
 * - Otherwise renders the child route.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [storedSession, setStoredSession] = useState<Session | null>(null);
  const [checkingStoredSession, setCheckingStoredSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (session) {
      setStoredSession(session);
      setCheckingStoredSession(false);
      return;
    }

    if (loading) {
      return;
    }

    setCheckingStoredSession(true);
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStoredSession(data.session);
      setCheckingStoredSession(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loading, session]);

  if (loading || checkingStoredSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session && !storedSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
