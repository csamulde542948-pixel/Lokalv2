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
  /** DataLoaders for batching DB queries (prevents N+1) */
  loaders: {
    profileLoader: DataLoader<string, any>;
    postLoader: DataLoader<string, any>;
    projectLoader: DataLoader<string, any>;
  };
}
