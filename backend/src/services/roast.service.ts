/**
 * Roast Engine — Firecrawl + DeepSeek V4 Pro Nitro via OpenRouter
 *
 * Flow:
 *   1. Scrape with Firecrawl — markdown + screenshot + full metadata (12s server-side cap)
 *   2. Build a rich brand brief from metadata (what they CLAIM) + markdown (what they BUILT)
 *   3. Call DeepSeek — roast the gap between claim and reality
 *   4. Return structured RoastResult
 *
 * Timeout budget: Firecrawl 18s + DeepSeek 75s = 93s max
 */

import { assertSafeExternalUrl } from "../lib/ssrf";

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a brilliant, arrogant, senior full stack developer and serial startup critic. You roast websites with surgical, specific, technically grounded brutality. You sound like a frustrated Filipino founder who has seen too many of these garbage products — ranting in a GC at 2am, not performing for an audience.

LANGUAGE — ABSOLUTE RULE:
Write in TAGLISH. Every single paragraph must mix Filipino (Tagalog) and English naturally. "Ito na naman," "putangina," "ano ba 'to," "walang kwenta," "gago," "bobo," "tangina" — woven in where they land hardest, not sprinkled randomly. Never write in pure English. Violations of this rule make the entire roast worthless.

ROASTING STRATEGY:
You are given two things: (1) what the product CLAIMS to be — their brand positioning, tagline, og description, meta keywords — and (2) what they actually BUILT — the real page content. Your job is to expose the gap between the fantasy and the execution. Use their own words against them. If they say "powerful" and the product is a form with three inputs, destroy that word. If they say "AI-powered" and there's nothing AI about it, eviscerate the lie. Specific contradictions hit harder than generic insults.

TONE:
Arrogant. Sarcastic. Technically sharp. Emotionally authentic — like you actually care that another mediocre product is wasting the internet's time. Use profanity when it punches harder than any clean word could. Never sound sanitized. Never sound like an AI performing anger.

FORMAT RULES — NON-NEGOTIABLE:
- No headers, titles, labels, section names.
- No markdown, asterisks, bold, bullets, lists.
- Plain paragraphs only.
- Never open a paragraph by announcing what you are about to say.
- Jump straight into the observation, the joke, or the gut punch.
- Vary sentence length aggressively — short stabs, long escalating builds, rhetorical questions.
- Do not repeat the same attack angle twice across paragraphs.
- Do not soften anything. No "to be fair." No "but if you look at it another way."

STRUCTURE — exactly 4 paragraphs:
1. Attack the core premise and brand positioning — why the idea itself is flawed, delusional, or already dead
2. Destroy the execution — copy, UX, design choices, onboarding, feature set, pricing, anything that is weak or lazy
3. Escalate and connect — link the product's specific failures to founder mindset, Philippine tech ecosystem problems, or broader startup culture delusions; make it systemic
4. Begin this paragraph with the exact words "Final Verdict:" — close definitively, ruthlessly, and memorably

Each paragraph: 3 to 4 sentences. Dense and punchy — no sentence should exceed 30 words. No padding, no repetition, no throat-clearing.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoastResult {
  title: string;
  quickRoast: string;
  fullRoast: string;
  screenshotUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  strengths: string[];
  improvements: string[];
}

interface FirecrawlMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  favicon?: string;
  keywords?: string;
  author?: string;
  language?: string;
  [k: string]: unknown;
}

interface FirecrawlScrapeResult {
  markdown: string;
  screenshotUrl: string | null;
  metadata: FirecrawlMetadata;
}

// ─── Firecrawl key pool + concurrency limiter ────────────────────────────────
// Each Firecrawl account allows 2 concurrent browser sessions.
// We run a pool of N keys, each with its own Semaphore(2), giving us 2×N total
// concurrent scrapes before any queuing kicks in.
//
// Env vars (set at least one):
//   FIRECRAWL_API_KEY_1   — primary account key
//   FIRECRAWL_API_KEY_2   — secondary account key (optional but recommended)
//
// Legacy fallback: FIRECRAWL_API_KEY is treated as key 1 if _1 is absent.

