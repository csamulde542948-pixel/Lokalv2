import { GraphQLContext } from "../context";
import { awardXp, checkAndAwardRoles } from "../../services/xp";
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

    myRoastTokens: async (_: unknown, __: unknown, { user, prisma }: GraphQLContext) => {
      if (!user) throw new Error("Unauthorized");
      return getRoastTokenStatus(user.id, prisma);
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

        roast = await prisma.roast.create({
          data: {
            projectId: input.projectId,
            reviewerId: user.id,
            quickRoast: input.quickRoast ?? null,
            fullRoast: input.fullRoast ?? null,
            detailedFeedback: input.fullRoast ?? null,
          } as any,
          include: ROAST_INCLUDE,
        });

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
        // ── External URL — award XP to the reviewer only ───────────────────
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
        const post = await prisma.post.create({
          data: {
            authorId: user.id,
            content: feedContent,
            projectName: input.projectName ?? null,
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

      // Return the Roast record if created, or a minimal stub for external URLs
      return roast ?? {
        id: `stub-${Date.now()}`,
        projectId: null,
        quickRoast: input.quickRoast ?? null,
        fullRoast: input.fullRoast ?? null,
        likesCount: 0,
        createdAt: new Date().toISOString(),
        reviewer: null,
        project: null,
        likes: [],
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
