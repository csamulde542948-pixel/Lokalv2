import type { PrismaClient } from "@prisma/client";
import { sanitizeInput } from "../middleware/security";
import { createNotification } from "../lib/notifications";

type PrismaLike = PrismaClient | any;

type TriggerKind = "post" | "comment";

type TriggerArgs = {
  prisma: PrismaLike;
  triggerKind: TriggerKind;
  postId: string;
  commentId?: string | null;
  content: string;
  authorId: string;
};

type ContextType =
  | "meme"
  | "technical"
  | "bug"
  | "feedback"
  | "launch"
  | "casual"
  | "heated"
  | "image"
  | "video";

const DEFAULT_MODEL = "google/diffusiongemma-26b-a4b-it";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BOT_HANDLE = "ngek";
const DEFAULT_BOT_DISPLAY_NAME = "Ngek The Great Bot";
const MAX_CONTEXT_COMMENTS = 20;
const MAX_IMAGE_URLS = 4;

function getBotConfig() {
  const profileId = process.env.LOKAL_BOT_PROFILE_ID?.trim();
  const rawHandle = process.env.LOKAL_BOT_HANDLE?.trim();
  const displayName = process.env.LOKAL_BOT_DISPLAY_NAME?.trim() || DEFAULT_BOT_DISPLAY_NAME;
  const handle = (rawHandle || DEFAULT_BOT_HANDLE).replace(/^@/, "").toLowerCase();

  return { profileId, handle, displayName };
}

async function resolveBotProfile(prisma: PrismaLike, config: ReturnType<typeof getBotConfig>) {
  if (config.profileId) {
    const byId = await prisma.profile.findUnique({
      where: { id: config.profileId },
      select: { id: true, username: true, displayName: true, name: true },
    });
    if (byId) return byId;
  }

  return prisma.profile.findUnique({
    where: { username: config.handle },
    select: { id: true, username: true, displayName: true, name: true },
  });
}

