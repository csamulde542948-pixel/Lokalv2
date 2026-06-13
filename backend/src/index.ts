import "./env"; // MUST be first — loads dotenv before any other module reads process.env
import express from "express";
import http from "http";
import { randomBytes, randomUUID } from "crypto";
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
import { analyzeGraphqlRequest } from "./lib/graphqlRequest";
import {
  assertSafeExternalUrl,
  ExternalFetchError,
  fetchSafeExternalHtml,
} from "./lib/ssrf";
import { verifyGoogleRiscToken } from "./lib/googleRisc";
import { authMiddleware, AuthenticatedRequest } from "./middleware/auth";
import { GraphQLContext } from "./graphql/context";
import { startLeaderboardRefreshers } from "./services/leaderboardRefreshers";
import {
  generalRateLimiter,
  authRateLimiter,
  sessionCookieRateLimiter,
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
const AUTH_ACCESS_COOKIE = "lokal_access_token";
const AUTH_REFRESH_COOKIE = "lokal_refresh_token";
const AUTH_CSRF_COOKIE = "lokal_csrf_token";

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

/**
 * Batch loader for `Post.commentsPreview(limit)` — fetches the top-N root
 * comments for many posts in a single query. Without this, the field
 * resolver was firing one `postComment.findMany` per post (N+1), which
 * dominated the response time for a 20-post feed (~20 sequential queries,
 * each with author + editHistory + replies count joins).
 *
 * Strategy: fetch all top-level comments for the requested posts in one
 * query, sort by `postId ASC, likesCount DESC, createdAt DESC`, then group
 * in JS and take the first N per post. Total rows scanned is O(comments)
 * not O(posts × N), and the per-post slice is O(posts).
 */
function createCommentsPreviewLoader(defaultLimit: number) {
  return new DataLoader<string, any[]>(async (postIds: readonly string[]) => {
    const ids = [...postIds];
    if (ids.length === 0) return [];
    const all = await prisma.postComment.findMany({
      where: { postId: { in: ids }, parentId: null },
      orderBy: [
        { postId: "asc" },
        { likesCount: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        author: { include: { rank: true } },
        editHistory: { orderBy: { editedAt: "desc" } },
        _count: { select: { replies: true } },
      },
    });
    const map = new Map<string, any[]>();
    let currentPostId: string | null = null;
    let currentCount = 0;
    for (const c of all as any[]) {
      if (c.postId !== currentPostId) {
        currentPostId = c.postId;
        currentCount = 0;
        if (!map.has(c.postId)) map.set(c.postId, []);
      }
      if (currentCount < defaultLimit) {
        map.get(c.postId)!.push(c);
        currentCount++;
      }
    }
    return ids.map((id) => map.get(id) ?? []);
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
  app.set("trust proxy", 1);
  const httpServer = http.createServer(app);

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: !IS_PRODUCTION, // Enabled in dev + staging, disabled only in production
    validationRules: [depthLimit(7)], // Prevent deeply nested query DoS attacks
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError: any, error: unknown) => {
      const errorId = randomUUID();
      console.error(`[GraphQL Error ${errorId}]`, error);
      // In production & staging, mask internal errors to avoid leaking stack traces / DB details
      if (IS_DEPLOYED) {
        const msg = formattedError.message ?? "";
        const code = formattedError.extensions?.code ?? "";

        // Always pass through any error explicitly tagged as user-facing
        if (code === "RATE_LIMITED" || code === "INSUFFICIENT_CREDITS") {
          return { message: msg, locations: formattedError.locations, path: formattedError.path, extensions: { code } };
        }

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
          "Daily limit reached",
          "Not enough credits",
          "Too many roasts",
          "Roast queue timed out",
          "Firecrawl is currently at capacity",
          "You already roasted this URL",
          "No Firecrawl API keys",
          "FIRECRAWL_API_KEY",
          "Firecrawl scrape failed",
          "Firecrawl could not extract enough branding",
          "OPENROUTER_API_KEY",
          "NVIDIA_API_KEY",
          "NVIDIA NIM API error",
          "DeepSeek returned empty content",
          "Roast generation timed out",
          "NVIDIA returned empty brand analysis content",
          "Brand analysis timed out",
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
          "Website crawl failed",
          // Business-rule validation that is safe and useful for users.
          "You've reached the project limit",
          "You've reached the launchpad event limit",
          "Profile not found",
          "Project name is required",
          "Project tagline is required",
          "Project description is required",
        ];

        const isAllowed =
          safeExact.includes(msg) ||
          safePrefixes.some((prefix) => msg.startsWith(prefix));

        const message = isAllowed ? msg : "Internal server error";
        return {
          message,
          locations: formattedError.locations,
          path: formattedError.path,
          extensions: isAllowed ? undefined : { errorId },
        };
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
  // Health checks must stay outside shared request throttles so Railway
  // can probe the service reliably even during traffic spikes.
  app.get("/health", (_req: any, res: any) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(express.json({ limit: "1mb" })); // Limit body size to prevent abuse
  app.use(authMiddleware);
  app.use(generalRateLimiter);
  app.use("/graphql", mutationRateLimiter);

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

  function readCookie(req: any, name: string): string | null {
    const cookieHeader = req.headers.cookie as string | undefined;
    if (!cookieHeader) return null;

    const cookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));

    if (!cookie) return null;
    return decodeURIComponent(cookie.slice(name.length + 1));
  }

  function deployedSameSite() {
    return IS_PRODUCTION ? "lax" as const : "none" as const;
  }

  function sessionCookieOptions(maxAge?: number) {
    return {
      httpOnly: true,
      secure: IS_DEPLOYED,
      sameSite: IS_DEPLOYED ? deployedSameSite() : "lax" as const,
      path: "/",
      ...(maxAge ? { maxAge } : {}),
    };
  }

  function csrfCookieOptions(maxAge?: number) {
    return {
      httpOnly: false,
      secure: IS_DEPLOYED,
      sameSite: IS_DEPLOYED ? deployedSameSite() : "lax" as const,
      path: "/",
      ...(maxAge ? { maxAge } : {}),
    };
  }

  function issueCsrfToken(res: any, maxAge: number) {
    const token = randomBytes(24).toString("hex");
    res.cookie(AUTH_CSRF_COOKIE, token, csrfCookieOptions(maxAge));
    return token;
  }

  function setSessionCookies(res: any, accessToken: string, refreshToken: string) {
    res.cookie(AUTH_ACCESS_COOKIE, accessToken, sessionCookieOptions(60 * 60 * 1000));
    res.cookie(AUTH_REFRESH_COOKIE, refreshToken, sessionCookieOptions(30 * 24 * 60 * 60 * 1000));
    return issueCsrfToken(res, 30 * 24 * 60 * 60 * 1000);
  }

  function clearSessionCookies(res: any) {
    res.clearCookie(AUTH_ACCESS_COOKIE, sessionCookieOptions());
    res.clearCookie(AUTH_REFRESH_COOKIE, sessionCookieOptions());
    res.clearCookie(AUTH_CSRF_COOKIE, csrfCookieOptions());
  }

  function requireGraphqlMutationCsrf(req: any, res: any, next: any) {
    const analysis = analyzeGraphqlRequest(
      req.body?.query,
      req.body?.operationName
    );
    if (!analysis.isMutation) return next();

    const authHeader = String(req.headers.authorization ?? "");
    const usingCookieAuth = !authHeader.startsWith("Bearer ") && !!readCookie(req, AUTH_ACCESS_COOKIE);
    if (!usingCookieAuth) return next();

    const headerToken = req.headers["x-csrf-token"];
    const cookieToken = readCookie(req, AUTH_CSRF_COOKIE);
    if (!headerToken || typeof headerToken !== "string" || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: "CSRF token mismatch" });
    }

    if (IS_DEPLOYED) {
      const origin = req.headers["origin"] as string | undefined;
      const referer = req.headers["referer"] as string | undefined;
      const source = origin ?? (referer ? new URL(referer).origin : null);
      if (!source || !allowedOrigins.includes(source)) {
        return res.status(403).json({ error: "Forbidden: cross-origin request" });
      }
    }

    next();
  }

  function requireCookieCsrf(req: any, res: any, next: any) {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const headerToken = req.headers["x-csrf-token"];
    const cookieToken = readCookie(req, AUTH_CSRF_COOKIE);
    if (!headerToken || typeof headerToken !== "string" || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({ error: "CSRF token mismatch" });
    }

    next();
  }

  function enforceGraphqlMutationBatchLimit(req: any, res: any, next: any) {
    const analysis = analyzeGraphqlRequest(
      req.body?.query,
      req.body?.operationName
    );
    if (analysis.topLevelMutationFieldCount > 10) {
      return res.status(400).json({
        error: "A request can contain at most 10 mutation operations.",
      });
    }
    next();
  }

  /**
   * Stores a verified Supabase session in HttpOnly cookies.
   *
   * The browser still performs the PKCE exchange because it owns the verifier,
   * then sends the resulting session here once so the backend can authenticate
   * subsequent credentialed API requests without exposing cookies to JS.
   */
  app.post("/auth/session-cookie", sessionCookieRateLimiter, requireSameOrigin, async (req: any, res: any) => {
    try {
      const { accessToken, refreshToken } = req.body ?? {};
      if (!accessToken || !refreshToken) {
        clearSessionCookies(res);
        return res.status(400).json({ error: "Session tokens required" });
      }

      const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
      if (error || !user) {
        clearSessionCookies(res);
        return res.status(401).json({ error: "Invalid session" });
      }

      const csrfToken = setSessionCookies(res, accessToken, refreshToken);
      res.set("Cache-Control", "no-store");
      return res.json({ ok: true, user, csrfToken });
    } catch (err) {
      console.error("[session-cookie]", err);
      clearSessionCookies(res);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.delete("/auth/session-cookie", sessionCookieRateLimiter, requireSameOrigin, async (req: any, res: any) => {
    const accessToken = readCookie(req, AUTH_ACCESS_COOKIE);
    if (accessToken) {
      const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, "global");
      if (error) {
        console.warn("[session-cookie:delete] Session revocation failed:", error.message);
      }
    }
    clearSessionCookies(res);
    res.set("Cache-Control", "no-store");
    return res.json({ ok: true });
  });

  app.get("/auth/session-cookie", async (req: any, res: any) => {
    try {
      res.set("Cache-Control", "private, no-store");
      const accessToken = readCookie(req, AUTH_ACCESS_COOKIE);
      const refreshToken = readCookie(req, AUTH_REFRESH_COOKIE);

      if (accessToken) {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
        if (!error && user) {
          let csrfToken = readCookie(req, AUTH_CSRF_COOKIE);
          if (refreshToken && !readCookie(req, AUTH_CSRF_COOKIE)) {
            csrfToken = setSessionCookies(res, accessToken, refreshToken);
          } else if (!csrfToken) {
            csrfToken = issueCsrfToken(res, 60 * 60 * 1000);
          }
          return res.json({ authenticated: true, user, csrfToken });
        }
      }

      if (refreshToken) {
        const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });
        if (!error && data.session?.access_token && data.session.refresh_token && data.user) {
          const csrfToken = setSessionCookies(res, data.session.access_token, data.session.refresh_token);
          return res.json({ authenticated: true, user: data.user, csrfToken });
        }
      }

      clearSessionCookies(res);
      return res.json({ authenticated: false, user: null });
    } catch (err) {
      console.error("[session-cookie:get]", err);
      clearSessionCookies(res);
      return res.status(500).json({ error: "Internal error" });
    }
  });

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
   * Body: { email: string, success: boolean, provider?: string }
   *
   * Requires the authenticated HttpOnly cookie session and a valid CSRF token
   * so an unauthenticated attacker cannot lock out arbitrary accounts.
   *
   * Consequence: failed-login tracking (wrong password) can no longer be done here,
   * since there’s no token when auth fails. We record failures via Supabase Auth Hooks
   * or accept the trade-off. Successful logins still update the counter reset correctly.
   */
  app.post("/auth/record-login", authRateLimiter, requireSameOrigin, requireCookieCsrf, async (req: any, res: any) => {
    try {
      if (!req.user?.email) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { email, success, provider } = req.body;
      if (!email) return res.status(400).json({ error: "Email required" });

      // Guard: only allow recording for the authenticated user’s own email
      if (req.user.email.toLowerCase() !== email.toLowerCase()) {
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

  const storageUploadRules: Record<
    string,
    { maxBytes: number; mimePrefix: string; pathForUser: (path: string, userId: string) => boolean }
  > = {
    avatars: {
      maxBytes: 2 * 1024 * 1024,
      mimePrefix: "image/",
      pathForUser: (path, userId) =>
        new RegExp(`^avatars/${userId}\\.(png|jpe?g|gif|webp)$`, "i").test(path),
    },
    covers: {
      maxBytes: 5 * 1024 * 1024,
      mimePrefix: "image/",
      pathForUser: (path, userId) =>
        new RegExp(`^covers/${userId}\\.(png|jpe?g|gif|webp)$`, "i").test(path),
    },
    "post-images": {
      maxBytes: 5 * 1024 * 1024,
      mimePrefix: "image/",
      pathForUser: (path, userId) =>
        new RegExp(`^posts/${userId}/[A-Za-z0-9._-]+$`).test(path),
    },
    "post-videos": {
      maxBytes: 25 * 1024 * 1024,
      mimePrefix: "video/",
      pathForUser: (path, userId) =>
        new RegExp(`^posts/${userId}/[A-Za-z0-9._-]+$`).test(path),
    },
  };

  app.post("/storage/signed-upload", requireSameOrigin, requireCookieCsrf, async (req: any, res: any) => {
    try {
      const { bucket, path, contentType, size, upsert = false } = req.body ?? {};
      const rule = typeof bucket === "string" ? storageUploadRules[bucket] : null;
      const userId = req.user?.id;

      if (
        !rule ||
        !userId ||
        typeof path !== "string" ||
        typeof contentType !== "string" ||
        typeof size !== "number"
      ) {
        return res.status(400).json({ error: "Invalid upload request" });
      }
      if (
        path.includes("..") ||
        !rule.pathForUser(path, userId) ||
        !contentType.toLowerCase().startsWith(rule.mimePrefix) ||
        size <= 0 ||
        size > rule.maxBytes
      ) {
        return res.status(400).json({ error: "Upload does not meet storage policy" });
      }

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUploadUrl(path, { upsert: Boolean(upsert) });
      if (error || !data) {
        console.error("[storage:signed-upload]", error);
        return res.status(502).json({ error: "Could not prepare upload" });
      }

      res.set("Cache-Control", "no-store");
      return res.json({ path: data.path, token: data.token });
    } catch (err) {
      console.error("[storage:signed-upload]", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  app.post("/auth/update-password", authRateLimiter, requireSameOrigin, requireCookieCsrf, async (req: any, res: any) => {
    try {
      const password = req.body?.password;
      if (typeof password !== "string") {
        return res.status(400).json({ error: "Password is required" });
      }
      const validation = validatePassword(password);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, { password });
      if (error) {
        console.error("[auth:update-password]", error);
        return res.status(502).json({ error: "Could not update password" });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("[auth:update-password]", err);
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

  // ── Google Cross-Account Protection (RISC) ───────────────────────────────────
  // Google calls this endpoint when a security event occurs for a user
  // (account compromised, password changed, account disabled, etc.)
  // Docs: https://developers.google.com/identity/protocols/risc
  app.post("/auth/google/security-events", express.text({ type: "application/secevent+jwt" }), async (req: any, res: any) => {
    try {
      const token = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Missing security event token" });
      }

      const payload = await verifyGoogleRiscToken(token);
      const events =
        payload.events && typeof payload.events === "object"
          ? payload.events as Record<string, any>
          : {};
      const firstSubject = Object.values(events)
        .map((event) => event?.subject)
        .find((subject) => subject && typeof subject === "object");
      const subjectEmail =
        typeof firstSubject?.email === "string" ? firstSubject.email : null;
      const googleSubject =
        typeof firstSubject?.sub === "string" ? firstSubject.sub : null;

      console.log("[RISC] Received security event:", {
        events: Object.keys(events),
        subject: subjectEmail,
      });

      // Handle different RISC event types
      if (events["https://schemas.openid.net/secevent/risc/event-type/account-disabled"]) {
        // User's Google account was disabled — sign them out & log it
        console.warn("[RISC] Account disabled for:", subjectEmail);
        await logSecurityEvent(null, "google_account_disabled", { events: Object.keys(events), subject: subjectEmail, googleSubject }, "google_risc");
        // Optionally: revoke their Supabase session
        // await supabaseAdmin.auth.admin.signOut(userId)
      }

      if (events["https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required"]) {
        // User's Google credentials may be compromised — force re-auth
        console.warn("[RISC] Credential change required for:", subjectEmail);
        await logSecurityEvent(null, "google_credential_change_required", { events: Object.keys(events), subject: subjectEmail, googleSubject }, "google_risc");
      }

      if (events["https://schemas.openid.net/secevent/risc/event-type/sessions-revoked"]) {
        // All sessions revoked — sign user out
        console.warn("[RISC] Sessions revoked for:", subjectEmail);
        await logSecurityEvent(null, "google_sessions_revoked", { events: Object.keys(events), subject: subjectEmail, googleSubject }, "google_risc");
      }

      if (events["https://schemas.openid.net/secevent/risc/event-type/token-claims-change"]) {
        console.warn("[RISC] Token claims changed for:", subjectEmail);
        await logSecurityEvent(null, "google_token_claims_change", { events: Object.keys(events), subject: subjectEmail, googleSubject }, "google_risc");
      }

      // Acknowledge the event with 202 Accepted
      return res.status(202).end();
    } catch (err) {
      console.error("[RISC] Error processing security event:", err);
      // Return 400 so Google knows to retry later
      return res.status(400).end();
    }
  });

  // Google RISC well-known configuration endpoint (required by Google to verify your endpoint)
  app.get("/.well-known/risc-configuration", (_req: any, res: any) => {
    res.json({
      issuer: process.env.BACKEND_URL ?? "https://api.lokalhost.club",
      jwks_uri: `${process.env.BACKEND_URL ?? "https://api.lokalhost.club"}/.well-known/risc-jwks.json`,
      delivery_methods_supported: [
        "https://schemas.openid.net/secevent/risc/delivery-method/push",
      ],
    });
  });
  // ─────────────────────────────────────────────────────────────────────────────

  app.use(
    "/graphql",
    enforceGraphqlMutationBatchLimit,
    requireGraphqlMutationCsrf,
    expressMiddleware(server, {
      context: async ({ req }: { req: any }): Promise<GraphQLContext> => {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user?.id ?? null;
        const mutationFieldCounts = analyzeGraphqlRequest(
          req.body?.query,
          req.body?.operationName
        ).mutationFieldCounts;
        // Resolve real client IP — respects X-Forwarded-For behind a proxy/load balancer
        const clientIp: string =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
          req.socket?.remoteAddress ??
          "unknown";
        // Resolve user country from CDN-set headers. Cloudflare and Vercel
        // both inject a 2-letter ISO country code for free (no extra
        // dependency). Falls back to "PH" so unidentified clients still
        // get the Taglish roast engine (the existing default behaviour).
        const cfCountry = req.headers["cf-ipcountry"];
        const vercelCountry = req.headers["x-vercel-ip-country"];
        const rawCountry =
          (Array.isArray(cfCountry) ? cfCountry[0] : cfCountry) ??
          (Array.isArray(vercelCountry) ? vercelCountry[0] : vercelCountry);
        const userCountry = (typeof rawCountry === "string" && /^[A-Z]{2}$/.test(rawCountry))
          ? rawCountry.toUpperCase()
          : "PH";
        return {
          user: authReq.user ?? null,
          prisma,
          clientIp,
          userCountry,
          requestMeta: {
            mutationFieldCounts,
            usingCookieAuth:
              !String(req.headers.authorization ?? "").startsWith("Bearer ") &&
              Boolean(readCookie(req, AUTH_ACCESS_COOKIE)),
          },
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
            commentsPreviewLoader: createCommentsPreviewLoader(2),
            // Comment field batch loaders
            commentLikedByMeLoader: createCommentLikedByMeLoader(userId),
            commentMyReactionLoader: createCommentMyReactionLoader(userId),
          },
        };
      },
    })
  );


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

  app.get("/og", async (req: any, res: any) => {
    const raw = req.query.url as string | undefined;
    if (!raw) return res.status(400).json({ error: "url param required" });

    let url: string;
    try {
      url = await assertSafeExternalUrl(raw);
    } catch (e: any) {
      return res.status(400).json({ error: e.message ?? "invalid url" });
    }

    // Return cached result if fresh
    const cached = ogCache.get(url);
    if (cached && Date.now() - cached.fetchedAt < OG_CACHE_TTL) {
      return res.json(cached.data);
    }

    try {
      let finalUrl = url;
      let response;
      for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
        response = await fetchSafeExternalHtml(finalUrl, {
          timeoutMs: 5_000,
          maxBytes: 1_000_000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; LokalBot/1.0; +https://lokalhost.club)",
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (response.status < 300 || response.status >= 400) break;
        const location = response.headers.location;
        if (!location || redirectCount === 3) {
          return res.status(400).json({ error: "too many redirects" });
        }
        finalUrl = new URL(location, finalUrl).href;
      }

      if (!response) return res.status(502).json({ error: "failed to fetch url" });
      const html = response.body.toString("utf8");

      function decodeHtmlEntities(value: string | null): string | null {
        if (!value) return null;
        const named: Record<string, string> = {
          amp: "&",
          apos: "'",
          gt: ">",
          lt: "<",
          quot: '"',
        };
        return value.replace(
          /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
          (entity, decimal, hexadecimal, name) => {
            const codePoint = decimal
              ? Number(decimal)
              : hexadecimal
                ? parseInt(hexadecimal, 16)
                : null;
            if (
              codePoint !== null &&
              Number.isInteger(codePoint) &&
              codePoint >= 0 &&
              codePoint <= 0x10ffff &&
              (codePoint < 0xd800 || codePoint > 0xdfff)
            ) {
              return String.fromCodePoint(codePoint);
            }
            return named[String(name).toLowerCase()] ?? entity;
          }
        );
      }

      function getMeta(property: string): string | null {
        // Match both og: and twitter: tags, property or name attr
        const re = new RegExp(
          `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
          "i"
        );
        const m = html.match(re);
        return m ? decodeHtmlEntities(m[1] ?? m[2] ?? null) : null;
      }

      function getTitle(): string | null {
        const og = getMeta("og:title") ?? getMeta("twitter:title");
        if (og) return og;
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m ? decodeHtmlEntities(m[1].trim()) : null;
      }

      function absoluteUrl(value: string | null): string | null {
        if (!value) return null;
        try {
          return new URL(value, finalUrl).href;
        } catch {
          return null;
        }
      }

      const ogUrl = absoluteUrl(getMeta("og:url")) ?? finalUrl;
      const domain = (() => {
        try { return new URL(ogUrl).hostname.replace(/^www\./, ""); } catch { return ""; }
      })();

      const data = {
        url: ogUrl,
        title: getTitle(),
        description: getMeta("og:description") ?? getMeta("twitter:description") ?? getMeta("description"),
        image: absoluteUrl(getMeta("og:image") ?? getMeta("twitter:image")),
        siteName: getMeta("og:site_name"),
        domain,
      };

      ogCacheSet(url, { data, fetchedAt: Date.now() });
      return res.json(data);
    } catch (err: any) {
      if (err instanceof ExternalFetchError && err.code === "TIMEOUT") {
        return res.status(504).json({ error: "request timed out" });
      }
      if (err instanceof ExternalFetchError && err.code === "RESPONSE_TOO_LARGE") {
        return res.status(413).json({ error: "response too large" });
      }
      if (
        err instanceof ExternalFetchError &&
        err.code === "UNSUPPORTED_CONTENT_TYPE"
      ) {
        return res.status(415).json({ error: "url did not return html" });
      }
      return res.status(502).json({ error: "failed to fetch url" });
    }
  });

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: PORT }, resolve)
  );

  // Keep connections alive long enough for long AI generations.
  httpServer.timeout = 220_000;
  httpServer.keepAliveTimeout = 221_000;
  httpServer.headersTimeout = 222_000;

  // Start leaderboard background refreshers. Populates the Laban Launcher
  // (shipping_streaks) and Underdog (weekly_xp_snapshots) boards on
  // boot, then refreshes every 6h / 1h respectively. Idempotent.
  startLeaderboardRefreshers(prisma);

  console.log(`🚀 Lokal GraphQL API ready at http://localhost:${PORT}/graphql (${NODE_ENV})`);
  console.log(`📊 Apollo Studio: https://studio.apollographql.com/sandbox/explorer`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
