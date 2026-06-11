import { syncPostToRecombee } from "../lib/recombee";

type PrismaLike = {
  post: {
    findUnique: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

export type PostIntelligenceMetadata = {
  postType: string;
  topicTags: string[];
  intentTags: string[];
  language: string;
  hasLink: boolean;
  linkDomain: string | null;
  engagementScore: number;
  qualityScore: number;
  visibility: string;
  isDeleted: boolean;
  moderationStatus: string;
  isSensitive: boolean;
};

const NVIDIA_POST_ANALYSIS_MODEL =
  process.env.NVIDIA_POST_ANALYSIS_MODEL ?? "google/diffusiongemma-26b-a4b-it";
const NVIDIA_POST_ANALYSIS_TIMEOUT_MS = 20_000;

const TOPIC_KEYWORDS: Array<[string, RegExp]> = [
  ["ai", /\b(ai|llm|gpt|model|prompt|agent|machine learning|ml)\b/i],
  ["dev", /\b(code|coding|developer|typescript|javascript|react|node|api|backend|frontend|bug|deploy)\b/i],
  ["startup", /\b(startup|founder|launch|mvp|saas|product|customers|revenue|pricing)\b/i],
  ["design", /\b(design|ui|ux|brand|landing page|figma|layout|typography|color)\b/i],
  ["growth", /\b(growth|marketing|seo|sales|distribution|viral|analytics)\b/i],
  ["career", /\b(job|hiring|career|resume|interview|work)\b/i],
  ["community", /\b(community|meetup|event|team|collab|feedback)\b/i],
];

const INTENT_KEYWORDS: Array<[string, RegExp]> = [
  ["seeking_feedback", /\b(feedback|roast|review|thoughts|what do you think|critique)\b/i],
  ["asking_help", /\?|(?:\bhelp\b|\bhow do i\b|\bhow to\b|\banyone know\b|\bstuck\b)/i],
  ["sharing_resource", /\b(resource|guide|template|repo|link|article|tool|library)\b/i],
  ["showing_progress", /\b(shipped|launched|built|made|released|demo|update|progress)\b/i],
  ["hiring_or_collab", /\b(hiring|looking for|collab|cofounder|partner|join us)\b/i],
];

function uniqueLimited(values: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value
      .trim()
      .toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function extractFirstLink(content: string) {
  const match = content.match(/https?:\/\/[^\s)\]]+/i);
  if (!match) return { hasLink: false, linkDomain: null };

  try {
    const hostname = new URL(match[0]).hostname.replace(/^www\./i, "").toLowerCase();
    return { hasLink: true, linkDomain: hostname.slice(0, 120) };
  } catch {
    return { hasLink: true, linkDomain: null };
  }
}

function detectLanguage(content: string) {
  const lower = content.toLowerCase();
  const hasTagalog = /\b(ako|ikaw|kami|kayo|sila|lang|naman|ba|po|opo|salamat|mag|para|kasi|pero|gusto|pwede|hindi)\b/.test(lower);
  const hasCebuano = /\b(unsa|ngano|kaayo|dili|kani|karon|mao|nindot|pwede ba)\b/.test(lower);
  const hasEnglish = /\b(the|and|for|with|this|that|how|what|why|ship|build|launch)\b/.test(lower);

  if ((hasTagalog || hasCebuano) && hasEnglish) return "mixed";
  if (hasCebuano) return "ceb";
  if (hasTagalog) return "tl";
  if (hasEnglish) return "en";
  return "mixed";
}

function inferPostType(post: any, topicTags: string[], intentTags: string[]) {
  const content = String(post.content ?? "");
  const tagNames = (post.tags ?? []).map((entry: any) => entry.tag?.name?.toLowerCase()).filter(Boolean);
  if (tagNames.includes("roast")) return "roast";
  if (post.originalPostId) return "share";
  if (post.projectId || post.projectName) return "launch";
  if (intentTags.includes("asking_help")) return "question";
  if (intentTags.includes("sharing_resource")) return "resource";
  if (/\b(poll|vote)\b/i.test(content)) return "poll";
  if (topicTags.includes("design") && intentTags.includes("seeking_feedback")) return "feedback_request";
  return "post";
}

function computeEngagementScore(post: any) {
  const fireCount = Number(post.roastReactionCount ?? 0) + Number(post.likesCount ?? 0);
  return (
    fireCount * 1.25 +
    Number(post.commentsCount ?? 0) * 2 +
    Number(post.sharesCount ?? 0) * 3 +
    Number(post.bookmarksCount ?? 0) * 4 +
    Math.min(Number(post.viewsCount ?? 0), 500) * 0.03
  );
}

function computeQualityScore(post: any, topicTags: string[], intentTags: string[]) {
  const content = String(post.content ?? "").trim();
  let score = 0.35;
  if (content.length >= 80) score += 0.15;
  if (content.length >= 220) score += 0.1;
  if (topicTags.length > 0) score += 0.1;
  if (intentTags.length > 0) score += 0.1;
  if (post.imageUrl || post.imageUrls?.length) score += 0.05;
  if (post.projectId || post.projectName) score += 0.05;
  if (Number(post.commentsCount ?? 0) > 0) score += 0.05;
  if (Number(post.sharesCount ?? 0) > 0) score += 0.05;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

export function inferPostMetadata(post: any): PostIntelligenceMetadata {
  const content = String(post.content ?? "");
  const tagNames = (post.tags ?? []).map((entry: any) => entry.tag?.name ?? "").filter(Boolean);
  const topicTags = uniqueLimited([
    ...tagNames,
    ...TOPIC_KEYWORDS.filter(([, pattern]) => pattern.test(content)).map(([tag]) => tag),
  ], 12);
  const intentTags = uniqueLimited(
    INTENT_KEYWORDS.filter(([, pattern]) => pattern.test(content)).map(([tag]) => tag),
    8
  );
  const link = extractFirstLink(content);
  const postType = inferPostType(post, topicTags, intentTags);

  return {
    postType,
    topicTags,
    intentTags,
    language: detectLanguage(content),
    hasLink: link.hasLink,
    linkDomain: link.linkDomain,
    engagementScore: computeEngagementScore(post),
    qualityScore: computeQualityScore(post, topicTags, intentTags),
    visibility: "public",
    isDeleted: false,
    moderationStatus: "approved",
    isSensitive: false,
  };
}

function parseAnalysisJson(text: string): Partial<PostIntelligenceMetadata> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function analyzeWithNvidia(post: any, fallback: PostIntelligenceMetadata) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.startsWith("nvapi-your")) return fallback;

  const imageUrls = [post.imageUrl, ...(post.imageUrls ?? [])]
    .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
    .slice(0, 3);

  const text = [
    "Analyze this Lokalhost social post for recommendation metadata.",
    "Return strict JSON only with these keys:",
    "postType, topicTags, intentTags, language, qualityScore, isSensitive, moderationStatus.",
    "Allowed postType examples: post, roast, question, launch, resource, feedback_request, share, poll.",
    "Allowed moderationStatus: approved, pending, reported, blocked.",
    "Use concise lowercase snake_case tags. qualityScore must be 0..1.",
    "",
    `Content: ${String(post.content ?? "").slice(0, 4000)}`,
    `Existing tags: ${(post.tags ?? []).map((entry: any) => entry.tag?.name).filter(Boolean).join(", ") || "none"}`,
    `Has image: ${Boolean(post.imageUrl || post.imageUrls?.length)}`,
  ].join("\n");

  const content: any[] = [{ type: "text", text }];
  for (const url of imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
        "X-Title": "Lokal Post Intelligence",
      },
      body: JSON.stringify({
        model: NVIDIA_POST_ANALYSIS_MODEL,
        messages: [
          {
            role: "system",
            content: "You classify social posts for a recommendation engine. Return strict JSON only.",
          },
          { role: "user", content },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(NVIDIA_POST_ANALYSIS_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn("[post-intelligence] NVIDIA analysis failed:", res.status, await res.text());
      return fallback;
    }

    const body = await res.json();
    const parsed = parseAnalysisJson(body?.choices?.[0]?.message?.content ?? "");
    if (!parsed) return fallback;

    return {
      ...fallback,
      postType: typeof parsed.postType === "string" ? parsed.postType : fallback.postType,
      topicTags: uniqueLimited(Array.isArray(parsed.topicTags) ? parsed.topicTags : fallback.topicTags, 12),
      intentTags: uniqueLimited(Array.isArray(parsed.intentTags) ? parsed.intentTags : fallback.intentTags, 8),
      language: typeof parsed.language === "string" ? parsed.language.slice(0, 16) : fallback.language,
      qualityScore: typeof parsed.qualityScore === "number"
        ? Math.max(0, Math.min(1, parsed.qualityScore))
        : fallback.qualityScore,
      isSensitive: typeof parsed.isSensitive === "boolean" ? parsed.isSensitive : fallback.isSensitive,
      moderationStatus: typeof parsed.moderationStatus === "string"
        ? parsed.moderationStatus
        : fallback.moderationStatus,
    } satisfies PostIntelligenceMetadata;
  } catch (error) {
    console.warn("[post-intelligence] NVIDIA analysis skipped:", (error as any)?.message ?? error);
    return fallback;
  }
}

async function loadPost(prisma: PrismaLike, postId: string) {
  return prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: { include: { rank: true } },
      tags: { include: { tag: true } },
    },
  });
}

