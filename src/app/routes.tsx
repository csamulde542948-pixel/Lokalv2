import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { Feed } from "./pages/feed";
import { Leaderboard } from "./pages/leaderboard";
import { Launchpad } from "./pages/launchpad";
import { Roast } from "./pages/roast";
import { Profile } from "./pages/profile";
import { Friends } from "./pages/friends";
import { Projects } from "./pages/projects";
import { Analytics } from "./pages/analytics";
import { Settings } from "./pages/settings";
import { Login } from "./pages/login";
import { Signup } from "./pages/signup";
import { Messages } from "./pages/messages";
import { RankRole } from "./pages/rank-role";
import { ProjectDetail } from "./pages/project-detail";
import { Jobs } from "./pages/jobs";
import { JobDetail } from "./pages/job-detail";
import { Events } from "./pages/events";
import { EventDetail } from "./pages/event-detail";
import { Terms } from "./pages/terms";
import { Privacy } from "./pages/privacy";
import { NotFound } from "./pages/not-found";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Feed },
      { path: "leaderboard", Component: Leaderboard },
      { path: "launchpad", Component: Launchpad },
      { path: "roast", Component: Roast },
      { path: "profile", Component: Profile },
      { path: "friends", Component: Friends },
      { path: "projects", Component: Projects },
      { path: "project/:id", Component: ProjectDetail },
      { path: "analytics", Component: Analytics },
      { path: "settings", Component: Settings },
      { path: "messages", Component: Messages },
      { path: "rank-role", Component: RankRole },
      { path: "jobs", Component: Jobs },
      { path: "jobs/:id", Component: JobDetail },
      { path: "events", Component: Events },
      { path: "events/:id", Component: EventDetail },
      { path: "terms", Component: Terms },
      { path: "privacy", Component: Privacy },
      { path: "*", Component: NotFound },
    ],
  },
]);