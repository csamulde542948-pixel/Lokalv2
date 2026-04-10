import { GraphQLContext } from "../context";
import { sendJobApplicationEmail } from "../../services/email";
import { awardXp } from "../../services/xp";

export const jobResolvers = {
  Query: {
    jobs: async (
      _: unknown,
      {
        limit = 20,
        offset = 0,
        filter,
        search,
      }: { limit?: number; offset?: number; filter?: string; search?: string },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 50);
      const where: any = { isActive: true };

      if (filter === "FULL_TIME") where.type = "FULL_TIME";
      if (filter === "FEATURED") where.isFeatured = true;
      if (filter === "REMOTE") {
        where.tags = { some: { tag: { name: { contains: "Remote", mode: "insensitive" } } } };
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { shortDesc: { contains: search, mode: "insensitive" } },
        ];
      }

      const [total, jobs] = await Promise.all([
        prisma.job.count({ where }),
        prisma.job.findMany({
          where,
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: safeLimit + 1,
          skip: offset,
          include: {
            postedBy: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        }),
      ]);

      return {
        jobs: jobs.slice(0, safeLimit),
        hasMore: jobs.length > safeLimit,
        nextOffset: offset + safeLimit,
        total,
      };
    },

    job: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      return prisma.job.findUnique({
        where: { id },
        include: {
          postedBy: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    myJobApplications: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      return prisma.jobApplication.findMany({
        where: { applicantId: user.id },
        include: {
          job: {
            include: { postedBy: { include: { rank: true } }, tags: { include: { tag: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },

    savedJobs: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const saved = await prisma.savedJob.findMany({
        where: { profileId: user.id },
        include: {
          job: {
            include: { postedBy: { include: { rank: true } }, tags: { include: { tag: true } } },
          },
        },
      });
      return saved.map((s: any) => s.job);
    },
  },

  Mutation: {
    createJob: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const tagNames: string[] = input.tags ?? [];
      const tagRecords = await Promise.all(
        tagNames.map((name: string) =>
          prisma.tag.upsert({ where: { name }, create: { name }, update: {} })
        )
      );

      const job = await prisma.job.create({
        data: {
          postedById: user.id,
          title: input.title,
          company: input.company,
          companyLogoUrl: input.companyLogoUrl,
          location: input.location,
          type: input.type,
          salary: input.salary,
          shortDesc: input.shortDesc,
          fullDesc: input.fullDesc,
          applyEmail: input.applyEmail,
          isFeatured: input.isFeatured ?? false,
          tags: { create: tagRecords.map((t: any) => ({ tagId: t.id })) },
        },
        include: {
          postedBy: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      awardXp(user.id, "CREATE_JOB").catch(console.error);
      return job;
    },

    updateJob: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const job = await prisma.job.findUnique({ where: { id } });
      if (job?.postedById !== user.id) throw new Error("Forbidden");

      // Medium #14: Whitelist — never spread raw input directly into Prisma
      const allowed = [
        "title", "company", "companyLogoUrl", "location", "type",
        "salary", "shortDesc", "fullDesc", "applyEmail", "isActive", "tags",
      ] as const;
      type AllowedKey = typeof allowed[number];
      const safeData = Object.fromEntries(
        allowed
          .filter((k): k is AllowedKey => k in input)
          .map((k) => [k, input[k]])
      );

      return prisma.job.update({
        where: { id },
        data: { ...safeData, updatedAt: new Date() },
        include: { postedBy: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    deleteJob: async (
      _: unknown,
      { id }: { id: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const job = await prisma.job.findUnique({ where: { id } });
      if (job?.postedById !== user.id) throw new Error("Forbidden");
      await prisma.job.delete({ where: { id } });
      return true;
    },

    applyToJob: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const application = await prisma.jobApplication.create({
        data: {
          jobId: input.jobId,
          applicantId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          portfolioUrl: input.portfolioUrl,
          resumeUrl: input.resumeUrl,
          coverLetter: input.coverLetter,
        },
        include: {
          job: {
            include: { postedBy: { include: { rank: true } }, tags: { include: { tag: true } } },
          },
          applicant: { include: { rank: true } },
        },
      });

      // Increment applicant counter on job
      await prisma.job.update({
        where: { id: input.jobId },
        data: { applicantsCount: { increment: 1 } },
      });

      // Send confirmation email to applicant
      sendJobApplicationEmail(
        input.email,
        `${input.firstName} ${input.lastName}`,
        application.job.title,
        application.job.company
      ).catch(console.error);

      return application;
    },

    saveJob: async (
      _: unknown,
      { jobId }: { jobId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.savedJob.upsert({
        where: { jobId_profileId: { jobId, profileId: user.id } },
        create: { jobId, profileId: user.id },
        update: {},
      });
      return prisma.job.findUnique({
        where: { id: jobId },
        include: { postedBy: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    unsaveJob: async (
      _: unknown,
      { jobId }: { jobId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.savedJob.deleteMany({ where: { jobId, profileId: user.id } });
      return prisma.job.findUnique({
        where: { id: jobId },
        include: { postedBy: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },
  },

  Job: {
    tags: async (parent: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const jt = await prisma.jobTag.findMany({
        where: { jobId: parent.id },
        include: { tag: true },
      });
      return jt.map((j: any) => j.tag);
    },

    savedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const saved = await prisma.savedJob.findUnique({
        where: { jobId_profileId: { jobId: parent.id, profileId: user.id } },
      });
      return !!saved;
    },
  },
};