export async function analyzeAndSyncPost(prisma: PrismaLike, postId: string) {
  const post = await loadPost(prisma, postId);
  if (!post) return;

  const fallback = inferPostMetadata(post);
  const metadata = await analyzeWithNvidia(post, fallback);
  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...metadata,
      lastActivityAt: new Date(),
    },
    include: {
      author: { include: { rank: true } },
      tags: { include: { tag: true } },
    },
  });

  await syncPostToRecombee({
    id: updated.id,
    authorId: updated.authorId,
    content: updated.content,
    createdAt: updated.createdAt,
    postType: updated.postType,
    topicTags: updated.topicTags,
    intentTags: updated.intentTags,
    language: updated.language,
    lastActivityAt: updated.lastActivityAt,
    feedVisibility: "MAIN_FEED",
    visibility: updated.visibility,
    rootPostId: updated.id,
    parentPostId: null,
    depth: 0,
    imageUrl: updated.imageUrl,
    imageUrls: updated.imageUrls,
    hasLink: updated.hasLink,
    linkDomain: updated.linkDomain,
    likesCount: updated.likesCount,
    fireCount: updated.roastReactionCount + updated.likesCount,
    commentsCount: updated.commentsCount,
    sharesCount: updated.sharesCount,
    bookmarksCount: updated.bookmarksCount,
    viewsCount: updated.viewsCount,
    engagementScore: updated.engagementScore,
    qualityScore: updated.qualityScore,
    isDeleted: updated.isDeleted,
    moderationStatus: updated.moderationStatus,
    isSensitive: updated.isSensitive,
    isAuthorVerified: !!updated.author?.isVerified,
  });
}

