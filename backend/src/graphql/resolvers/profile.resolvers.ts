import { GraphQLContext } from "../context";
import {
  streamFollowUser,
  streamUnfollowUser,
  upsertStreamUser,
  generateStreamToken,
} from "../../lib/stream";
import { sendWelcomeEmail } from "../../services/email";
import { awardXp } from "../../services/xp";

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
      { prisma }: GraphQLContext
    ) => {
      return prisma.profile.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { username: { contains: query, mode: "insensitive" } },
            { bio: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
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

    // GetStream token for client-side chat connection
    streamToken: async (
      _: unknown,
      __: unknown,
      { user }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const token = generateStreamToken(user.id);
      return { token, apiKey: process.env.GETSTREAM_API_KEY! };
    },
  },

  Mutation: {
    /**
     * Called after Supabase signup — creates the profile row.
     */
    createProfile: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

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

      // Sync to GetStream
      await upsertStreamUser({
        id: user.id,
        name: input.name,
        username: input.username,
        imageUrl: input.avatarUrl,
      });

      // Send welcome email
      if (user.email) {
        await sendWelcomeEmail(user.email, input.name).catch(console.error);
      }

      // Award XP for completing profile basics
      await awardXp(user.id, "COMPLETE_PROFILE");

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

      const profile = await prisma.profile.update({
        where: { id: user.id },
        data: { ...input, updatedAt: new Date() },
        include: { rank: true },
      });

      // Sync updated name/avatar to GetStream
      await upsertStreamUser({
        id: user.id,
        name: profile.name,
        username: profile.username,
        imageUrl: profile.avatarUrl,
      });

      return profile;
    },

    /**
     * Follow a user — updates DB + GetStream feed graph.
     */
    followUser: async (
      _: unknown,
      { userId }: { userId: string },
      { user, prisma }: GraphQLContext
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
      await awardXp(user.id, "MAKE_CONNECTION");

      // Create notification
      await prisma.notification.create({
        data: {
          recipientId: userId,
          actorId: user.id,
          type: "FOLLOW",
        },
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
  },

  /**
   * Field resolvers on Profile type.
   * These run when client requests specific fields, enabling lazy loading.
   */
  Profile: {
    followersCount: async (
      parent: { id: string },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      return prisma.follow.count({ where: { followingId: parent.id } });
    },

    followingCount: async (
      parent: { id: string },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      return prisma.follow.count({ where: { followerId: parent.id } });
    },

    isFollowedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: parent.id,
          },
        },
      });
      return !!follow;
    },

    postsCount: async (
      parent: { id: string },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      return prisma.post.count({ where: { authorId: parent.id } });
    },

    projectsCount: async (
      parent: { id: string },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      return prisma.project.count({
        where: { authorId: parent.id, visibility: "PUBLIC" },
      });
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
