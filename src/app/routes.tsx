import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";
import { Layout } from "./components/layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// ── S3 #6: Route-level code splitting via React.lazy ──
// Only Layout + ProtectedRoute are eagerly loaded; all pages are lazy-loaded on navigation.
const Feed          = lazy(() => import("./pages/feed").then(m => ({ default: m.Feed })));
const Leaderboard   = lazy(() => import("./pages/leaderboard").then(m => ({ default: m.Leaderboard })));
const Launchpad       = lazy(() => import("./pages/launchpad").then(m => ({ default: m.Launchpad })));
const LaunchpadManage = lazy(() => import("./pages/launchpad-manage").then(m => ({ default: m.LaunchpadManage })));
const Roast         = lazy(() => import("./pages/roast").then(m => ({ default: m.Roast })));
const RoastResult   = lazy(() => import("./pages/roast-result").then(m => ({ default: m.RoastResult })));
const Profile       = lazy(() => import("./pages/profile").then(m => ({ default: m.Profile })));
const Friends       = lazy(() => import("./pages/friends").then(m => ({ default: m.Friends })));
const Followers     = lazy(() => import("./pages/followers").then(m => ({ default: m.Followers })));
const Projects      = lazy(() => import("./pages/projects").then(m => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import("./pages/project-detail").then(m => ({ default: m.ProjectDetail })));
const Analytics     = lazy(() => import("./pages/analytics").then(m => ({ default: m.Analytics })));
const Settings      = lazy(() => import("./pages/settings").then(m => ({ default: m.Settings })));
const Login         = lazy(() => import("./pages/login").then(m => ({ default: m.Login })));
const Signup        = lazy(() => import("./pages/signup").then(m => ({ default: m.Signup })));
const Messages      = lazy(() => import("./pages/messages").then(m => ({ default: m.Messages })));
const RankRole      = lazy(() => import("./pages/rank-role").then(m => ({ default: m.RankRole })));
const Jobs          = lazy(() => import("./pages/jobs").then(m => ({ default: m.Jobs })));
const JobDetail     = lazy(() => import("./pages/job-detail").then(m => ({ default: m.JobDetail })));
const Events        = lazy(() => import("./pages/events").then(m => ({ default: m.Events })));
const EventDetail   = lazy(() => import("./pages/event-detail").then(m => ({ default: m.EventDetail })));
const Terms         = lazy(() => import("./pages/terms").then(m => ({ default: m.Terms })));
const Privacy       = lazy(() => import("./pages/privacy").then(m => ({ default: m.Privacy })));
const CookiePolicy  = lazy(() => import("./pages/cookie-policy").then(m => ({ default: m.CookiePolicy })));
const AcceptableUse = lazy(() => import("./pages/acceptable-use").then(m => ({ default: m.AcceptableUse })));
const Pricing       = lazy(() => import("./pages/pricing").then(m => ({ default: m.Pricing })));
const RefundPolicy  = lazy(() => import("./pages/refund-policy").then(m => ({ default: m.RefundPolicy })));
const AuthCallback  = lazy(() => import("./pages/auth-callback").then(m => ({ default: m.AuthCallback })));
const NotFound      = lazy(() => import("./pages/not-found").then(m => ({ default: m.NotFound })));
const Landing       = lazy(() => import("./pages/landing").then(m => ({ default: m.Landing })));

// Page-level loading skeleton shown while chunks download
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">Loading…</p>
      </div>
    </div>
  );
}

// Wrap lazy component with Suspense
function withSuspense(Component: React.LazyExoticComponent<React.ComponentType<any>>) {
  return function LazyPage() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    );
  };
}

export const router = createBrowserRouter([
  // Public landing page (no auth, no app layout)
  {
    path: "/landing",
    Component: withSuspense(Landing),
  },
  {
    path: "/login",
    Component: withSuspense(Login),
  },
  {
    path: "/signup",
    Component: withSuspense(Signup),
  },
  // OAuth / magic-link callback (must be public, no auth required)
  {
    path: "/auth/callback",
    Component: withSuspense(AuthCallback),
  },
  // Public informational pages (no auth required)
  {
    path: "/terms",
    Component: withSuspense(Terms),
  },
  {
    path: "/privacy",
    Component: withSuspense(Privacy),
  },
  {
    path: "/cookie-policy",
    Component: withSuspense(CookiePolicy),
  },
  {
    path: "/acceptable-use",
    Component: withSuspense(AcceptableUse),
  },
  {
    path: "/pricing",
    Component: withSuspense(Pricing),
  },
  {
    path: "/refund-policy",
    Component: withSuspense(RefundPolicy),
  },
  // Public app routes (app shell / layout, no auth required)
  {
    path: "/",
    Component: Layout,
    children: [
      { path: "roast", Component: withSuspense(Roast) },
    ],
  },
  // Roast result — fully standalone, no navbar/sidebar
  {
    path: "/roast/result",
    Component: withSuspense(RoastResult),
  },
  // All app routes require authentication
  {
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, Component: withSuspense(Feed) },
          { path: "leaderboard", Component: withSuspense(Leaderboard) },
          { path: "launchpad", Component: withSuspense(Launchpad) },
          { path: "launchpad/:id/manage", Component: withSuspense(LaunchpadManage) },
          { path: "profile", Component: withSuspense(Profile) },
          { path: "profile/:username", Component: withSuspense(Profile) },
          { path: "friends", Component: withSuspense(Followers) },
          { path: "followers", Component: withSuspense(Followers) },
          { path: "projects", Component: withSuspense(Projects) },
          { path: "project/:id", Component: withSuspense(ProjectDetail) },
          { path: "analytics", Component: withSuspense(Analytics) },
          { path: "settings", Component: withSuspense(Settings) },
          { path: "messages", Component: withSuspense(Messages) },
          { path: "rank-role", Component: withSuspense(RankRole) },
          { path: "jobs", Component: withSuspense(Jobs) },
          { path: "jobs/:id", Component: withSuspense(JobDetail) },
          { path: "events", Component: withSuspense(Events) },
          { path: "events/:id", Component: withSuspense(EventDetail) },
          { path: "*", Component: withSuspense(NotFound) },
        ],
      },
    ],
  },
]);
