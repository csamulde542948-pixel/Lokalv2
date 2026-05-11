import "./env"; // MUST be first — loads dotenv before any other module reads process.env
import express from "express";
import http from "http";
import dns from "dns/promises";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import DataLoader from "dataloader";

import depthLimit from "graphql-depth-limit";
import { typeDefs } from "./graphql/typedefs";
import { resolvers } from "./graphql/resolvers";
import { prisma } from "./lib/prisma";
import { supabase as supabaseAdmin } from "./lib/supabase";
import { authMiddleware, AuthenticatedRequest } from "./middleware/auth";
import { GraphQLContext } from "./graphql/context";
import {
  generalRateLimiter,
  authRateLimiter,
  mutationRateLimiter,
  preLoginCheck,
  recordFailedLogin,
  recordSuccessfulLogin,
  logSecurityEvent,
  isValidEmail,
  validatePassword,
} from "./middleware/security";

const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PRODUCTION = NODE_ENV === "production";
const IS_STAGING = NODE_ENV === "staging";
// Staging behaves like production for security (helmet, CORS, error masking)
// but allows introspection and verbose logging for debugging.
const IS_DEPLOYED = IS_PRODUCTION || IS_STAGING;

// ─── DataLoader factories ────────────────────────────────────────────────────

function createProfileLoader() {
  return new DataLoader(async (ids: readonly (string | null | undefined)[]) => {
    const validIds = ids.filter((id): id is string => !!id);
    const profiles = validIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: validIds } },
          include: { rank: true },
        })
      : [];
    const map = new Map(profiles.map((p: any) => [p.id, p]));
    return ids.map((id) => (id ? map.get(id) ?? null : null));
  });
}

function createPostLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const posts = await prisma.post.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(posts.map((p: any) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

function createProjectLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const projects = await prisma.project.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(projects.map((p: any) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
  });
}

// ─── Batch count/relation loaders (fix N+1 on Profile & Post field resolvers) ─

function createFollowersCountLoader() {
  return new DataLoader(async (profileIds: readonly string[]) => {
    const counts = await prisma.follow.groupBy({
      by: ["followingId"],
      where: { followingId: { in: [...profileIds] } },
      _count: { followingId: true },
    });
    const map = new Map(counts.map((c: any) => [c.followingId, c._count.followingId]));
    return profileIds.map((id) => map.get(id) ?? 0);
  });
}

function createFollowingCountLoader() {
  return new DataLoader(async (profileIds: readonly string[]) => {
    const counts = await prisma.follow.groupBy({
      by: ["followerId"],
      where: { followerId: { in: [...profileIds] } },
      _count: { followerId: true },
    });
    const map = new Map(counts.map((c: any) => [c.followerId, c._count.followerId]));
    return profileIds.map((id) => map.get(id) ?? 0);
  });
}

function createIsFollowedByMeLoader(userId: string | null) {
  return new DataLoader(async (profileIds: readonly string[]) => {
    if (!userId) return profileIds.map(() => false);
    const follows = await prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: [...profileIds] } },
      select: { followingId: true },
    });
    const set = new Set(follows.map((f: any) => f.followingId));
    return profileIds.map((id) => set.has(id));
  });
}

function createPostsCountLoader() {
  return new DataLoader(async (profileIds: readonly string[]) => {
    const counts = await prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: [...profileIds] } },
      _count: { authorId: true },
    });
    const map = new Map(counts.map((c: any) => [c.authorId, c._count.authorId]));
    return profileIds.map((id) => map.get(id) ?? 0);
  });
}

function createProjectsCountLoader() {
  return new DataLoader(async (profileIds: readonly string[]) => {
    const counts = await prisma.project.groupBy({
      by: ["authorId"],
      where: { authorId: { in: [...profileIds] }, visibility: "PUBLIC" },
      _count: { authorId: true },
    });
    const map = new Map(counts.map((c: any) => [c.authorId, c._count.authorId]));
    return profileIds.map((id) => map.get(id) ?? 0);
  });
}

