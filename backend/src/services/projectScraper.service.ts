/**
 * Project Scraper Service — Jina Reader + GitHub API + DeepSeek AI Classification
 *
 * Flow:
 *   1. Detect if URL is a GitHub repo → use GitHub API for rich data
 *   2. Scrape the target URL with Jina Reader (r.jina.ai) for page content
 *   3. Extract meta tags (og:title, og:description, og:image, favicon)
 *   4. Send scraped content to DeepSeek for AI classification (tagline, category, tech stack)
 *   5. Return structured ScrapedProjectInfo
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapedProjectInfo {
  name: string;
  tagline: string;
  description: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  techStack: string[];
  category: string; // ProjectCategory enum value
  githubUrl: string | null;
  isGithubRepo: boolean;
  githubStars: number | null;
  githubForks: number | null;
  githubLanguage: string | null;
  githubTopics: string[];
}

// ─── GitHub URL Detection ─────────────────────────────────────────────────────

interface GitHubRepoInfo {
  owner: string;
  repo: string;
}

function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("github.com")) return null;
    // /owner/repo or /owner/repo/... patterns
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

// ─── Step 1: GitHub API (public, no auth needed for public repos) ─────────────

interface GitHubApiResponse {
  name: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  owner: {
    avatar_url: string;
    login: string;
  };
}

async function fetchGitHubRepo(owner: string, repo: string): Promise<GitHubApiResponse | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Lokalhost-ProjectScraper/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as GitHubApiResponse;
  } catch {
    return null;
  }
}

// ─── Step 2: Scrape with Jina Reader ──────────────────────────────────────────

async function scrapeWithJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const headers: Record<string, string> = {
    Accept: "text/plain",
    "X-Return-Format": "text",
  };

  const apiKey = process.env.JINA_API_KEY;
  if (apiKey && !apiKey.startsWith("jina_your")) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Jina Reader failed: ${res.status} ${res.statusText}`);

  const text = await res.text();
  // Trim to ~8000 chars for project info extraction (slightly more than roast)
  return text.slice(0, 8000);
}

// ─── Step 3: Extract meta tags via Jina's JSON mode ───────────────────────────

interface JinaMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  favicon?: string;
}

async function extractMeta(url: string): Promise<JinaMetadata> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Return-Format": "json",
    };

    const apiKey = process.env.JINA_API_KEY;
    if (apiKey && !apiKey.startsWith("jina_your")) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return {};

    const data = (await res.json()) as any;

    return {
      title: data?.data?.title ?? undefined,
      description: data?.data?.description ?? undefined,
      ogImage: data?.data?.ogImage ?? data?.data?.image ?? undefined,
      favicon: data?.data?.favicon ?? undefined,
    };
  } catch {
    return {};
  }
}

// ─── Step 4: Favicon fallback extraction ──────────────────────────────────────

function getFaviconUrl(url: string): string | null {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=128`;
  } catch {
    return null;
  }
}

// ─── Step 5: AI Classification via DeepSeek ───────────────────────────────────

const CLASSIFICATION_PROMPT = `You are a project classifier for a developer community platform. Given information about a project/website, extract structured metadata.

RULES:
- Be concise and specific
- Tagline should be a single compelling sentence (max 100 chars)
- Description should be 2-3 sentences describing what the project does
- Category MUST be exactly one of: WEB_APP, MOBILE_APP, LIBRARY, CLI_TOOL, PORTFOLIO, OTHER
- Tech stack should be specific technologies detected (e.g. "React", "Next.js", "Tailwind CSS", "PostgreSQL")
- Only include tech you're reasonably confident about from the content

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown:
{
  "name": "Project Name",
  "tagline": "One-liner description",
  "description": "2-3 sentence description of what the project does",
  "category": "WEB_APP",
  "techStack": ["React", "Node.js", "PostgreSQL"]
}`;

interface AiClassification {
  name: string;
  tagline: string;
  description: string;
  category: string;
  techStack: string[];
}

async function classifyWithAi(
  scrapedContent: string,
  metaTitle: string | undefined,
  metaDescription: string | undefined,
  url: string
): Promise<AiClassification> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-or-your")) {
    // Fallback: no AI, return basic info from meta tags
    return {
      name: metaTitle ?? new URL(url).hostname.replace(/^www\./, ""),
      tagline: metaDescription?.slice(0, 100) ?? "",
      description: metaDescription ?? "",
      category: "WEB_APP",
      techStack: [],
    };
  }

  const userPrompt = `Classify this project/website.

URL: ${url}
Page title: ${metaTitle ?? "Unknown"}
Meta description: ${metaDescription ?? "None"}

Scraped page content:
---
${scrapedContent.slice(0, 4000)}
---

Return ONLY valid JSON following the schema. No markdown.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
        "X-Title": "Lokal Project Scraper",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-pro:nitro",
        messages: [
          { role: "system", content: CLASSIFICATION_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Low temp for structured output
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`AI classification failed: ${res.status}`);
      return fallbackClassification(metaTitle, metaDescription, url);
    }

    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content ?? "";

    // Parse JSON — strip markdown code fences if present
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as AiClassification;

    // Validate category is a valid enum value
    const validCategories = ["WEB_APP", "MOBILE_APP", "LIBRARY", "CLI_TOOL", "PORTFOLIO", "OTHER"];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = "WEB_APP";
    }

    return {
      name: parsed.name || metaTitle || new URL(url).hostname,
      tagline: parsed.tagline || metaDescription?.slice(0, 100) || "",
      description: parsed.description || metaDescription || "",
      category: parsed.category,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack.filter(Boolean) : [],
    };
  } catch (err) {
    console.error("AI classification error:", err);
    return fallbackClassification(metaTitle, metaDescription, url);
  }
}

function fallbackClassification(
  metaTitle: string | undefined,
  metaDescription: string | undefined,
  url: string
): AiClassification {
  let name: string;
  try {
    name = metaTitle ?? new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    name = "My Project";
  }

  return {
    name,
    tagline: metaDescription?.slice(0, 100) ?? "",
    description: metaDescription ?? "",
    category: "WEB_APP",
    techStack: [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function scrapeProjectInfo(url: string): Promise<ScrapedProjectInfo> {
  if (!url || !url.startsWith("http")) {
    throw new Error("URL must start with http:// or https://");
  }

  const githubInfo = parseGitHubUrl(url);

  // ── GitHub repo path ────────────────────────────────────────────────────
  if (githubInfo) {
    const ghData = await fetchGitHubRepo(githubInfo.owner, githubInfo.repo);

    if (ghData) {
      // For GitHub repos, we have rich structured data already
      // Still run AI classification on the README/description for better tagline
      let aiResult: AiClassification;
      try {
        const readmeContent = await scrapeWithJina(url);
        aiResult = await classifyWithAi(
          readmeContent,
          ghData.name,
          ghData.description ?? undefined,
          url
        );
      } catch {
        aiResult = {
          name: ghData.name,
          tagline: ghData.description?.slice(0, 100) ?? "",
          description: ghData.description ?? "",
          category: detectCategoryFromLanguage(ghData.language),
          techStack: [ghData.language, ...ghData.topics].filter(Boolean) as string[],
        };
      }

      return {
        name: aiResult.name || ghData.name,
        tagline: aiResult.tagline || ghData.description?.slice(0, 100) || "",
        description: aiResult.description || ghData.description || "",
        iconUrl: ghData.owner.avatar_url,
        bannerUrl: null,
        techStack: deduplicateTechStack([
          ...aiResult.techStack,
          ...(ghData.language ? [ghData.language] : []),
          ...ghData.topics,
        ]),
        category: aiResult.category,
        githubUrl: ghData.html_url,
        isGithubRepo: true,
        githubStars: ghData.stargazers_count,
        githubForks: ghData.forks_count,
        githubLanguage: ghData.language,
        githubTopics: ghData.topics,
      };
    }
  }

  // ── Generic website path ────────────────────────────────────────────────

  // Run Jina scrape + meta extraction in parallel
  const [scrapedContent, meta] = await Promise.all([
    scrapeWithJina(url),
    extractMeta(url),
  ]);

  // Run AI classification
  const aiResult = await classifyWithAi(
    scrapedContent,
    meta.title,
    meta.description,
    url
  );

  // Build icon URL: og:image favicon → Google S2 favicon fallback
  const iconUrl = meta.favicon || getFaviconUrl(url);
  const bannerUrl = meta.ogImage || null;

  // Try to detect GitHub link from scraped content
  const githubUrlFromContent = extractGitHubUrl(scrapedContent);

  return {
    name: aiResult.name,
    tagline: aiResult.tagline,
    description: aiResult.description,
    iconUrl,
    bannerUrl,
    techStack: deduplicateTechStack(aiResult.techStack),
    category: aiResult.category,
    githubUrl: githubUrlFromContent,
    isGithubRepo: false,
    githubStars: null,
    githubForks: null,
    githubLanguage: null,
    githubTopics: [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectCategoryFromLanguage(language: string | null): string {
  if (!language) return "WEB_APP";
  const lower = language.toLowerCase();
  if (["swift", "kotlin", "dart", "java"].includes(lower)) return "MOBILE_APP";
  if (["python", "rust", "go", "c", "c++"].includes(lower)) return "LIBRARY";
  if (["shell", "bash", "powershell"].includes(lower)) return "CLI_TOOL";
  return "WEB_APP";
}

function deduplicateTechStack(stack: string[]): string[] {
  const seen = new Set<string>();
  return stack.filter((item) => {
    const lower = item.toLowerCase().trim();
    if (!lower || seen.has(lower)) return false;
    seen.add(lower);
    return true;
  }).slice(0, 15); // cap at 15 tags
}

function extractGitHubUrl(content: string): string | null {
  const match = content.match(/https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/);
  return match ? match[0] : null;
}