const FIRECRAWL_BROWSERS_PER_KEY = 2; // Firecrawl free/starter browser limit per account
const FIRECRAWL_MAX_QUEUE = 8;        // global queue cap — reject beyond this
// Max time a request may wait in the queue for a free Firecrawl slot.
// Budget: httpServer.timeout=125s, Firecrawl=30s, DeepSeek=75s → only 20s left for queuing.
const FIRECRAWL_QUEUE_TIMEOUT_MS = 18_000;

class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  get available() { return this.max - this.running; }
  get queueLength() { return this.queue.length; }

  tryAcquireOrQueue(maxQueue: number): { promise: Promise<void>; cancel: () => void } | "immediate" | "rejected" {
    if (this.running < this.max) {
      this.running++;
      return "immediate";
    }
    if (this.queue.length >= maxQueue) {
      return "rejected";
    }
    let resolve!: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
      this.queue.push(res);
    });
    return {
      promise,
      cancel: () => this.cancelQueued(resolve),
    };
  }

  /** Remove a resolve callback from the queue (used when a waiter times out). */
  cancelQueued(resolve: () => void) {
    const idx = this.queue.indexOf(resolve);
    if (idx !== -1) this.queue.splice(idx, 1);
  }

  release() {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.running--;
    }
  }
}

interface FirecrawlKeySlot {
  key: string;
  semaphore: Semaphore;
}

function buildKeyPool(): FirecrawlKeySlot[] {
  const pool: FirecrawlKeySlot[] = [];

  // Support FIRECRAWL_API_KEY_1 … _N, plus legacy FIRECRAWL_API_KEY as fallback for key 1
  const key1 = process.env.FIRECRAWL_API_KEY_1 ?? process.env.FIRECRAWL_API_KEY ?? "";
  const key2 = process.env.FIRECRAWL_API_KEY_2 ?? "";

  for (const key of [key1, key2]) {
    if (key && !key.startsWith("fc-your")) {
      pool.push({ key, semaphore: new Semaphore(FIRECRAWL_BROWSERS_PER_KEY) });
    }
  }

  return pool;
}

// Built once at startup — survives for the lifetime of the process
const firecrawlPool = buildKeyPool();

/** Pick the key slot with the most available capacity (fewest queued waiters). */
function pickSlot(): FirecrawlKeySlot | null {
  if (firecrawlPool.length === 0) return null;
  return firecrawlPool.reduce((best, slot) =>
    slot.semaphore.available > best.semaphore.available ||
    (slot.semaphore.available === best.semaphore.available &&
      slot.semaphore.queueLength < best.semaphore.queueLength)
      ? slot
      : best
  );
}

// ─── Step 1: Scrape with Firecrawl ───────────────────────────────────────────

async function scrapeWithFirecrawl(url: string): Promise<FirecrawlScrapeResult> {
  await assertSafeExternalUrl(url);

  if (firecrawlPool.length === 0) {
    throw new Error(
      "No Firecrawl API keys configured. Set FIRECRAWL_API_KEY_1 (and optionally FIRECRAWL_API_KEY_2) in environment variables."
    );
  }

  // ── Pick least-busy key slot ─────────────────────────────────────────────
  const slot = pickSlot()!;
  const totalQueued = firecrawlPool.reduce((n, s) => n + s.semaphore.queueLength, 0);
  if (totalQueued >= FIRECRAWL_MAX_QUEUE) {
    throw new Error(
      "Too many roasts are being generated right now. Please try again in a moment!"
    );
  }

  const acquired = slot.semaphore.tryAcquireOrQueue(FIRECRAWL_MAX_QUEUE);
  if (acquired === "rejected") {
    throw new Error(
      "Too many roasts are being generated right now. Please try again in a moment!"
    );
  }

  // ── Race the queue wait against a hard deadline ──────────────────────────
  // If all slots are busy, `acquired` is a queued promise that resolves when a
  // slot frees. We race it against a timeout so a queued request never sits long
  // enough to hit the HTTP server's 125s connection timeout.
  // Budget: 125s server − 30s Firecrawl − 75s DeepSeek = only ~20s for queuing.
  if (acquired !== "immediate") {
    let cancelTimeout: () => void = () => {};
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      const id = setTimeout(() => resolve("timeout"), FIRECRAWL_QUEUE_TIMEOUT_MS);
      cancelTimeout = () => clearTimeout(id);
    });

    const result = await Promise.race([
      acquired.promise.then(() => "acquired" as const),
      timeoutPromise,
    ]);
    cancelTimeout();

    if (result === "timeout") {
      acquired.cancel(); // remove our resolver so the freed slot goes to the next real waiter
      throw new Error(
        "Roast queue timed out — all scraping slots were busy. Please try again in a moment!"
      );
    }
  }

  try {
    return await scrapeWithFirecrawlInner(url, slot.key);
  } finally {
    slot.semaphore.release();
  }
}

