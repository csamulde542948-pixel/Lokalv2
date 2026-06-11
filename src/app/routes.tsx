import { createBrowserRouter, useRouteError } from "react-router";
import { lazy, Suspense } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import { Layout } from "./components/layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

function isChunkLoadError(error: unknown) {
  const message = String((error as Error)?.message ?? error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(message);
}

function lazyRoute<T extends ComponentType<any>>(importer: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (isChunkLoadError(error) && typeof window !== "undefined") {
        const retryKey = `lokalhost:chunk-retry:${window.location.pathname}`;
        if (!window.sessionStorage.getItem(retryKey)) {
          window.sessionStorage.setItem(retryKey, "1");
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

// ── S3 #6: Route-level code splitting via React.lazy ──
// Only Layout + ProtectedRoute are eagerly loaded; all pages are lazy-loaded on navigation.
const Feed          = lazyRoute(() => import("./pages/feed").then(m => ({ default: m.Feed })));
const PostPage      = lazyRoute(() => import("./pages/post").then(m => ({ default: m.PostPage })));
const CommentPage   = lazyRoute(() => import("./pages/comment").then(m => ({ default: m.CommentPage })));
const Leaderboard   = lazyRoute(() => import("./pages/leaderboard").then(m => ({ default: m.Leaderboard })));
const Launchpad       = lazyRoute(() => import("./pages/launchpad").then(m => ({ default: m.Launchpad })));
const LaunchpadEvent  = lazyRoute(() => import("./pages/launchpad-event").then(m => ({ default: m.LaunchpadEvent })));
const LaunchpadManage = lazyRoute(() => import("./pages/launchpad-manage").then(m => ({ default: m.LaunchpadManage })));
const LaunchpadChat   = lazyRoute(() => import("./pages/launchpad-chat").then(m => ({ default: m.LaunchpadChat })));
const Roast         = lazyRoute(() => import("./pages/roast").then(m => ({ default: m.Roast })));
const RoastResult   = lazyRoute(() => import("./pages/roast-result").then(m => ({ default: m.RoastResult })));
const Profile       = lazyRoute(() => import("./pages/profile").then(m => ({ default: m.Profile })));
const Friends       = lazyRoute(() => import("./pages/friends").then(m => ({ default: m.Friends })));
const Followers     = lazyRoute(() => import("./pages/followers").then(m => ({ default: m.Followers })));
const Projects      = lazyRoute(() => import("./pages/projects").then(m => ({ default: m.Projects })));
const ProjectDetail = lazyRoute(() => import("./pages/project-detail").then(m => ({ default: m.ProjectDetail })));
const Analytics     = lazyRoute(() => import("./pages/analytics").then(m => ({ default: m.Analytics })));
const Settings      = lazyRoute(() => import("./pages/settings").then(m => ({ default: m.Settings })));
const Login         = lazyRoute(() => import("./pages/login").then(m => ({ default: m.Login })));
const Signup        = lazyRoute(() => import("./pages/signup").then(m => ({ default: m.Signup })));
const Messages      = lazyRoute(() => import("./pages/messages").then(m => ({ default: m.Messages })));
const RankRole      = lazyRoute(() => import("./pages/rank-role").then(m => ({ default: m.RankRole })));
const Jobs          = lazyRoute(() => import("./pages/jobs").then(m => ({ default: m.Jobs })));
const JobDetail     = lazyRoute(() => import("./pages/job-detail").then(m => ({ default: m.JobDetail })));
const Events        = lazyRoute(() => import("./pages/events").then(m => ({ default: m.Events })));
const EventDetail   = lazyRoute(() => import("./pages/event-detail").then(m => ({ default: m.EventDetail })));
const Terms         = lazyRoute(() => import("./pages/terms").then(m => ({ default: m.Terms })));
const Privacy       = lazyRoute(() => import("./pages/privacy").then(m => ({ default: m.Privacy })));
const CookiePolicy  = lazyRoute(() => import("./pages/cookie-policy").then(m => ({ default: m.CookiePolicy })));
const AcceptableUse = lazyRoute(() => import("./pages/acceptable-use").then(m => ({ default: m.AcceptableUse })));
const Pricing       = lazyRoute(() => import("./pages/pricing").then(m => ({ default: m.Pricing })));
const RefundPolicy  = lazyRoute(() => import("./pages/refund-policy").then(m => ({ default: m.RefundPolicy })));
const AuthCallback  = lazyRoute(() => import("./pages/auth-callback").then(m => ({ default: m.AuthCallback })));
const NotFound      = lazyRoute(() => import("./pages/not-found").then(m => ({ default: m.NotFound })));
const Landing       = lazyRoute(() => import("./pages/landing").then(m => ({ default: m.Landing })));

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

function RouteErrorFallback() {
  const error = useRouteError();
  const staleBuild = isChunkLoadError(error);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-border bg-card p-6 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Lokalhost
          </p>
          <h1 className="text-2xl font-semibold">
            {staleBuild ? "Update needed" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted-foreground leading-6">
            {staleBuild
              ? "A new version of Lokalhost is available. Refresh to load the latest files."
              : "The page could not load properly. Refreshing usually fixes this."}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="flex-1 border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrap lazy component with Suspense
function withSuspense(Component: LazyExoticComponent<ComponentType<any>>) {
  return function LazyPage() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    );
  };
}

const routes = [
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
  {
    path: "/roast/result/:generationId",
    Component: withSuspense(RoastResult),
  },
  {
    path: "/roast/brand/:analysisId",
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
          { path: "post/:id", Component: withSuspense(PostPage) },
          { path: "comment/:id", Component: withSuspense(CommentPage) },
          { path: "leaderboard", Component: withSuspense(Leaderboard) },
          { path: "launchpad", Component: withSuspense(Launchpad) },
          { path: "launchpad/:id", Component: withSuspense(LaunchpadEvent) },
          { path: "launchpad/:id/manage", Component: withSuspense(LaunchpadManage) },
          { path: "launchpad/:id/chat", Component: withSuspense(LaunchpadChat) },
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
];

export const router = createBrowserRouter(
  routes.map((route) => ({
    errorElement: <RouteErrorFallback />,
    ...route,
  }))
);