export function schedulePostIntelligence(prisma: PrismaLike, postId: string) {
  analyzeAndSyncPost(prisma, postId).catch((error) => {
    console.error("[post-intelligence] analyzeAndSyncPost failed:", error);
  });
}

export async function refreshPostActivityMetadata(prisma: PrismaLike, postId: string) {
  const post = await loadPost(prisma, postId);
  if (!post) return;
  const metadata = inferPostMetadata(post);
  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      engagementScore: metadata.engagementScore,
      lastActivityAt: new Date(),
      hasLink: metadata.hasLink,
      linkDomain: metadata.linkDomain,
    },
    include: {
      author: { include: { rank: true } },
      tags: { include: { tag: true } },
    },
  });

  await syncPostToRecombee({
    id: updated.id,
    authorId: updated.authorId,
    content: updated.content,
    createdAt: updated.createdAt,
    postType: updated.postType,
    topicTags: updated.topicTags,
    intentTags: updated.intentTags,
    language: updated.language,
    lastActivityAt: updated.lastActivityAt,
    feedVisibility: "MAIN_FEED",
    visibility: updated.visibility,
    rootPostId: updated.id,
    parentPostId: null,
    depth: 0,
    imageUrl: updated.imageUrl,
    imageUrls: updated.imageUrls,
    hasLink: updated.hasLink,
    linkDomain: updated.linkDomain,
    likesCount: updated.likesCount,
    fireCount: updated.roastReactionCount + updated.likesCount,
    commentsCount: updated.commentsCount,
    sharesCount: updated.sharesCount,
    bookmarksCount: updated.bookmarksCount,
    viewsCount: updated.viewsCount,
    engagementScore: updated.engagementScore,
    qualityScore: updated.qualityScore,
    isDeleted: updated.isDeleted,
    moderationStatus: updated.moderationStatus,
    isSensitive: updated.isSensitive,
    isAuthorVerified: !!updated.author?.isVerified,
  });
}

export function schedulePostActivityRefresh(prisma: PrismaLike, postId: string) {
  refreshPostActivityMetadata(prisma, postId).catch((error) => {
    console.error("[post-intelligence] refreshPostActivityMetadata failed:", error);
  });
}
