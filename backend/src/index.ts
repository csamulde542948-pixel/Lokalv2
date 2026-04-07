import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import DataLoader from "dataloader";

import { typeDefs } from "./graphql/typedefs";
import { resolvers } from "./graphql/resolvers";
import { prisma } from "./lib/prisma";
import { authMiddleware, AuthenticatedRequest } from "./middleware/auth";
import { GraphQLContext } from "./graphql/context";

dotenv.config();

const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

// ─── DataLoader factories ────────────────────────────────────────────────────

function createProfileLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const profiles = await prisma.profile.findMany({
      where: { id: { in: [...ids] } },
      include: { rank: true },
    });
    const map = new Map(profiles.map((p: any) => [p.id, p]));
    return ids.map((id) => map.get(id) ?? null);
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

// ─── Apollo Server ───────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formattedError: any, error: unknown) => {
      console.error("[GraphQL Error]", error);
      return formattedError;
    },
  });

  await server.start();

  app.use(
    cors({
      origin: [FRONTEND_URL, "https://studio.apollographql.com"],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(authMiddleware);

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }: { req: any }): Promise<GraphQLContext> => {
        const authReq = req as AuthenticatedRequest;
        return {
          user: authReq.user ?? null,
          prisma,
          loaders: {
            profileLoader: createProfileLoader(),
            postLoader: createPostLoader(),
            projectLoader: createProjectLoader(),
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
  // Simple in-memory cache: url → { data, fetchedAt }
  const ogCache = new Map<string, { data: any; fetchedAt: number }>();
  const OG_CACHE_TTL = 1000 * 60 * 60; // 1 hour

  app.get("/og", async (req: any, res: any) => {
    const raw = req.query.url as string | undefined;
    if (!raw) return res.status(400).json({ error: "url param required" });

    let url: string;
    try {
      url = new URL(raw).href; // validate & normalise
    } catch {
      return res.status(400).json({ error: "invalid url" });
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

      ogCache.set(url, { data, fetchedAt: Date.now() });
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

  console.log(`🚀 Lokal GraphQL API ready at http://localhost:${PORT}/graphql`);
  console.log(`📊 Apollo Studio: https://studio.apollographql.com/sandbox/explorer`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
