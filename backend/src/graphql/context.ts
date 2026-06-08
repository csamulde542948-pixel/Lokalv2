import { PrismaClient } from "@prisma/client";
import DataLoader from "dataloader";

export interface AuthUser {
  id: string;
  email?: string;
}

export interface GraphQLContext {
  /** Authenticated user (null if not logged in) */
  user: AuthUser | null;
  /** Prisma client */
  prisma: PrismaClient;
  /** Client IP address (for anonymous rate limiting) */
  clientIp: string;
  /**
   * ISO 3166-1 alpha-2 country code for the request, derived from
   * `cf-ipcountry` (Cloudflare) or `x-vercel-ip-country` (Vercel). Defaults
   * to "PH" when no header is present (safe default = keep the existing
   * Taglish roast engine behaviour for unidentified users).
   */
  userCountry: string;
  /** DataLoaders for batching DB queries (prevents N+1) */
  loaders: {
    profileLoader: DataLoader<string, any>;
    postLoader: DataLoader<string, any>;
    projectLoader: DataLoader<string, any>;
    // Batch count loaders — prevent N+1 on Profile field resolvers
    followersCountLoader: DataLoader<string, number>;
    followingCountLoader: DataLoader<string, number>;
    isFollowedByMeLoader: DataLoader<string, boolean>;
    postsCountLoader: DataLoader<string, number>;
    projectsCountLoader: DataLoader<string, number>;
    // Batch loaders for Post field resolvers
    postTagsLoader: DataLoader<string, any[]>;
    postLikedByMeLoader: DataLoader<string, boolean>;
    postMyReactionLoader: DataLoader<string, string | null>;
    originalPostLoader: DataLoader<string, any | null>;
    commentsPreviewLoader: DataLoader<string, any[]>;
    // Batch loaders for PostComment field resolvers
    commentLikedByMeLoader: DataLoader<string, boolean>;
    commentMyReactionLoader: DataLoader<string, string | null>;
  };
}
