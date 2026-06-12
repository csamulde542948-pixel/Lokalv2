import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { BrandLoading } from "./brand-loading";

/**
 * Wraps routes that require authentication.
 * - While session is being loaded, shows a blank screen (avoids flash redirect).
 * - If there is no session, redirects to /login, preserving the intended URL.
 * - Otherwise renders the child route.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <BrandLoading label="Checking your session" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