function containsBotMention(content: string, handle: string) {
  const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^a-zA-Z0-9_])@${escaped}(?=$|[^a-zA-Z0-9_])`, "i");
  return pattern.test(content);
}

function compact(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function usernameForMention(profile: any) {
  const username = String(profile?.username ?? "")
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 50);
  return username || null;
}

function ensureCallerMention(content: string, callerUsername: string | null) {
  if (!callerUsername) return content;
  const mention = `@${callerUsername}`;
  const trimmed = content.trim();
  if (new RegExp(`(^|\\s)@${callerUsername}(?=$|\\s|[,.!?;:])`, "i").test(trimmed)) {
    return trimmed;
  }
  return `${mention} ${trimmed}`;
}

function detectContextType(args: {
  post: any;
  triggerContent: string;
  comments: any[];
}): ContextType {
  const text = [
    args.post.content,
    args.triggerContent,
    args.comments.map((comment) => comment.content).join(" "),
  ].join(" ").toLowerCase();

  if (args.post.videoUrl) return "video";
  if (args.post.imageUrl || args.post.imageUrls?.length) return "image";
  if (/\b(lol|lmao|haha|meme|joke|funny)\b/i.test(text)) return "meme";
  if (/\b(bug|error|crash|broken|stack trace|exception|failed|debug|fix)\b/i.test(text)) return "bug";
  if (/\b(feedback|roast|critique|review|thoughts|landing page|ui|ux)\b/i.test(text)) return "feedback";
  if (/\b(shipped|launched|release|demo|try it|live now|built)\b/i.test(text)) return "launch";
  if (/\b(react|typescript|javascript|node|api|backend|frontend|database|deploy|code|repo|llm|ai)\b/i.test(text)) return "technical";
  if (/\b(stupid|idiot|scam|hate|trash|angry|fight|wtf)\b/i.test(text)) return "heated";
  return "casual";
}

function personaInstructions(contextType: ContextType) {
  const shared = [
    "You are the official Lokalhost AI bot.",
    "Respond like a sharp, friendly builder in a developer community.",
    "Be useful, concise, and specific. Do not sound corporate or robotic.",
    "Do not claim private knowledge. Use only the context provided.",
    "If the user asks for a public reply, keep it suitable as a comment.",
  ].join(" ");

  const styles: Record<ContextType, string> = {
    meme: "The context is playful or meme-like. Be witty and brief, but do not force jokes.",
    technical: "The context is technical. Give practical builder-to-builder guidance with concrete next steps.",
    bug: "The context is a bug or debugging thread. Diagnose likely causes and ask for the missing detail if needed.",
    feedback: "The context is asking for feedback. Be honest, specific, and constructive.",
    launch: "The context is a launch or shipped update. Be supportive, then offer one sharp improvement or next step.",
    casual: "The context is casual/community conversation. Be warm, light, and natural.",
    heated: "The context may be tense. Stay calm, neutral, and de-escalating.",
    image: "The post includes images. Use visual context when available and avoid overclaiming if the image is unclear.",
    video: "The post includes a video. Use the video URL and surrounding text as context; do not pretend you watched frames unless described.",
  };

  return `${shared}\n\nTone for this reply: ${styles[contextType]}`;
}

function buildPrompt(args: {
  botHandle: string;
  post: any;
  triggerKind: TriggerKind;
  triggerComment?: any | null;
  comments: any[];
}) {
  const post = args.post;
  const tags = (post.tags ?? [])
    .map((entry: any) => entry.tag?.name)
    .filter(Boolean)
    .join(", ");

  const commentLines = args.comments.map((comment: any, index: number) => {
    const author = comment.author?.username || comment.author?.displayName || comment.author?.name || "user";
    return `${index + 1}. @${author}: ${compact(comment.content, 300)}`;
  });

  return [
    `A Lokalhost user mentioned @${args.botHandle}. Reply to that mention as the official bot.`,
    "",
    "Post context:",
    `Author: @${post.author?.username || "unknown"}`,
    `Content: ${compact(post.content, 1400) || "(no text)"}`,
    `Project: ${compact(post.projectName, 160) || "none"}`,
    `Tags: ${tags || "none"}`,
    `Counts: ${post.likesCount ?? 0} likes, ${post.commentsCount ?? 0} comments, ${post.sharesCount ?? 0} shares, ${post.viewsCount ?? 0} views`,
    `Video URL: ${post.videoUrl || "none"}`,
    "",
    args.triggerComment
      ? `Mentioning comment by @${args.triggerComment.author?.username || "unknown"}: ${compact(args.triggerComment.content, 700)}`
      : `Mentioning post text: ${compact(post.content, 700) || "(no text)"}`,
    "",
    "Recent thread comments:",
    commentLines.length ? commentLines.join("\n") : "No comments yet.",
    "",
    "Write one helpful public comment. Default to 1-4 short sentences. If the mention asks for a list or deeper analysis, you may be a little longer.",
  ].join("\n");
}

async function askNvidia(args: {
  system: string;
  prompt: string;
  imageUrls: string[];
}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.startsWith("nvapi-your")) return null;

  const model = process.env.NVIDIA_POST_BOT_MODEL || DEFAULT_MODEL;
  const timeoutMs = Number(process.env.NVIDIA_POST_BOT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const content: any[] = [];
  for (const url of args.imageUrls) {
    content.push({ type: "image_url", image_url: { url } });
  }
  content.push({ type: "text", text: args.prompt });

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
      "X-Title": "Lokalhost AI Bot",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `<|think|>\n${args.system}` },
        { role: "user", content },
      ],
      temperature: 0.75,
      top_p: 0.9,
      max_tokens: 700,
      chat_template_kwargs: { enable_thinking: true },
    }),
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    console.warn("[lokal-bot] NVIDIA request failed:", response.status, await response.text());
    return null;
  }

  const body = await response.json();
  const answer = body?.choices?.[0]?.message?.content;
  if (typeof answer !== "string") return null;
  return answer
    .replace(/<\|channel\>thought[\s\S]*?(?:<channel\|>|<\|channel\>)/gi, "")
    .replace(/<\|[^>]+?\|>/g, "")
    .trim()
    .slice(0, 2000);
}

async function hasRecentRateLimitHit(prisma: PrismaLike, authorId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [hourCount, dayCount] = await Promise.all([
    prisma.userActionEvent.count({
      where: { profileId: authorId, action: "AI_BOT_MENTION", createdAt: { gte: oneHourAgo } },
    }),
    prisma.userActionEvent.count({
      where: { profileId: authorId, action: "AI_BOT_MENTION", createdAt: { gte: oneDayAgo } },
    }),
  ]);
  return hourCount >= 10 || dayCount >= 40;
}

async function loadContext(prisma: PrismaLike, postId: string, commentId?: string | null) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      tags: { include: { tag: true } },
    },
  });
  if (!post) return null;

  const [triggerComment, comments] = await Promise.all([
    commentId
      ? prisma.postComment.findUnique({
          where: { id: commentId },
          include: { author: true, parent: { include: { author: true } } },
        })
      : Promise.resolve(null),
    prisma.postComment.findMany({
      where: { postId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: MAX_CONTEXT_COMMENTS,
    }),
  ]);

  return { post, triggerComment, comments: comments.reverse() };
}

async function createBotComment(args: {
  prisma: PrismaLike;
  postId: string;
  botProfileId: string;
  content: string;
  callerId: string;
  triggerComment?: any | null;
}) {
  const flatParentId = args.triggerComment
    ? args.triggerComment.parentId ?? args.triggerComment.id
    : null;
  const depth = flatParentId ? 2 : 1;

  return args.prisma.$transaction(async (tx: any) => {
    const comment = await tx.postComment.create({
      data: {
        postId: args.postId,
        authorId: args.botProfileId,
        content: args.content,
        parentId: flatParentId,
        rootPostId: args.postId,
        depth,
        feedVisibility: "THREAD_ONLY",
        mentions: [args.callerId],
      },
    });

    await tx.post.update({
      where: { id: args.postId },
      data: { commentsCount: { increment: 1 }, lastActivityAt: new Date() },
    });

    return comment;
  });
}

export function scheduleLokalBotMentionReply(args: TriggerArgs) {
  void processLokalBotMention(args).catch((error) => {
    console.error("[lokal-bot] Failed to process mention:", error);
  });
}

export async function processLokalBotMention(args: TriggerArgs) {
  const config = getBotConfig();
  if (!process.env.NVIDIA_API_KEY) {
    console.warn("[lokal-bot] Skipping mention reply: NVIDIA_API_KEY is not configured");
    return;
  }
  if (!containsBotMention(args.content, config.handle)) return;
  const botProfile = await resolveBotProfile(args.prisma, config);
  if (!botProfile) {
    console.warn(`[lokal-bot] Skipping mention reply: bot profile @${config.handle} was not found`);
    return;
  }
  if (args.authorId === botProfile.id) return;

  const targetId = `${args.triggerKind}:${args.commentId ?? args.postId}`;
  const existingReply = await args.prisma.userActionEvent.count({
    where: {
      profileId: botProfile.id,
      action: { in: ["AI_BOT_REPLY_PENDING", "AI_BOT_REPLY"] },
      targetId,
    },
  });
  if (existingReply > 0) return;

  if (await hasRecentRateLimitHit(args.prisma, args.authorId)) {
    console.warn("[lokal-bot] Skipping mention reply: rate limit hit for", args.authorId);
    return;
  }

  await args.prisma.userActionEvent.create({
    data: {
      profileId: args.authorId,
      action: "AI_BOT_MENTION",
      targetId,
      metadata: { triggerKind: args.triggerKind },
    },
  });
  await args.prisma.userActionEvent.create({
    data: {
      profileId: botProfile.id,
      action: "AI_BOT_REPLY_PENDING",
      targetId,
      metadata: { triggerKind: args.triggerKind },
    },
  });

  const context = await loadContext(args.prisma, args.postId, args.commentId);
  if (!context) return;

  const { post, triggerComment, comments } = context;
  if (post.isDeleted || post.visibility !== "public" || post.moderationStatus !== "approved") return;
  if (triggerComment && triggerComment.authorId === botProfile.id) return;
  const caller = triggerComment?.author ?? post.author;

  const contextType = detectContextType({
    post,
    triggerContent: args.content,
    comments,
  });
  const imageUrls = [post.imageUrl, ...(post.imageUrls ?? [])]
    .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url))
    .slice(0, MAX_IMAGE_URLS);

  const answer = await askNvidia({
    system: personaInstructions(contextType),
    prompt: buildPrompt({
      botHandle: config.handle,
      post,
      triggerKind: args.triggerKind,
      triggerComment,
      comments,
    }),
    imageUrls,
  });
  if (!answer) return;

  const duplicateCheck = await args.prisma.userActionEvent.count({
    where: {
      profileId: botProfile.id,
      action: "AI_BOT_REPLY",
      targetId,
    },
  });
  if (duplicateCheck > 0) return;

  const botComment = await createBotComment({
    prisma: args.prisma,
    postId: args.postId,
    botProfileId: botProfile.id,
    callerId: args.authorId,
    content: sanitizeInput(ensureCallerMention(answer, usernameForMention(caller))),
    triggerComment,
  });
  await createNotification(args.prisma, {
    recipientId: args.authorId,
    actorId: botProfile.id,
    type: "MENTION",
    postId: args.postId,
    entityId: botComment.id,
    message: `replied to your @${config.handle} mention`,
  }).catch((error) => {
    console.error("[lokal-bot] Failed to notify mention caller:", error);
  });

  await args.prisma.userActionEvent.create({
    data: {
      profileId: botProfile.id,
      action: "AI_BOT_REPLY",
      targetId,
      metadata: {
        triggerKind: args.triggerKind,
        contextType,
        model: process.env.NVIDIA_POST_BOT_MODEL || DEFAULT_MODEL,
        commentId: botComment.id,
      },
    },
  });
}
