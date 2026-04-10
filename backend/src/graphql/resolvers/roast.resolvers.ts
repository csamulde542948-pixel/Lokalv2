import { GraphQLContext } from "../context";
import { awardXp } from "../../services/xp";
import { generateAiRoast } from "../../services/roast.service";
import { createNotification } from "../../lib/notifications";
import { assertSafeExternalUrl } from "../../lib/ssrf";
import {
  roastRateLimiter,
  ipRoastLimiter,
  normalizeRoastUrl,
  roastUrlCache,
  perUserUrlLimiter,
} from "../../lib/rateLimit";

const ROAST_INCLUDE = {
  reviewer: { include: { rank: true } },
  project: true,
} as const;

export const roastResolvers = {
  Query: {
    roasts: async (
      _: unknown,
      { limit = 20, offset = 0, projectId }: { limit?: number; offset?: number; projectId?: string },
      { prisma }: GraphQLContext
    ) => {
      const where: any = {};
      if (projectId) where.projectId = projectId;
      return prisma.roast.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: ROAST_INCLUDE,
      });
    },

    roast: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      return prisma.roast.findUnique({ where: { id }, include: ROAST_INCLUDE });
    },
  },

  Mutation: {
    /**
     * generateRoast — scrape URL with Jina Reader, send to DeepSeek v3 via
     * OpenRouter, return structured preview.
     *
     * Auth is NOT required to generate a roast — users can try the feature
     * before signing up. Auth IS required to publish/share via submitRoast.
     *
     * Rate limits:
     *   - Anonymous: 3 roasts per IP per hour (weaker key, lower quota)
     *   - Authenticated: 10 roasts per user per hour (stronger key, higher quota)
     */
    generateRoast: async (
      _: unknown,
      { input }: { input: { projectUrl: string; projectName: string } },
      { user, clientIp }: GraphQLContext
    ) => {
      // Apply the appropriate rate limit based on auth state
      if (user) {
        // Authenticated: higher quota keyed on stable user ID
        roastRateLimiter.check(user.id);
      } else {
        // Anonymous: lower quota keyed on IP — still protects paid APIs
        ipRoastLimiter.check(clientIp);
      }

      const { projectName } = input;

      // SSRF protection: validate URL before sending to Jina Reader
      const projectUrl = await assertSafeExternalUrl(input.projectUrl);

      // ── Deduplication ────────────────────────────────────────────────────
      // Normalise the URL so utm params, www, trailing slashes don't produce
      // duplicate entries (e.g. myapp.com/ and myapp.com?ref=twitter are same)
      const canonicalUrl = normalizeRoastUrl(projectUrl);

      // 1) Per-user-per-URL: authenticated users can only re-generate a roast
      //    for the exact same URL once every 24 h. Return cached copy if seen.
      if (user && perUserUrlLimiter.isDuplicate(user.id, canonicalUrl)) {
        const cached = roastUrlCache.get(canonicalUrl);
        if (cached) {
          return { ...cached, projectUrl, projectName };
        }
        // Cache expired but dedup window hasn't — still block and ask to wait
        throw new Error(
          "You already roasted this URL recently. Come back in 24 hours for a fresh roast!"
        );
      }

      // 2) Per-URL global cooldown: any URL roasted in the last 24 h returns
      //    the cached roast (saves AI credits, keeps feed varied).
      const urlCached = roastUrlCache.get(canonicalUrl);
      if (urlCached) {
        // Register the user's "seen" entry so they also get dedup protection
        if (user) perUserUrlLimiter.isDuplicate(user.id, canonicalUrl);
        return { ...urlCached, projectUrl, projectName };
      }
      // ────────────────────────────────────────────────────────────────────

      const result = await generateAiRoast(projectUrl, projectName);

      // Cache the result for both dedup layers
      roastUrlCache.set(canonicalUrl, result as unknown as Record<string, unknown>);

      return {
        ...result,
        projectUrl,
        projectName,
      };
    },

    /**
     * submitRoast — persist a (generated or manual) roast to the DB.
     * Requires auth. Accepts pre-generated AI fields or scores directly.
     * The fullRoast text is stored in detailedFeedback until a migration
     * adds dedicated columns.
     */
    submitRoast: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      if (!input.projectId) throw new Error("projectId is required to submit a roast");

      const project = await prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new Error("Project not found");
      if (project.authorId === user.id) throw new Error("You cannot roast your own project");

      const overallScore = input.overallScore ?? 3;

      const roast = await prisma.roast.create({
        data: {
          projectId: input.projectId,
          reviewerId: user.id,
          strengths: input.strengths ?? [],
          improvements: input.improvements ?? [],
          // store the AI narrative in detailedFeedback until migration adds columns
          detailedFeedback: input.fullRoast ?? input.detailedFeedback ?? null,
          overallScore,
        },
        include: ROAST_INCLUDE,
      });

      // Update project roast count if linked to a project
      if (project) {
        await prisma.project.update({
          where: { id: input.projectId },
          data: { roastsCount: { increment: 1 } },
        });

        // Notify project owner
        if (project.authorId !== user.id) {
          await createNotification(prisma, {
            recipientId: project.authorId,
            actorId: user.id,
            type: "PROJECT_ROAST",
            projectId: input.projectId,
            entityId: roast.id,
          });
        }

        // XP for both parties
        awardXp(user.id, "SHARE_PROJECT").catch(console.error);
        awardXp(project.authorId, "GET_ROASTED").catch(console.error);
      }

      return roast;
    },

    likeRoast: async (
      _: unknown,
      { roastId }: { roastId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const roast = await prisma.roast.findUnique({ where: { id: roastId } });
      if (!roast) throw new Error("Roast not found");

      // Check if already liked — prevent double-counting
      const existing = await prisma.roastLike.findUnique({
        where: { roastId_profileId: { roastId, profileId: user.id } },
      });

      if (!existing) {
        // Create the like record and increment counter atomically
        await prisma.roastLike.create({
          data: { roastId, profileId: user.id },
        });
        await prisma.roast.update({
          where: { id: roastId },
          data: { likesCount: { increment: 1 } },
        });
      }

      return prisma.roast.findUnique({ where: { id: roastId }, include: ROAST_INCLUDE });
    },
  },

  Roast: {
    likedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const like = await prisma.roastLike.findUnique({
        where: { roastId_profileId: { roastId: parent.id, profileId: user.id } },
      });
      return !!like;
    },
  },
};