function createPostTagsLoader() {
  return new DataLoader(async (postIds: readonly string[]) => {
    const postTags = await prisma.postTag.findMany({
      where: { postId: { in: [...postIds] } },
      include: { tag: true },
    });
    const map = new Map<string, any[]>();
    for (const pt of postTags) {
      const arr = map.get(pt.postId) ?? [];
      arr.push((pt as any).tag);
      map.set(pt.postId, arr);
    }
    return postIds.map((id) => map.get(id) ?? []);
  });
}

function createPostLikedByMeLoader(userId: string | null) {
  return new DataLoader(async (postIds: readonly string[]) => {
    if (!userId) return postIds.map(() => false);
    const likes = await prisma.postLike.findMany({
      where: { postId: { in: [...postIds] }, profileId: userId },
      select: { postId: true },
    });
    const set = new Set(likes.map((l: any) => l.postId));
    return postIds.map((id) => set.has(id));
  });
}

function createPostMyReactionLoader(userId: string | null) {
  return new DataLoader(async (postIds: readonly string[]) => {
    if (!userId) return postIds.map(() => null);
    const likes = await prisma.postLike.findMany({
      where: { postId: { in: [...postIds] }, profileId: userId },
      select: { postId: true, reaction: true },
    });
    const map = new Map(likes.map((l: any) => [l.postId, l.reaction ?? null]));
    return postIds.map((id) => map.get(id) ?? null);
  });
}

function createOriginalPostLoader() {
  return new DataLoader(async (postIds: readonly string[]) => {
    const posts = await prisma.post.findMany({
      where: { id: { in: [...postIds] } },
      include: {
        author: { include: { rank: true } },
        tags: { include: { tag: true } },
      },
    });
    const map = new Map(posts.map((p: any) => [p.id, p]));
    return postIds.map((id) => map.get(id) ?? null);
  });
}

function createCommentLikedByMeLoader(userId: string | null) {
  return new DataLoader(async (commentIds: readonly string[]) => {
    if (!userId) return commentIds.map(() => false);
    const likes = await prisma.commentLike.findMany({
      where: { commentId: { in: [...commentIds] }, profileId: userId },
      select: { commentId: true },
    });
    const set = new Set(likes.map((l: any) => l.commentId));
    return commentIds.map((id) => set.has(id));
  });
}

function createCommentMyReactionLoader(userId: string | null) {
  return new DataLoader(async (commentIds: readonly string[]) => {
    if (!userId) return commentIds.map(() => null);
    const likes = await prisma.commentLike.findMany({
      where: { commentId: { in: [...commentIds] }, profileId: userId },
      select: { commentId: true, reaction: true },
    });
    const map = new Map(likes.map((l: any) => [l.commentId, l.reaction ?? null]));
    return commentIds.map((id) => map.get(id) ?? null);
  });
}

