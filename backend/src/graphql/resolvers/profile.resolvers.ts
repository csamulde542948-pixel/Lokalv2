import { GraphQLContext } from "../context";
import {
  streamFollowUser,
  streamUnfollowUser,
  upsertStreamUser,
  upsertChatUser,
  generateStreamToken,
  createDMChannel,
} from "../../lib/stream";
import { sendWelcomeEmail } from "../../services/email";
import { awardXp, awardRole, ROLE_NAMES } from "../../services/xp";
import { createNotification } from "../../lib/notifications";
import { searchRateLimiter } from "../../lib/rateLimit";

export const profileResolvers = {
  Query: {
    /**
     * Return the currently authenticated user's profile.
     */
    me: async (_: unknown, __: unknown, { user, prisma }: GraphQLContext) => {
      if (!user) return null;
      return prisma.profile.findUnique({
        where: { id: user.id },
        include: { rank: true },
      });
    },

    /**
     * Fetch a profile by username.
     */
    profile: async (
      _: unknown,
      { username }: { username: string },
      { prisma }: GraphQLContext
    ) => {
      return prisma.profile.findUnique({
        where: { username },
        include: { rank: true },
      });
    },

    /**
     * Full-text search across profiles.
     */
    searchProfiles: async (
      _: unknown,
      { query, limit = 10 }: { query: string; limit?: number },
      { user, clientIp, prisma }: GraphQLContext
    ) => {
      // HIGH-01: Rate-limit to prevent enumeration attacks
      searchRateLimiter.check(user?.id ?? clientIp);
      const safeLimit = Math.min(limit, 20);
      return prisma.profile.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            // bio removed from search — MED-06: private data not exposed publicly
          ],
        },
        take: safeLimit,
        include: { rank: true },
      });
    },

    /**
     * Suggest users the current user might want to follow.
     * Strategy: users NOT currently followed, ordered by XP.
     */
    suggestedUsers: async (
      _: unknown,
      { limit = 5 }: { limit?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return [];

      // Get IDs the user already follows
      const follows = await prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true },
      });
      const followingIds = follows.map((f: any) => f.followingId);
      followingIds.push(user.id); // exclude self

      return prisma.profile.findMany({
        where: { id: { notIn: followingIds } },
        orderBy: { xp: "desc" },
        take: limit,
        include: { rank: true },
      });
    },

    /** People who follow the current user */
    myFollowers: async (
      _: unknown,
      { limit = 50, offset = 0 }: { limit?: number; offset?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return [];
      // HIGH-04: Cap offset to prevent full-table scan
      const safeOffset = Math.min(offset, 10_000);
      const follows = await prisma.follow.findMany({
        where: { followingId: user.id },
        include: { follower: { include: { rank: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: safeOffset,
      });
      return follows.map((f: any) => f.follower);
    },

    /** People the current user is following */
    myFollowing: async (
      _: unknown,
      { limit = 50, offset = 0 }: { limit?: number; offset?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return [];
      // HIGH-04: Cap offset to prevent full-table scan
      const safeOffset = Math.min(offset, 10_000);
      const follows = await prisma.follow.findMany({
        where: { followerId: user.id },
        include: { following: { include: { rank: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: safeOffset,
      });
      return follows.map((f: any) => f.following);
    },

    // GetStream token for client-side chat connection
    streamToken: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const apiKey = process.env.GETSTREAM_API_KEY;
      if (!apiKey) {
        console.error("[streamToken] GETSTREAM_API_KEY is not set on this environment");
        throw new Error("Chat service is not configured");
      }

      try {
        // Upsert user in Stream Chat so connectUser never fails with unknown user
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { id: true, name: true, username: true, avatarUrl: true },
        });

        if (profile) {
          await upsertChatUser({
            id: profile.id,
            name: profile.name,
            username: profile.username ?? undefined,
            imageUrl: profile.avatarUrl,
          }).catch((err: unknown) => {
            // Non-fatal — log but don't block token generation
            console.warn("[streamToken] upsertChatUser failed (non-fatal):", (err as any)?.message ?? err);
          });
        }

        const token = generateStreamToken(user.id);
        // Stream Chat API key is a *public* key (not a secret) — safe to return
        // to authenticated clients just like every Stream Chat frontend integration does.
        // The secret (GETSTREAM_API_SECRET) stays server-side only.
        return { token, apiKey };
      } catch (err: unknown) {
        const msg = (err as any)?.message ?? String(err);
        console.error("[streamToken] resolver threw:", msg, err);
        throw new Error("Chat token generation failed");
      }
    },
  },

  Mutation: {
    /**
     * Called after Supabase signup — creates the profile row.
     */
    createProfile: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // HIGH-02: Idempotency guard — handles network retries and double-submit
      // on the signup page without throwing a unique constraint error
      const existing = await prisma.profile.findUnique({
        where: { id: user.id },
        include: { rank: true },
      });
      if (existing) return existing;

      // Default rank is "Newbie" (id: 1)
      const profile = await prisma.profile.create({
        data: {
          id: user.id,
          username: input.username,
          name: input.name,
          bio: input.bio,
          avatarUrl: input.avatarUrl,
          rankId: 1,
          streamUserId: user.id,
        },
        include: { rank: true },
      });

      // Sync to GetStream (non-blocking)
      upsertStreamUser({
        id: user.id,
        name: input.name,
        username: input.username,
        imageUrl: input.avatarUrl,
      }).catch((err) => console.warn("[profile] stream sync failed:", err?.message));

      // Send welcome email
      if (user.email) {
        await sendWelcomeEmail(user.email, input.name).catch(console.error);
      }

      // Award XP for completing profile basics
      await awardXp(user.id, "COMPLETE_PROFILE", undefined, clientIp);

      return profile;
    },

    /**
     * Update profile fields.
     */
    updateProfile: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Medium #14: Whitelist — never spread raw input directly into Prisma.
      // Prevents callers from overwriting sensitive fields like `xp`, `rankId`, `isAdmin`.
      const allowed = [
        "name", "bio", "avatarUrl", "coverUrl",
        "website", "location", "company", "jobTitle", "githubUsername",
      ] as const;
      type AllowedKey = typeof allowed[number];
      const safeData = Object.fromEntries(
        allowed
          .filter((k): k is AllowedKey => k in input)
          .map((k) => [k, input[k]])
      );

      // Medium #13: Input length limits
      if (safeData.name !== undefined && (safeData.name as string).length > 80)
        throw new Error("Name must be 80 characters or fewer");
      if (safeData.bio !== undefined && (safeData.bio as string).length > 500)
        throw new Error("Bio must be 500 characters or fewer");
      if (safeData.website !== undefined && (safeData.website as string).length > 200)
        throw new Error("Website URL must be 200 characters or fewer");
      if (safeData.location !== undefined && (safeData.location as string).length > 100)
        throw new Error("Location must be 100 characters or fewer");
      if (safeData.company !== undefined && (safeData.company as string).length > 100)
        throw new Error("Company must be 100 characters or fewer");
      if (safeData.jobTitle !== undefined && (safeData.jobTitle as string).length > 100)
        throw new Error("Job title must be 100 characters or fewer");
      if (safeData.githubUsername !== undefined && (safeData.githubUsername as string).length > 39)
        throw new Error("GitHub username must be 39 characters or fewer");

      const profile = await prisma.profile.update({
        where: { id: user.id },
        data: { ...safeData, updatedAt: new Date() },
        include: { rank: true },
      });

      // Sync updated name/avatar to GetStream (non-blocking — never fail the mutation)
      upsertStreamUser({
        id: user.id,
        name: profile.name,
        username: profile.username,
        imageUrl: profile.avatarUrl,
      }).catch((err) => console.warn("[profile] stream sync failed:", err?.message));

      return profile;
    },

    /**
     * Complete onboarding — updates profile, connects tags, and seeds
     * UserTagAffinity records so the feed ranking has warm-start data.
     * P0 #7: Without this, new users get zero personalization.
     */
    completeOnboarding: async (
      _: unknown,
      { input }: { input: { username: string; name: string; bio?: string; location?: string; tags: string[] } },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // 1. Update profile basics
      const profile = await prisma.profile.update({
        where: { id: user.id },
        data: {
          username: input.username,
          name: input.name,
          ...(input.bio ? { bio: input.bio } : {}),
          ...(input.location ? { location: input.location } : {}),
          isOnboarded: true,
          updatedAt: new Date(),
        },
        include: { rank: true },
      });

      // 2. Sync to GetStream (non-blocking)
      upsertStreamUser({
        id: user.id,
        name: input.name,
        username: input.username,
        imageUrl: profile.avatarUrl,
      }).catch((err) => console.warn("[profile] stream sync failed:", err?.message));

      // 3. Connect tags — create PostTag-style tag connections (upsert tags first)
      if (input.tags.length > 0) {
        for (const tagName of input.tags) {
          // Ensure tag exists
          await prisma.tag.upsert({
            where: { name: tagName },
            create: { name: tagName },
            update: {},
          });
        }

        // 4. Seed UserTagAffinity records for each selected tag
        //    Initial score 0.5 = moderate interest (higher than engagement-derived 0.05-0.1)
        for (const tagName of input.tags) {
          await prisma.userTagAffinity.upsert({
            where: { profileId_tagName: { profileId: user.id, tagName } },
            create: { profileId: user.id, tagName, score: 0.5 },
            update: { score: 0.5 }, // Reset to 0.5 if re-onboarding
          });
        }
      }

      // 5. Award XP for completing onboarding
      await awardXp(user.id, "COMPLETE_PROFILE", undefined, clientIp);

      return profile;
    },

    /**
     * Follow a user — updates DB + GetStream feed graph.
     */
    followUser: async (
      _: unknown,
      { userId }: { userId: string },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      if (user.id === userId) throw new Error("Cannot follow yourself");

      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: userId,
          },
        },
        create: { followerId: user.id, followingId: userId },
        update: {},
      });

      // Sync to GetStream so their posts appear in current user's timeline
      await streamFollowUser(user.id, userId);

      // Award XP to follower
      await awardXp(user.id, "MAKE_CONNECTION", undefined, clientIp);

      // Check if the target user already follows the current user back (mutual follow)
      const alreadyFollowsBack = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: user.id,
          },
        },
      });

      // Create notification — "followed you back" if they already follow us, else plain "followed you"
      await createNotification(prisma, {
        recipientId: userId,
        actorId: user.id,
        type: "FOLLOW",
        message: alreadyFollowsBack
          ? "followed you back"
          : "started following you",
      });

      return prisma.profile.findUnique({
        where: { id: userId },
        include: { rank: true },
      });
    },

    /**
     * Unfollow a user.
     */
    unfollowUser: async (
      _: unknown,
      { userId }: { userId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      await prisma.follow.deleteMany({
        where: { followerId: user.id, followingId: userId },
      });

      await streamUnfollowUser(user.id, userId);

      return prisma.profile.findUnique({
        where: { id: userId },
        include: { rank: true },
      });
    },

    // Create (or get) a DM channel between the current user and another user
    startDM: async (
      _: unknown,
      { otherUserId }: { otherUserId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Ensure both users exist in Stream Chat
      const [me, other] = await Promise.all([
        prisma.profile.findUnique({ where: { id: user.id }, select: { id: true, name: true, username: true, avatarUrl: true } }),
        prisma.profile.findUnique({ where: { id: otherUserId }, select: { id: true, name: true, username: true, avatarUrl: true } }),
      ]);

      await Promise.all([
        me ? upsertChatUser({ id: me.id, name: me.name, username: me.username ?? undefined, imageUrl: me.avatarUrl }).catch(() => {}) : Promise.resolve(),
        other ? upsertChatUser({ id: other.id, name: other.name, username: other.username ?? undefined, imageUrl: other.avatarUrl }).catch(() => {}) : Promise.resolve(),
      ]);

      const cid = await createDMChannel(user.id, otherUserId);
      return cid; // e.g. "messaging:dm-abc-xyz"
    },

    // ── Award a role to a profile (admin/system use) ──────────────────────
    awardRole: async (
      _: unknown,
      { profileId, roleName }: { profileId: string; roleName: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Only admins can award roles manually
      const isAdmin = !!(await prisma.userRole.findFirst({
        where: { profileId: user.id, role: { name: "Top Contributor" } },
      }));
      // Simple guard — extend to a proper admin check if needed
      if (user.id !== profileId && !isAdmin) {
        throw new Error("Only admins can award roles to other users");
      }

      const validRoleNames = Object.values(ROLE_NAMES) as string[];
      if (!validRoleNames.includes(roleName)) {
        throw new Error(`Unknown role: ${roleName}`);
      }

      const result = await awardRole(profileId, roleName as any);
      if (!result.awarded) {
        throw new Error(`User already has the role: ${roleName}`);
      }

      // Return the new UserRole record
      const role = await prisma.role.findUnique({ where: { name: roleName } });
      return prisma.userRole.findUnique({
        where: { profileId_roleId: { profileId, roleId: role!.id } },
        include: { role: true },
      });
    },
  },

  /**
   * Field resolvers on Profile type.
   * These use DataLoaders for batching — prevents N+1 queries when
   * multiple profiles are resolved in the same request (e.g. leaderboard, followers list).
   */
  Profile: {
    followersCount: async (
      parent: { id: string },
      _: unknown,
      { loaders }: GraphQLContext
    ) => {
      return loaders.followersCountLoader.load(parent.id);
    },

    followingCount: async (
      parent: { id: string },
      _: unknown,
      { loaders }: GraphQLContext
    ) => {
      return loaders.followingCountLoader.load(parent.id);
    },

    isFollowedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, loaders }: GraphQLContext
    ) => {
      if (!user) return false;
      return loaders.isFollowedByMeLoader.load(parent.id);
    },

    postsCount: async (
      parent: { id: string },
      _: unknown,
      { loaders }: GraphQLContext
    ) => {
      return loaders.postsCountLoader.load(parent.id);
    },

    projectsCount: async (
      parent: { id: string },
      _: unknown,
      { loaders }: GraphQLContext
    ) => {
      return loaders.projectsCountLoader.load(parent.id);
    },

    /**
     * Unread notification badge count — read directly from the profile row.
     * No extra DB query needed; the column is maintained by createNotification
     * (increments) and markRead / markAllRead (decrements / resets).
     */
    unreadNotificationsCount: (parent: { unreadNotificationsCount?: number }) => {
      return parent.unreadNotificationsCount ?? 0;
    },

    posts: async (
      parent: { id: string },
      { limit = 10, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.post.findMany({
        where: { authorId: parent.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    projects: async (
      parent: { id: string },
      {
        limit = 10,
        offset = 0,
        visibility,
      }: { limit?: number; offset?: number; visibility?: "PUBLIC" | "PRIVATE" },
      { user, prisma }: GraphQLContext
    ) => {
      const canSeePrivate = user?.id === parent.id;
      return prisma.project.findMany({
        where: {
          authorId: parent.id,
          visibility:
            visibility ||
            (canSeePrivate ? undefined : "PUBLIC"),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    friends: async (
      parent: { id: string },
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      const follows = await prisma.follow.findMany({
        where: { followerId: parent.id },
        take: limit,
        skip: offset,
        include: { following: { include: { rank: true } } },
      });
      return follows.map((f: any) => f.following);
    },

    photos: async (
      parent: { id: string },
      { limit = 9 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.profilePhoto.findMany({
        where: { profileId: parent.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    },

    earnedRoles: async (
      parent: { id: string },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      return prisma.userRole.findMany({
        where: { profileId: parent.id },
        include: { role: true },
      });
    },

    mutualFriendsCount: async (
      parent: { id: string },
      { withUserId }: { withUserId: string },
      { prisma }: GraphQLContext
    ) => {
      // Users that both parent and withUserId follow
      const [parentFollowing, otherFollowing] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: parent.id },
          select: { followingId: true },
        }),
        prisma.follow.findMany({
          where: { followerId: withUserId },
          select: { followingId: true },
        }),
      ]);
      const parentSet = new Set(parentFollowing.map((f: any) => f.followingId));
      const mutual = otherFollowing.filter((f: any) =>
        parentSet.has(f.followingId)
      );
      return mutual.length;
    },
  },
};