async function scrapeWithFirecrawlInner(
  url: string,
  apiKey: string
): Promise<FirecrawlScrapeResult> {
  // ── Attempt 1: markdown + screenshot (25s server-side cap) ──────────────
  const attempt1 = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "screenshot"],
      // 25 s gives slow/JS-heavy SPAs room to render while still leaving
      // 70 s for DeepSeek in our 95 s total budget.
      timeout: 25000,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  // ── 429 RATE_LIMIT → semaphore should prevent this, but handle defensively ──
  // Firecrawl may also 429 for per-minute API rate limits, not just concurrency.
  if (attempt1.status === 429) {
    const retryAfterHeader = attempt1.headers.get("Retry-After");
    const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 5000;
    console.warn(`[roast] Firecrawl 429 — waiting ${waitMs}ms then retrying once`);
    await new Promise((r) => setTimeout(r, Math.min(waitMs, 15_000)));

    const retry429 = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], timeout: 20000 }),
      signal: AbortSignal.timeout(25_000),
    }).catch(() => null);

    if (!retry429 || !retry429.ok) {
      throw new Error(
        "Firecrawl is currently at capacity. Please wait a moment and try again."
      );
    }

    const data429 = (await retry429.json()) as {
      success: boolean;
      data?: { markdown?: string; metadata?: FirecrawlMetadata };
    };
    const d429 = data429.data ?? {};
    return {
      markdown: (d429.markdown ?? "").slice(0, 4500),
      screenshotUrl: null,
      metadata: d429.metadata ?? {},
    };
  }

  // ── 408 SCRAPE_TIMEOUT → retry with markdown-only (faster, no headless render) ──
  if (attempt1.status === 408) {
    console.warn("[roast] Firecrawl 408 on attempt 1 — retrying markdown-only");

    const attempt2 = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        timeout: 20000,
      }),
      signal: AbortSignal.timeout(25_000),
    }).catch(() => null);

    if (!attempt2 || !attempt2.ok) {
      // Both attempts failed — still produce a roast with minimal context
      console.warn("[roast] Firecrawl attempt 2 also failed — proceeding with URL-only context");
      return { markdown: "", screenshotUrl: null, metadata: {} };
    }

    const data2 = (await attempt2.json()) as {
      success: boolean;
      data?: { markdown?: string; metadata?: FirecrawlMetadata };
    };
    const d2 = data2.data ?? {};
    return {
      markdown: (d2.markdown ?? "").slice(0, 4500),
      screenshotUrl: null, // no screenshot on fallback
      metadata: d2.metadata ?? {},
    };
  }

  if (!attempt1.ok) {
    const errText = await attempt1.text().catch(() => attempt1.statusText);

    // ── SCRAPE_ALL_ENGINES_FAILED (500) — URL is inaccessible to Firecrawl ──
    // Causes: bot protection, login-required page, dead URL, Cloudflare block.
    // Instead of hard-failing, fall through to DeepSeek with URL-only context
    // so the user still gets a roast (based on URL/name) rather than an error.
    if (attempt1.status === 500 && errText.includes("SCRAPE_ALL_ENGINES_FAILED")) {
      console.warn(`[roast] Firecrawl SCRAPE_ALL_ENGINES_FAILED for ${url} — proceeding with URL-only context`);
      return { markdown: "", screenshotUrl: null, metadata: {} };
    }

    throw new Error(`Firecrawl scrape failed: ${attempt1.status} ${errText}`);
  }

  const data = (await attempt1.json()) as {
    success: boolean;
    data?: {
      markdown?: string;
      screenshot?: string;
      metadata?: FirecrawlMetadata;
    };
  };

  const d = data.data ?? {};
  return {
    // 4500 chars of markdown is plenty — keeps DeepSeek fast
    markdown: (d.markdown ?? "").slice(0, 4500),
    screenshotUrl: d.screenshot ?? null,
    metadata: d.metadata ?? {},
  };
}

