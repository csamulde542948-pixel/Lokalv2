import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Wraps routes that require authentication.
 * - While session is being loaded, shows a blank screen (avoids flash redirect).
 * - If there is no session, redirects to /login, preserving the intended URL.
 * - Otherwise renders the child route.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
