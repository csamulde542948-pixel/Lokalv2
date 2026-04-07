import { GraphQLContext } from "../context";
import { awardXp } from "../../services/xp";
import { generateAiRoast } from "../../services/roast.service";

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
     * OpenRouter, return structured preview. No auth required.
     * The client can then call submitRoast to persist the result.
     */
    generateRoast: async (
      _: unknown,
      { input }: { input: { projectUrl: string; projectName: string } }
    ) => {
      const { projectUrl, projectName } = input;

      if (!projectUrl || !projectUrl.startsWith("http")) {
        throw new Error("projectUrl must be a valid URL starting with http(s)://");
      }

      const result = await generateAiRoast(projectUrl, projectName);

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
          await prisma.notification.create({
            data: {
              recipientId: project.authorId,
              actorId: user.id,
              type: "PROJECT_ROAST",
              projectId: input.projectId,
              entityId: roast.id,
            },
          });
          await prisma.profile.update({
            where: { id: project.authorId },
            data: { unreadNotificationsCount: { increment: 1 } },
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
      await prisma.roast.update({
        where: { id: roastId },
        data: { likesCount: { increment: 1 } },
      });
      return prisma.roast.findUnique({ where: { id: roastId }, include: ROAST_INCLUDE });
    },
  },

  Roast: {
    likedByMe: async (
      parent: { id: string },
      _: unknown,
      { user }: GraphQLContext
    ) => {
      if (!user) return false;
      // Phase 2: query RoastLike join table
      return false;
    },
  },
};