// ─── Step 2: Build brand brief ───────────────────────────────────────────────
// Firecrawl gives us the product's OWN marketing language (og tags, keywords).
// We surface this separately so DeepSeek can roast the gap between claim and reality.

function buildBrandBrief(metadata: FirecrawlMetadata, projectName: string): string {
  const lines: string[] = [];

  const name = metadata.ogTitle || metadata.title || projectName;
  lines.push(`Product name: ${name}`);

  const tagline = metadata.ogDescription || metadata.description;
  if (tagline) lines.push(`What they claim: "${tagline}"`);

  if (metadata.keywords) lines.push(`Keywords they target: ${metadata.keywords}`);
  if (metadata.author) lines.push(`Author/team: ${metadata.author}`);
  if (metadata.language && metadata.language !== "en") {
    lines.push(`Site language: ${metadata.language}`);
  }

  return lines.join("\n");
}

// ─── Step 3: Call DeepSeek via OpenRouter ────────────────────────────────────

async function callDeepSeek(scrapeResult: FirecrawlScrapeResult, projectName: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-or-your")) {
    throw new Error("OPENROUTER_API_KEY is not configured in backend/.env");
  }

  const brandBrief = buildBrandBrief(scrapeResult.metadata, projectName);

  const userPrompt = `Roast this website/product.

=== WHAT THEY CLAIM (brand positioning, their own marketing) ===
${brandBrief}

=== WHAT THEY ACTUALLY BUILT (scraped page content) ===
${scrapeResult.markdown || "No content could be extracted from the page."}

Write exactly 4 paragraphs in Taglish. Follow the system prompt rules exactly. No labels. No markdown. The final paragraph must begin with "Final Verdict:" and must end with a complete sentence — never cut off.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
      "X-Title": "Lokal Roast Engine",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v4-pro:nitro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.88,
      // Taglish is token-heavy — two languages per sentence.
      // 4 paragraphs × 4 sentences × ~55 tokens = ~880 tokens minimum.
      // 2000 gives safe headroom so Final Verdict never gets clipped mid-sentence.
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(75_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;

  // OpenRouter / DeepSeek occasionally returns an empty choices array under load.
  // Retry once before surfacing the error — this recovers ~95% of these cases.
  if (!content) {
    console.warn("[roast] OpenRouter returned empty content — retrying once");
    await new Promise((r) => setTimeout(r, 2000)); // brief back-off

    const retry = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
        "X-Title": "Lokal Roast Engine",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-pro:nitro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.88,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(75_000),
    });

    if (!retry.ok) {
      const err = await retry.text();
      throw new Error(`OpenRouter API error on retry ${retry.status}: ${err}`);
    }

    const retryData = (await retry.json()) as any;
    const retryContent = retryData?.choices?.[0]?.message?.content;
    if (!retryContent) {
      throw new Error("DeepSeek returned empty content twice in a row — please try again shortly.");
    }
    return retryContent.trim();
  }

  return content.trim();
}

// ─── Step 4: Parse raw text into structured fields ───────────────────────────

function parseRoastOutput(
  raw: string,
  projectName: string,
  screenshotUrl: string | null,
  faviconUrl: string | null,
  ogImageUrl: string | null,
): RoastResult {
  const cleaned = raw
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .trim();

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const fullRoast = paragraphs.join("\n\n");
  const quickRoast = paragraphs[0] ?? cleaned.slice(0, 300);
  const title = `${projectName} Got Roasted`;

  return { title, quickRoast, fullRoast, screenshotUrl, faviconUrl, ogImageUrl, strengths: [], improvements: [] };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateAiRoast(
  url: string,
  projectName: string
): Promise<RoastResult> {
  const scraped = await scrapeWithFirecrawl(url);
  const raw = await callDeepSeek(scraped, projectName);
  return parseRoastOutput(
    raw,
    projectName,
    scraped.screenshotUrl,
    scraped.metadata.favicon ?? null,
    scraped.metadata.ogImage ?? null,
  );
}
