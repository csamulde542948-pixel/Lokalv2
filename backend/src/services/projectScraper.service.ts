/**
 * Project Scraper Service — Firecrawl + GitHub API + DeepSeek AI Classification
 *
 * Flow:
 *   1. Detect if URL is a GitHub repo → use GitHub API for rich data
 *   2. Scrape the target URL with Firecrawl (markdown + screenshot + metadata in one call)
 *   3. Send scraped content to DeepSeek for AI classification (tagline, category, tech stack)
 *   4. Return structured ScrapedProjectInfo (with real screenshot as bannerUrl)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScrapedProjectInfo {
  name: string;
  tagline: string;
  description: string;
  summary: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  screenshots: string[];
  techStack: string[];
  category: string; // ProjectCategory enum value
  githubUrl: string | null;
  isGithubRepo: boolean;
  githubStars: number | null;
  githubForks: number | null;
  githubLanguage: string | null;
  githubTopics: string[];
  // Branding
  brandColor: string | null;      // hex from <meta name="theme-color">
  // Social links auto-detected from the site
  twitterUrl: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
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

// ─── Step 2: Crawl with Firecrawl (map core pages + screenshot each) ─────────

interface FirecrawlMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  favicon?: string;
  themeColor?: string;        // <meta name="theme-color">
  twitterSite?: string;       // <meta name="twitter:site">
  twitterCreator?: string;    // <meta name="twitter:creator">
  [key: string]: unknown;
}

interface FirecrawlPageResult {
  url: string;
  markdown: string;
  screenshotUrl: string | null;
  metadata: FirecrawlMetadata;
}

interface FirecrawlResult {
  markdown: string;
  screenshotUrl: string | null;
  screenshots: string[];
  metadata: FirecrawlMetadata;
}

// ─── Social link extraction from scraped markdown ─────────────────────────────

interface SocialLinks {
  twitterUrl: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
}

function extractSocialLinks(markdown: string, metadata: FirecrawlMetadata): SocialLinks {
  // Twitter / X
  let twitterUrl: string | null = null;

  // From metadata twitter:site or twitter:creator (e.g. "@myapp")
  const twitterHandle = metadata.twitterSite ?? metadata.twitterCreator ?? null;
  if (twitterHandle) {
    const handle = twitterHandle.replace(/^@/, "");
    if (handle && !handle.includes(" ")) {
      twitterUrl = `https://x.com/${handle}`;
    }
  }
  if (!twitterUrl) {
    // From markdown links
    const twMatch = markdown.match(
      /https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,50})(?:\/|$|\s|\)|\])/
    );
    if (twMatch) twitterUrl = `https://x.com/${twMatch[1]}`;
  }

  // LinkedIn
  let linkedinUrl: string | null = null;
  const liMatch = markdown.match(
    /https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[A-Za-z0-9_-]+(?:\/|$|\s|\)|\])/
  );
  if (liMatch) linkedinUrl = liMatch[0].replace(/[\s\)\]]+$/, "");

  // Facebook
  let facebookUrl: string | null = null;
  const fbMatch = markdown.match(
    /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.%-]+(?:\/|$|\s|\)|\])/
  );
  if (fbMatch) facebookUrl = fbMatch[0].replace(/[\s\)\]]+$/, "");

  // YouTube
  let youtubeUrl: string | null = null;
  const ytMatch = markdown.match(
    /https?:\/\/(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9_-]+)(?:\/|$|\s|\)|\])/
  );
  if (ytMatch) youtubeUrl = ytMatch[0].replace(/[\s\)\]]+$/, "");

  return { twitterUrl, linkedinUrl, facebookUrl, youtubeUrl };
}

// ─── Brand color extraction ───────────────────────────────────────────────────

function extractBrandColor(metadata: FirecrawlMetadata): string | null {
  const raw = metadata.themeColor as string | undefined;
  if (!raw) return null;
  // Normalise — keep only valid 3- or 6-digit hex colours
  const hex = raw.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(hex)) return hex;
  // Some sites write "rgb(r, g, b)" — convert to hex
  const rgb = hex.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) {
    return (
      "#" +
      [rgb[1], rgb[2], rgb[3]]
        .map((n) => parseInt(n).toString(16).padStart(2, "0"))
        .join("")
    );
  }
  return null;
}

async function scrapeWithFirecrawl(url: string): Promise<FirecrawlResult> {
  // Prefer a dedicated key for project scraping so it never shares the
  // 2-concurrent-browser quota with the roast engine's key pool.
  // Set FIRECRAWL_API_KEY_PROJECTS in .env; falls back to the legacy key.
  const apiKey =
    process.env.FIRECRAWL_API_KEY_PROJECTS ??
    process.env.FIRECRAWL_API_KEY;
  if (!apiKey || apiKey.startsWith("fc-your")) {
    throw new Error(
      "No Firecrawl key configured for project scraping. " +
      "Set FIRECRAWL_API_KEY_PROJECTS (or FIRECRAWL_API_KEY) in backend/.env"
    );
  }

  // ── Step 1: Map core pages ─────────────────────────────────────────────────
  // Use Firecrawl's /map endpoint to discover the most important URLs
  let coreUrls: string[] = [url];
  try {
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, limit: 10 }),
      signal: AbortSignal.timeout(15_000),
    });
    if (mapRes.ok) {
      const mapData = (await mapRes.json()) as { success: boolean; links?: string[] };
      if (mapData.success && Array.isArray(mapData.links) && mapData.links.length > 0) {
        // Score each URL — prefer homepage-like, about, features, pricing, docs
        const scored = mapData.links.map((u) => {
          const path = new URL(u).pathname.toLowerCase();
          let score = 0;
          if (path === "/" || path === "") score += 100;
          else if (/about|features|product|home/.test(path)) score += 80;
          else if (/pricing|plans|docs|documentation/.test(path)) score += 60;
          else if (path.split("/").filter(Boolean).length === 1) score += 40; // shallow path
          return { url: u, score };
        });
        scored.sort((a, b) => b.score - a.score);
        // Take up to 5 core pages, always include the root URL first
        const selected = scored.slice(0, 5).map((s) => s.url);
        if (!selected.includes(url)) selected.unshift(url);
        coreUrls = selected.slice(0, 5);
      }
    }
  } catch {
    // Map failed — fall back to single page scrape
    coreUrls = [url];
  }

  // ── Step 2: Scrape + screenshot each core page in parallel ─────────────────
  const scrapeOne = async (pageUrl: string): Promise<FirecrawlPageResult | null> => {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: pageUrl,
          formats: ["markdown", "screenshot"],
          waitFor: 1500,
        }),
        signal: AbortSignal.timeout(40_000),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        success: boolean;
        data?: {
          markdown?: string;
          screenshot?: string;
          metadata?: FirecrawlMetadata;
        };
      };
      const d = data.data ?? {};
      return {
        url: pageUrl,
        markdown: (d.markdown ?? "").slice(0, 4000),
        screenshotUrl: d.screenshot ?? null,
        metadata: d.metadata ?? {},
      };
    } catch {
      return null;
    }
  };

  // Run scrapes in parallel (Firecrawl allows concurrent requests)
  const results = (await Promise.all(coreUrls.map(scrapeOne))).filter(Boolean) as FirecrawlPageResult[];

  if (results.length === 0) {
    throw new Error("Firecrawl could not scrape any pages from this URL.");
  }

  // Home page result (first successful one)
  const home = results[0];

  // Collect all screenshots (deduplicated, non-null)
  const screenshots = results
    .map((r) => r.screenshotUrl)
    .filter((s): s is string => !!s);

  // Combine markdown from all pages for richer AI classification
  const combinedMarkdown = results
    .map((r) => `\n\n--- Page: ${r.url} ---\n${r.markdown}`)
    .join("")
    .slice(0, 8000);

  return {
    markdown: combinedMarkdown,
    screenshotUrl: home.screenshotUrl,
    screenshots,
    metadata: home.metadata,
  };
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
        const fcResult = await scrapeWithFirecrawl(url);
        aiResult = await classifyWithAi(
          fcResult.markdown,
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
        summary: aiResult.tagline || null,
        iconUrl: ghData.owner.avatar_url,
        bannerUrl: null,
        screenshots: [],
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
        brandColor: null,
        twitterUrl: null,
        linkedinUrl: null,
        facebookUrl: null,
        youtubeUrl: null,
      };
    }
  }

  // ── Generic website path ────────────────────────────────────────────────

  // Single Firecrawl call: markdown + screenshot + metadata in parallel with nothing
  const fcResult = await scrapeWithFirecrawl(url);
  const meta = fcResult.metadata;

  // Run AI classification
  const aiResult = await classifyWithAi(
    fcResult.markdown,
    meta.title,
    meta.description,
    url
  );

  // Build icon URL: favicon → Google S2 favicon fallback
  const iconUrl = meta.favicon || getFaviconUrl(url);
  // Prefer real Firecrawl screenshot, fall back to og:image
  const bannerUrl = fcResult.screenshotUrl || (meta.ogImage as string | undefined) || null;
  const screenshots = fcResult.screenshots.length > 0 ? fcResult.screenshots : (bannerUrl ? [bannerUrl] : []);

  // Try to detect GitHub link from scraped content
  const githubUrlFromContent = extractGitHubUrl(fcResult.markdown);

  // Extract branding + social links from crawled content
  const brandColor = extractBrandColor(meta);
  const socialLinks = extractSocialLinks(fcResult.markdown, meta);

  return {
    name: aiResult.name,
    tagline: aiResult.tagline,
    description: aiResult.description,
    summary: aiResult.tagline || null,
    iconUrl,
    bannerUrl,
    screenshots,
    techStack: deduplicateTechStack(aiResult.techStack),
    category: aiResult.category,
    githubUrl: githubUrlFromContent,
    isGithubRepo: false,
    githubStars: null,
    githubForks: null,
    githubLanguage: null,
    githubTopics: [],
    brandColor,
    twitterUrl: socialLinks.twitterUrl,
    linkedinUrl: socialLinks.linkedinUrl,
    facebookUrl: socialLinks.facebookUrl,
    youtubeUrl: socialLinks.youtubeUrl,
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
