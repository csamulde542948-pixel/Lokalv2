import { GraphQLContext } from "../context";
import { awardXp, checkAndAwardRoles } from "../../services/xp";
import { generateAiRoast, getRoastLanguage } from "../../services/roast.service";
import { generateBrandDesignAnalysis } from "../../services/brandAnalysis.service";
import { createNotification } from "../../lib/notifications";
import { assertSafeExternalUrl } from "../../lib/ssrf";
import {
  normalizeRoastUrl,
} from "../../lib/rateLimit";
import {
  assertHasCredits,
  getCreditBalance,
  spendCredits,
  TOOL_CREDIT_COSTS,
} from "../../lib/credits";

// ─── Helpers ──────────────────────────────────────────────────────────────────

import {
  checkAndConsumeRoastToken,
  getRoastTokenStatus,
} from "../../lib/roastTokens";

const ROAST_INCLUDE = {
  reviewer: true,
  project: true,
} as const;

export const roastResolvers = {
  Query: {
    /**
     * viewerGeo — returns the requester's ISO country code, derived
     * from the CDN-set headers (cf-ipcountry / x-vercel-ip-country)
     * in the GraphQL context. Always returns a value: "PH" when no
     * header is present. Powers the auto-default for the roast
     * language on the frontend (Taglish for PH, English elsewhere).
     */
    viewerGeo: async (_: unknown, __: unknown, { userCountry }: GraphQLContext) => {
      return { country: userCountry };
    },

    /**
     * roastStats — all-time platform totals for the rotating category
     * counter on the roast landing page. Two cheap indexed COUNT(*)
     * queries in parallel. No auth — public numbers.
     */
    roastStats: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      const [totalRoasts, totalBrandAnalyses] = await Promise.all([
        prisma.roastGeneration.count(),
        prisma.brandAnalysis.count(),
      ]);
      return { totalRoasts, totalBrandAnalyses };
    },

    roasts: async (
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

    roastGeneration: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          "profileId",
          "projectUrl",
          "canonicalUrl",
          "projectName",
          title,
          "quickRoast",
          "fullRoast",
          language,
          "screenshotUrl",
          "faviconUrl",
          "ogImageUrl",
          "publishedRoastId",
          "publishedAt",
          "createdAt"
        FROM public.roast_generations
        WHERE id = ${id}
        LIMIT 1
      `;
      return rows[0] ?? null;
    },

    brandAnalysis: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      const rows = await prisma.$queryRaw<any[]>`
        SELECT
          id,
          "profileId",
          "projectUrl",
          "canonicalUrl",
          "projectName",
          title,
          "designMd",
          "screenshotUrl",
          "faviconUrl",
          "ogImageUrl",
          "createdAt"
        FROM public.brand_analyses
        WHERE id = ${id}
        LIMIT 1
      `;
      return rows[0] ?? null;
    },

recentRoastGenerations: async (
      _: unknown,
      { limit = 10 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const take = Math.min(Math.max(limit, 1), 10);
      return prisma.$queryRaw`
        SELECT
          id,
          "profileId",
          "projectUrl",
          "canonicalUrl",
          "projectName",
          title,
          "quickRoast",
          "fullRoast",
          language,
          "screenshotUrl",
          "faviconUrl",
          "ogImageUrl",
          "publishedRoastId",
          "publishedAt",
          "createdAt"
        FROM public.roast_generations
        ORDER BY "createdAt" DESC
        LIMIT ${take}
      `;
    },

    recentBrandAnalyses: async (
      _: unknown,
      { limit = 10 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const take = Math.min(Math.max(limit, 1), 10);
      return prisma.$queryRaw`
        SELECT
          id,
          "profileId",
          "projectUrl",
          "canonicalUrl",
          "projectName",
          title,
          "designMd",
          "screenshotUrl",
          "faviconUrl",
          "ogImageUrl",
          "createdAt"
        FROM public.brand_analyses
        ORDER BY "createdAt" DESC
        LIMIT ${take}
      `;
    },

    myRoastTokens: async (_: unknown, __: unknown, { user, prisma }: GraphQLContext) => {
      if (!user) throw new Error("Unauthorized");
      return getRoastTokenStatus(user.id, prisma);
    },

    myCredits: async (_: unknown, __: unknown, { user, prisma }: GraphQLContext) => {
      if (!user) throw new Error("Unauthorized");
      return getCreditBalance(user.id, prisma);
    },

    roastReactors: async (_: unknown, { postId }: { postId: string }, { user, prisma }: GraphQLContext) => {
      if (!user) throw new Error("Unauthorized");
      const reactions = await prisma.roastReaction.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        include: { reactor: true },
      });
      return reactions.map((r: any) => r.reactor);
    },
  },

  Mutation: {
    /**
     * generateRoast — scrape URL with Firecrawl, send to DeepSeek V4 Pro via
     * NVIDIA NIM, return structured preview.
     * Auth and credits are required. Credits are checked before Firecrawl/NVIDIA
     * work starts, then deducted only after the AI roast is generated successfully.
     */
    generateRoast: async (
      _: unknown,
      { input }: { input: { projectUrl: string; projectName: string; language?: string } },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const { projectName } = input;
      const language = getRoastLanguage(input.language);

      // SSRF protection: validate URL before sending to Jina Reader
      const projectUrl = await assertSafeExternalUrl(input.projectUrl);
      const canonicalUrl = normalizeRoastUrl(projectUrl);

      await assertHasCredits(user.id, TOOL_CREDIT_COSTS.AI_ROAST, prisma);
      const result = await generateAiRoast(projectUrl, projectName, language);
      await spendCredits({
        profileId: user.id,
        tool: "AI_ROAST",
        action: "GENERATE",
        amount: TOOL_CREDIT_COSTS.AI_ROAST,
        metadata: { projectUrl: canonicalUrl, projectName },
        prisma,
      });

      const generations = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO public.roast_generations (
          id,
          "profileId",
          "projectUrl",
          "canonicalUrl",
          "projectName",
          title,
          "quickRoast",
          "fullRoast",
          "screenshotUrl",
          "faviconUrl",
          "ogImageUrl",
          language
        )
        VALUES (
          gen_random_uuid()::text,
          CAST(${user.id} AS uuid),
          ${projectUrl},
          ${canonicalUrl},
          ${projectName},
          ${result.title ?? null},
          ${result.quickRoast ?? null},
          ${result.fullRoast ?? null},
          ${result.screenshotUrl ?? null},
          ${result.faviconUrl ?? null},
          ${result.ogImageUrl ?? null},
          ${result.language}
        )
        RETURNING id
      `;
      const generation = generations[0];

      return {
        generationId: generation.id,
        ...result,
        projectUrl,
        projectName,
      };
    },

    /**
     * submitRoast — persist a roast to the DB and publish it to the feed.
     * Requires auth.
     *
     * If projectId is provided (roasting a project registered on Lokal):
     *   - Saves Roast record, increments roastsCount, notifies owner, awards XP
     * If projectId is omitted (arbitrary external URL):
     *   - Skips Roast DB record; still publishes to feed
     *
     * Either way a feed post is created so the community sees the roast.
     */
    submitRoast: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      let roast: any = null;
      let project: any = null;

      if (input.projectId) {
        // ── Linked to a registered project ─────────────────────────────────
        project = await prisma.project.findUnique({ where: { id: input.projectId } });
        if (!project) throw new Error("Project not found");
        if (project.authorId === user.id) throw new Error("You cannot roast your own project");
      }

      // ── Always save the Roast record ─────────────────────────────────────
      // projectId is nullable — external URL roasts have no registered project.
      // DB columns projectUrl / projectName / screenshotUrl added in migration 29.
      roast = await prisma.roast.create({
        data: {
          projectId:    input.projectId    ?? null,
          projectUrl:   input.projectUrl   ?? null,
          projectName:  input.projectName  ?? null,
          reviewerId:   user.id,
          quickRoast:   input.quickRoast   ?? null,
          fullRoast:    input.fullRoast    ?? null,
          detailedFeedback: input.fullRoast ?? null,
          screenshotUrl: input.screenshotUrl ?? null,
        } as any,
        include: ROAST_INCLUDE,
      });

      if (input.projectId && project) {
        // Increment project roast count
        await prisma.project.update({
          where: { id: input.projectId },
          data: { roastsCount: { increment: 1 } },
        });
        // Award XP to both parties
        awardXp(user.id, "SHARE_PROJECT", undefined, clientIp).catch(console.error);
        awardXp(project.authorId, "GET_ROASTED", user.id, clientIp).catch(console.error);
        checkAndAwardRoles(user.id).catch(console.error);
      } else {
        // External URL — award XP to the reviewer only
        awardXp(user.id, "SHARE_PROJECT", undefined, clientIp).catch(console.error);
        checkAndAwardRoles(user.id).catch(console.error);
      }

      // ── Publish to feed as a post (always) ────────────────────────────────
      // This makes the roast visible in the community feed regardless of
      // whether it's linked to a registered project.
      // NOTE: Feed post is created BEFORE the PROJECT_ROAST notification so we
      //       can pass the post's id as postId — enabling the notification click
      //       to open the PostModal directly instead of navigating away.
      let feedPostId: string | null = null;
      try {
        const feedContent = `🔥 Just roasted **${input.projectName}** with Lokal AI!\n\n${input.fullRoast ?? input.quickRoast ?? ""}\n\n👉 ${input.projectUrl}`;
        const hasScreenshot = !!input.screenshotUrl;
        console.log(`[submitRoast] screenshotUrl=${input.screenshotUrl ?? "null"} hasScreenshot=${hasScreenshot}`);
        const post = await prisma.post.create({
          data: {
            authorId: user.id,
            content: feedContent,
            projectName: input.projectName ?? null,
            // postType is derived from the "roast" tag below — no column needed
            // Persist the Firecrawl screenshot — store in BOTH columns so
            // the feed card always finds it regardless of field-resolver fallback
            ...(input.screenshotUrl
              ? { imageUrl: input.screenshotUrl, imageUrls: [input.screenshotUrl] }
              : {}),
          },
        });
        feedPostId = post.id;
        // Attach roast tags to the feed post
        const tagNames = ["roast", "ai", "lokal"];
        for (const name of tagNames) {
          const tag = await prisma.tag.upsert({
            where: { name },
            create: { name },
            update: {},
          });
          await prisma.postTag.upsert({
            where: { postId_tagId: { postId: post.id, tagId: tag.id } },
            create: { postId: post.id, tagId: tag.id },
            update: {},
          });
        }
      } catch (feedErr) {
        // Feed post is best-effort — don't fail the roast submission if it errors
        console.error("[submitRoast] feed post side-effect failed:", feedErr);
      }

      // Notify project owner (after feed post so we can link postId)
      if (roast && project && project.authorId !== user.id) {
        await createNotification(prisma, {
          recipientId: project.authorId,
          actorId: user.id,
          type: "PROJECT_ROAST",
          projectId: input.projectId,
          entityId: roast.id,
          postId: feedPostId,   // links notification click → PostModal
        });
      }

      // Return the saved Roast record (always exists now)
      if (input.generationId) {
        await prisma.$executeRaw`
          UPDATE public.roast_generations
          SET "publishedRoastId" = ${roast.id},
              "publishedAt" = NOW()
          WHERE id = ${input.generationId}
            AND "profileId" = CAST(${user.id} AS uuid)
        `;
      }

      return roast;
    },

    generateBrandAnalysis: async (
      _: unknown,
      { input }: { input: { projectUrl: string; projectName: string } },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const projectUrl = await assertSafeExternalUrl(input.projectUrl);
      const canonicalUrl = normalizeRoastUrl(projectUrl);
      const projectName = input.projectName;

      await assertHasCredits(user.id, TOOL_CREDIT_COSTS.AI_BRAND_ANALYZER, prisma);
      const result = await generateBrandDesignAnalysis(projectUrl, projectName);
      await spendCredits({
        profileId: user.id,
        tool: "AI_BRAND_ANALYZER",
        action: "GENERATE",
        amount: TOOL_CREDIT_COSTS.AI_BRAND_ANALYZER,
        metadata: { projectUrl: canonicalUrl, projectName },
        prisma,
      });

      const analyses = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO public.brand_analyses (
          id,
          "profileId",
          "projectUrl",
          "canonicalUrl",
          "projectName",
          title,
          "designMd",
          "screenshotUrl",
          "faviconUrl",
          "ogImageUrl"
        )
        VALUES (
          gen_random_uuid()::text,
          CAST(${user.id} AS uuid),
          ${projectUrl},
          ${canonicalUrl},
          ${projectName},
          ${result.title},
          ${result.designMd},
          ${result.screenshotUrl ?? null},
          ${result.faviconUrl ?? null},
          ${result.ogImageUrl ?? null}
        )
        RETURNING id
      `;

      return {
        id: analyses[0]?.id ?? null,
        ...result,
      };
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

    /**
     * roastReact — spend 1 daily 🔥 Roast Token to react on a feed roast post.
     *
     * Rules:
     *   - Auth required
     *   - Only on posts with postType "roast" (has #roast tag)
     *   - Cannot react on your own post
     *   - One-way spend — no un-react
     *   - Consumes 1 token (daily limit: 1 Newbie / 2 Developer / 3 Senior+)
     *   - Increments post.roastReactionCount
     *   - Awards XP to reactor (GIVE_ROAST_REACT) and post owner (RECEIVE_ROAST_REACT)
     *   - Sends ROAST_REACTION notification to post owner
     */
    roastReact: async (
      _: unknown,
      { postId }: { postId: string },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Fetch the post with its tags to verify it's a roast post
      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { tags: { include: { tag: true } } },
      });
      if (!post) throw new Error("Post not found");

      // Guard: only roast posts are eligible
      const tagNames: string[] = (post.tags ?? []).map((pt: any) => pt.tag?.name ?? "");
      if (!tagNames.includes("roast")) {
        throw new Error("Roast reactions can only be given on roast posts");
      }

      // Guard: cannot react on your own post
      if (post.authorId === user.id) {
        throw new Error("You cannot give a Roast React on your own post");
      }

      // Guard: idempotent — check if already reacted (silent no-op, return current post)
      const existingReaction = await prisma.roastReaction.findUnique({
        where: { postId_reactorId: { postId, reactorId: user.id } },
      });
      if (existingReaction) {
        throw new Error("You already gave a 🔥 Roast React on this post");
      }

      // Guard: check + consume 1 daily token (throws ROAST_TOKEN_EXHAUSTED:{n} if empty)
      await checkAndConsumeRoastToken(user.id, prisma);

      // Write the reaction record + increment counter atomically
      await prisma.$transaction([
        prisma.roastReaction.create({
          data: { postId, reactorId: user.id },
        }),
        prisma.post.update({
          where: { id: postId },
          data: { roastReactionCount: { increment: 1 } },
        }),
      ]);

      // Award XP — fire-and-forget (non-blocking)
      awardXp(user.id,      "GIVE_ROAST_REACT",    undefined,    clientIp).catch(console.error);
      awardXp(post.authorId,"RECEIVE_ROAST_REACT",  user.id,      clientIp).catch(console.error);

      // Notify post owner
      createNotification(prisma, {
        recipientId: post.authorId,
        actorId:     user.id,
        type:        "ROAST_REACTION",
        postId,
      }).catch(console.error);

      // Return the updated post
      return prisma.post.findUnique({
        where: { id: postId },
        include: { tags: { include: { tag: true } } },
      });
    },
  },

  Roast: {
    // DB model uses `reviewer` relation; typedef exposes `author`
    author: (parent: any) => parent.reviewer,

    // Not a DB column — derive from projectName
    title: (parent: any) => parent.projectName ? `${parent.projectName} Got Roasted` : "Got Roasted",

    // Nullable in DB but String! in typedef — fall back to empty string
    projectUrl: (parent: any) => parent.projectUrl ?? "",
    projectName: (parent: any) => parent.projectName ?? "",

    // Not tracked on the Roast record itself — return sensible defaults
    commentsCount: () => 0,
    sharesCount: () => 0,
    rankScore: () => null,

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

  RoastGeneration: {
    author: (parent: any, _: unknown, { prisma }: GraphQLContext) => {
      return prisma.profile.findUnique({ where: { id: parent.profileId } });
    },
  },

  BrandAnalysis: {
    author: (parent: any, _: unknown, { prisma }: GraphQLContext) => {
      return prisma.profile.findUnique({ where: { id: parent.profileId } });
    },
  },
};
