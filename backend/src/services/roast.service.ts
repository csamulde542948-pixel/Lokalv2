/**
 * Roast Engine — Jina Reader + DeepSeek V3.2 Nitro via OpenRouter
 *
 * Flow:
 *   1. Scrape the target URL with Jina Reader (r.jina.ai)
 *   2. Build a prompt with the scraped content + system prompt
 *   3. Call DeepSeek V3.2 Nitro via OpenRouter (fastest routing, no queue)
 *   4. Return the raw 6-paragraph Taglish roast
 */

const SYSTEM_PROMPT = `You are a brilliant, arrogant, senior full stack developer — a trashtalker who roasts websites with brutal, specific, technical precision. You sound like a frustrated Filipino founder ranting in a GC, not an AI assistant.

‼️ LANGUAGE RULE — NON-NEGOTIABLE:
You MUST write in TAGLISH — a natural mix of Filipino (Tagalog) and English in every paragraph.
NEVER write in pure English. Every paragraph must have Tagalog words and phrases woven naturally into it.

TONE & STYLE:
- Arrogant, sarcastic, trashtalking. Use sarcastic jokes, no cute metaphors.
- Profanity feels natural — use putangina, gago, bobo, tangina, (sarcastically), etc. when it strengthens the point.
- Never sound robotic. Write like a real person ranting, not an AI generating text.
- Do NOT add section titles or labels to paragraphs.
- Use hate speech and slurs and profanity when it fits the tone. The goal is to be brutally honest and specific.
- Connect to Filipino culture, tech scene, trendiing issues.
- Connect to latest issues/trends in tech when relevant in Philippine context (e.g. "This looks like another one of those 'support local devs' scams that only exist to get government grants.")

STRUCTURE (follow this order, no labels, no openers that reference the section):
Write 6 paragraphs in this natural flow:
- Start by describing what the product/person is trying to present and why the core idea or positioning is flawed or overreaching
- Then tear apart why it doesn't land — who won't be impressed and why
- Then go after the copy, messaging, and UI/UX — weak writing, vague claims, bad design choices
- Then escalate — get more brutal, connect small failures to bigger systemic ones, pile on
- Then one more paragraph of pure brutality — expose the assumptions, the delusion, the incompetence
- End with a paragraph that starts exactly with "Final Verdict:" — a strong, grounded conclusion

OUTPUT FORMAT:
- 6 paragraphs total — each paragraph 4–5 sentences. Be detailed and specific.
- NEVER start a paragraph by announcing its topic. Jump straight into the observation or joke.
- Do NOT add titles, headers, labels, bullet points, or lists of any kind.
- PLAIN PARAGRAPHS ONLY. No markdown, no asterisks, no bold text, no symbols.
- ALWAYS end with the "Final Verdict:" paragraph — never cut off mid-sentence.`;

export interface RoastResult {
  title: string;
  quickRoast: string;   // First paragraph — the hook
  fullRoast: string;    // All 6 paragraphs joined
  overallScore: number; // 1–5 computed from sentiment
  strengths: string[];  // kept for schema compat — returns empty array
  improvements: string[]; // kept for schema compat — returns empty array
}

// ─── Step 1: Scrape with Jina Reader ─────────────────────────────────────────

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
  // Trim to ~6000 chars to stay within context limits
  return text.slice(0, 6000);
}

// ─── Step 2: Call DeepSeek via OpenRouter ─────────────────────────────────────

async function callDeepSeek(scrapedContent: string, projectName: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-or-your")) {
    throw new Error("OPENROUTER_API_KEY is not configured in backend/.env");
  }

  const userPrompt = `Roast this website/product called "${projectName}".

Here is the scraped content from their site:

---
${scrapedContent}
---

Write 6 paragraphs. Follow the system prompt exactly. No labels, no headers. End with "Final Verdict:".`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
      "X-Title": "Lokal Roast Engine",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v3.2:nitro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(110_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned empty content");
  return content.trim();
}

// ─── Step 3: Parse the raw text into structured fields ────────────────────────

function parseRoastOutput(raw: string, projectName: string): RoastResult {
  // Strip any accidental markdown (bold, italics, headers) the model sneaks in
  const cleaned = raw
    .replace(/#{1,6}\s*/g, "")       // markdown headers
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // bold/italic
    .trim();

  // Split on blank lines to get paragraphs
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  const fullRoast = paragraphs.join("\n\n");
  const quickRoast = paragraphs[0] ?? cleaned.slice(0, 300);
  const title = `${projectName} Got Roasted`;

  // Score 1–5: count Filipino + English profanity/insults
  const brutalWords = [
    "gago", "bobo", "putangina", "tangina", "walang kwenta",
    "pointless", "useless", "terrible", "awful", "incompetent",
    "delusion", "pathetic", "joke", "embarrassing", "scam",
  ];
  const lower = cleaned.toLowerCase();
  const harshCount = brutalWords.reduce(
    (acc, w) => acc + (lower.split(w).length - 1),
    0
  );
  const overallScore = Math.max(1, Math.min(5, 5 - Math.floor(harshCount / 3)));

  return {
    title,
    quickRoast,
    fullRoast,
    overallScore,
    strengths: [],
    improvements: [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateAiRoast(
  url: string,
  projectName: string
): Promise<RoastResult> {
  // Scrape
  const scraped = await scrapeWithJina(url);

  // Generate
  const raw = await callDeepSeek(scraped, projectName);

  // Parse
  return parseRoastOutput(raw, projectName);
}
