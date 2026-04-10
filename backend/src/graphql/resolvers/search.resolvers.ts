import { GraphQLContext } from "../context";
import { searchRateLimiter } from "../../lib/rateLimit";

export const searchResolvers = {
  Query: {
    globalSearch: async (
      _: unknown,
      { query, limit = 5 }: { query: string; limit?: number },
      { user, clientIp, prisma }: GraphQLContext
    ) => {
      // HIGH-01: Rate-limit to prevent username/email enumeration and ILIKE abuse
      // Use userId if authenticated, fall back to IP for anonymous callers
      searchRateLimiter.check(user?.id ?? clientIp);

      const q = query.trim();
      if (q.length < 2) return { profiles: [], projects: [], jobs: [] };

      const [profiles, projects, jobs] = await Promise.all([
        prisma.profile.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
            ],
          },
          take: limit,
          include: { rank: true },
        }),
        prisma.project.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { tagline: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          },
          take: limit,
          include: { author: { include: { rank: true } } },
        }),
        prisma.job.findMany({
          where: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          },
          take: limit,
          include: { postedBy: { include: { rank: true } } },
        }),
      ]);

      return { profiles, projects, jobs };
    },
  },
};