// ─── Apollo Server ───────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: !IS_PRODUCTION, // Enabled in dev + staging, disabled only in production
    validationRules: [depthLimit(7)], // Prevent deeply nested query DoS attacks
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError: any, error: unknown) => {
      console.error("[GraphQL Error]", error);
      // In production & staging, mask internal errors to avoid leaking stack traces / DB details
      if (IS_DEPLOYED) {
        const msg = formattedError.message ?? "";

        // Exact safe messages (auth, feature flags, etc.)
        const safeExact = [
          "Unauthorized", "Forbidden", "Not found",
          "Forbidden: admin role required",
          "Cannot follow yourself",
          "Chat service is not configured",
          "Chat token generation failed",
        ];

        // Prefix-based safe messages — user-facing errors from roast service,
        // rate limiters, and other business logic that should reach the client.
        const safePrefixes = [
          "Rate limit exceeded",
          "Too many roasts",
          "Roast queue timed out",
          "Firecrawl is currently at capacity",
          "You already roasted this URL",
          "No Firecrawl API keys",
          "FIRECRAWL_API_KEY",
          "OPENROUTER_API_KEY",
          "DeepSeek returned empty content",
          // URL validation / reachability errors
          "That website appears to be down",
          "We can't scrape that website",
          "We couldn't access that website",
          // SSRF / URL input validation
          "Invalid URL",
          "URL must use",
          "Requests to",
          // AbortSignal.timeout() throws a DOMException with this message
          // (belt-and-suspenders — roast.service should already catch this)
          "The operation was aborted",
          // Generic Firecrawl network failures
          "Firecrawl network error",
        ];

        const isAllowed =
          safeExact.includes(msg) ||
          safePrefixes.some((prefix) => msg.startsWith(prefix));

        const message = isAllowed ? msg : "Internal server error";
        return { message, locations: formattedError.locations, path: formattedError.path };
      }
      return formattedError;
    },
  });

  await server.start();

  // CORS: Lock down origins in deployed environments
  const allowedOrigins = IS_PRODUCTION
    ? [
        FRONTEND_URL,
        "https://lokalhost.club",
        "https://www.lokalhost.club",
        "https://lokalv2.vercel.app",
      ]
    : IS_STAGING
      ? [
          FRONTEND_URL,
          "https://studio.apollographql.com",
          // Allow all Vercel preview deployments for this project
          "https://lokalv2-git-staging-lokalhost.vercel.app",
        ]
      : [FRONTEND_URL, "https://studio.apollographql.com"];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, health checks)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow any Vercel preview deployment for this project in staging
        if (IS_STAGING && /^https:\/\/lokalv2(-[a-z0-9]+)*\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
    })
  );

  // ── Security headers via helmet ──────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: IS_DEPLOYED
        ? {
            directives: {
              defaultSrc: ["'none'"],
              scriptSrc: ["'none'"],
              styleSrc: ["'none'"],
              imgSrc: ["'none'"],
              connectSrc: ["'self'"],
              fontSrc: ["'none'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false, // Disabled in dev for Apollo Studio / playground
      crossOriginEmbedderPolicy: IS_DEPLOYED, // Enforce in staging + production
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin font/image loading
      hsts: IS_DEPLOYED
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    })
  );

  // Compress all responses (gzip/br) — reduces payload size by ~70%
  app.use(compression());

  // ── Rate limiting ────────────────────────────────────────────────────────
  app.use(generalRateLimiter);
  app.use("/graphql", mutationRateLimiter);

  app.use(express.json({ limit: "1mb" })); // Limit body size to prevent abuse
  app.use(authMiddleware);

  // ── Security REST Endpoints ──────────────────────────────────────────────

  /**
   * Low #25: CSRF protection for state-mutating REST endpoints.
   * Browsers always send a Content-Type header on cross-origin form/fetch POST requests,
   * but the Origin (or Referer) must match the expected frontend URL.
   * This blocks cross-site form submissions and <img> / <script> CSRF vectors.
   */
  function requireSameOrigin(req: any, res: any, next: any) {
    const origin = req.headers["origin"] as string | undefined;
    const referer = req.headers["referer"] as string | undefined;
    const contentType = (req.headers["content-type"] as string | undefined) ?? "";

    // Only enforce on JSON POST requests (our API contract)
    if (!contentType.includes("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    // In deployed environments require Origin to match the known frontend URL
    if (IS_DEPLOYED) {
      const source = origin ?? (referer ? new URL(referer).origin : null);
      if (!source || !allowedOrigins.includes(source)) {
        return res.status(403).json({ error: "Forbidden: cross-origin request" });
      }
    }

    next();
  }

  /**
   * POST /auth/pre-login-check
   * Body: { email: string }
   * Returns: { isLocked, lockoutMinutesRemaining, providerHint }
   *
   * Medium #15: We deliberately OMIT `accountExists` from the response.
   * Returning it would let anyone enumerate which emails are registered.
   * The frontend only needs to know: "is there a lockout or wrong provider?"
   * An attacker learns nothing new from the response shape either way.
   */
  app.post("/auth/pre-login-check", authRateLimiter, requireSameOrigin, async (req: any, res: any) => {
    try {
      const { email } = req.body;
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email is required" });
      }

      const check = await preLoginCheck(email);

      // Always return the same JSON shape regardless of whether the account exists.
      // Only populate providerHint / lockout fields when the account actually has them
      // — an attacker still can’t distinguish “account not found” from “account found, unlocked”.
      let providerHint: string | null = null;
      if (
        check.accountExists &&
        check.linkedProviders.length > 0 &&
        !check.linkedProviders.includes("email")
      ) {
        const oauthProvider = check.linkedProviders[0];
        providerHint = `This account was created with ${oauthProvider}. Please use "Continue with ${oauthProvider}" to log in.`;
      }

      // Never expose accountExists — always respond 200 with the same structure
      return res.json({
        isLocked: check.accountExists ? check.isLocked : false,
        lockoutMinutesRemaining: check.accountExists ? check.lockoutMinutesRemaining : 0,
        providerHint,
      });
    } catch (err) {
      console.error("[pre-login-check]", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * POST /auth/record-login
   * Headers: Authorization: Bearer <supabase_access_token>
   * Body: { email: string, success: boolean, provider?: string }
   *
   * Medium #16: Require a valid Supabase access token so that an unauthenticated
   * attacker cannot POST `success: false` for an arbitrary email and lock out accounts.
   *
   * Consequence: failed-login tracking (wrong password) can no longer be done here,
   * since there’s no token when auth fails. We record failures via Supabase Auth Hooks
   * or accept the trade-off. Successful logins still update the counter reset correctly.
   */
  app.post("/auth/record-login", authRateLimiter, requireSameOrigin, async (req: any, res: any) => {
    try {
      // Verify a valid Supabase JWT before doing anything
      const authHeader = req.headers.authorization as string | undefined;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) {
        return res.status(401).json({ error: "Authorization header required" });
      }

      // Validate token against Supabase and extract the email claim
      const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.getUser(token);
      if (sbError || !sbUser) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { email, success, provider } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      // Guard: only allow recording for the authenticated user’s own email
      if (sbUser.email?.toLowerCase() !== email.toLowerCase()) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const ip = req.ip || req.headers["x-forwarded-for"]?.toString();

      if (success) {
        await recordSuccessfulLogin(email, provider || "email", ip);
        return res.json({ ok: true });
      } else {
        const result = await recordFailedLogin(email, "invalid_password", ip);
        return res.json(result);
      }
    } catch (err) {
      console.error("[record-login]", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  /**
   * POST /auth/validate-password
   * Body: { password: string }
   * Returns password strength validation without storing anything.
   */
  app.post("/auth/validate-password", requireSameOrigin, (req: any, res: any) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password required" });
    return res.json(validatePassword(password));
  });

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }: { req: any }): Promise<GraphQLContext> => {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id ?? null;
        // Resolve real client IP — respects X-Forwarded-For behind a proxy/load balancer
        const clientIp: string =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
          req.socket?.remoteAddress ??
          "unknown";
        return {
          user: authReq.user ?? null,
          prisma,
          clientIp,
          loaders: {
            profileLoader: createProfileLoader(),
            postLoader: createPostLoader(),
            projectLoader: createProjectLoader(),
            // Batch count loaders (fix N+1)
            followersCountLoader: createFollowersCountLoader(),
            followingCountLoader: createFollowingCountLoader(),
            isFollowedByMeLoader: createIsFollowedByMeLoader(userId),
            postsCountLoader: createPostsCountLoader(),
            projectsCountLoader: createProjectsCountLoader(),
            // Post field batch loaders
            postTagsLoader: createPostTagsLoader(),
            postLikedByMeLoader: createPostLikedByMeLoader(userId),
            postMyReactionLoader: createPostMyReactionLoader(userId),
            originalPostLoader: createOriginalPostLoader(),
            // Comment field batch loaders
            commentLikedByMeLoader: createCommentLikedByMeLoader(userId),
            commentMyReactionLoader: createCommentMyReactionLoader(userId),
          },
        };
      },
    })
  );

  // Health check
  app.get("/health", (_req: any, res: any) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Open Graph proxy (/og?url=https://...) ────────────────────────────────
  // Low #22: Bounded LRU cache — max 500 entries to prevent unbounded memory growth.
  // Evicts the oldest entry when full before inserting a new one.
  const OG_CACHE_MAX = 500;
  const OG_CACHE_TTL = 1000 * 60 * 60; // 1 hour
  const ogCache = new Map<string, { data: any; fetchedAt: number }>();

  function ogCacheSet(key: string, value: { data: any; fetchedAt: number }) {
    // If already present, delete so re-insertion moves it to end ("most recent")
    if (ogCache.has(key)) ogCache.delete(key);
    // Evict oldest entry (first inserted) when at capacity
    if (ogCache.size >= OG_CACHE_MAX) {
      const oldest = ogCache.keys().next().value;
      if (oldest !== undefined) ogCache.delete(oldest);
    }
    ogCache.set(key, value);
  }

  /**
   * SSRF protection: validate a URL is safe to fetch server-side.
   * Blocks private/internal IPs, loopback, cloud metadata endpoints, and non-http(s) schemes.
   */
  function isPrivateIp(ip: string): boolean {
    return (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "0.0.0.0" ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("169.254.") || // AWS/GCP metadata
      ip.startsWith("fd") ||       // IPv6 ULA
      ip.startsWith("fc") ||       // IPv6 ULA
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip) // 172.16–31.x.x
    );
  }

  async function assertSafeUrl(rawUrl: string): Promise<string> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error("invalid url");
    }
    // Only allow http and https
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("url scheme not allowed");
    }
    // Block obvious internal hostnames
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost")
    ) {
      throw new Error("url not allowed");
    }
    // DNS resolution check — prevents DNS rebinding attacks
    try {
      const { address } = await dns.lookup(host);
      if (isPrivateIp(address)) {
        throw new Error("url resolves to private ip");
      }
    } catch (e: any) {
      if (e.message.startsWith("url")) throw e; // re-throw our own errors
      throw new Error("url could not be resolved");
    }
    return parsed.href;
  }

  app.get("/og", async (req: any, res: any) => {
    const raw = req.query.url as string | undefined;
    if (!raw) return res.status(400).json({ error: "url param required" });

    let url: string;
    try {
      url = await assertSafeUrl(raw);
    } catch (e: any) {
      return res.status(400).json({ error: e.message ?? "invalid url" });
    }

    // Return cached result if fresh
    const cached = ogCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < OG_CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LokalBot/1.0; +https://lokal.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      const html = await response.text();

      function getMeta(property: string): string | null {
        // Match both og: and twitter: tags, property or name attr
        const re = new RegExp(
          `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
          "i"
        );
        const m = html.match(re);
        return m ? (m[1] ?? m[2] ?? null) : null;
      }

      function getTitle(): string | null {
        const og = getMeta("og:title") ?? getMeta("twitter:title");
        if (og) return og;
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m ? m[1].trim() : null;
      }

      const ogUrl = getMeta("og:url") ?? url;
      const domain = (() => {
        try { return new URL(ogUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
      })();

      const data = {
        url: ogUrl,
        title: getTitle(),
        description: getMeta("og:description") ?? getMeta("twitter:description") ?? getMeta("description"),
        image: getMeta("og:image") ?? getMeta("twitter:image"),
        siteName: getMeta("og:site_name"),
        domain,
      };

      ogCacheSet(url, { data, fetchedAt: Date.now() });
      return res.json(data);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return res.status(504).json({ error: "request timed out" });
      }
      return res.status(502).json({ error: "failed to fetch url" });
    }
  });

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT }, resolve)
  );

  // Keep connections alive long enough for AI roast (can take up to 90s)
  httpServer.timeout = 125_000;
  httpServer.keepAliveTimeout = 126_000;
  httpServer.headersTimeout = 127_000;

  console.log(`🚀 Lokal GraphQL API ready at http://localhost:${PORT}/graphql (${NODE_ENV})`);
  console.log(`📊 Apollo Studio: https://studio.apollographql.com/sandbox/explorer`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
