import { merge } from "lodash";
import { profileResolvers } from "./profile.resolvers";
import { feedResolvers } from "./feed.resolvers";
import { projectResolvers } from "./project.resolvers";
import { jobResolvers } from "./job.resolvers";
import { eventResolvers } from "./event.resolvers";
import { roastResolvers } from "./roast.resolvers";
import { launchpadResolvers } from "./launchpad.resolvers";
import { leaderboardResolvers } from "./leaderboard.resolvers";
import { notificationResolvers } from "./notification.resolvers";
import { searchResolvers } from "./search.resolvers";

export const resolvers = merge(
  profileResolvers,
  feedResolvers,
  projectResolvers,
  jobResolvers,
  eventResolvers,
  roastResolvers,
  launchpadResolvers,
  leaderboardResolvers,
  notificationResolvers,
  searchResolvers
);
