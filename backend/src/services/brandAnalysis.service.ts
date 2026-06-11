import {
  buildBrandBrief,
  FirecrawlBrandingProfile,
  FirecrawlScrapeResult,
  scrapeWithFirecrawl,
} from "./roast.service";

export interface BrandAnalysisResult {
  title: string;
  designMd: string;
  screenshotUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  projectUrl: string;
  projectName: string;
}

// Budget for the NVIDIA NIM (Kimi 2.6) call. Total budget for the full
// generateBrandDesignAnalysis call must fit under the HTTP server's
// 220s timeout (backend/src/index.ts:908) MINUS the Firecrawl budget
// (~42s worst case with branding profile). That leaves ~170s for the
// AI call. Kimi 2.6 streams fast on NVIDIA NIM — 170s is plenty for
// a "production-grade DESIGN.md" with 18 sections.
const BRAND_NVIDIA_TIMEOUT_MS = 170_000;
// Kimi 2.6's 16384 max output tokens is more than enough for the
// full DESIGN.md (the 18 sections routinely produce 4–6k tokens). We
// keep the full budget so the model never has to truncate.
const BRAND_NVIDIA_MAX_TOKENS = 16384;

function buildBrandingContext(branding: FirecrawlBrandingProfile | null): string {
  if (!branding) {
    return "No Firecrawl branding profile was returned. Use metadata and page content cautiously, and clearly label visual tokens as inferred.";
  }

  const trimmed = {
    colorScheme: branding.colorScheme,
    logo: branding.logo,
    images: branding.images,
    colors: branding.colors,
    fonts: branding.fonts,
    typography: branding.typography,
    spacing: branding.spacing,
    components: branding.components,
    icons: branding.icons,
    animations: branding.animations,
    layout: branding.layout,
    personality: branding.personality,
  };

  const serialized = JSON.stringify(trimmed, null, 2);
  return serialized.length > 6000
    ? `${serialized.slice(0, 6000)}\n...truncated for prompt budget`
    : serialized;
}

function hasUsefulBrandingProfile(branding: FirecrawlBrandingProfile | null): boolean {
  if (!branding) return false;
  return Boolean(
    branding.logo ||
    branding.images?.logo ||
    branding.images?.favicon ||
    Object.keys(branding.colors ?? {}).length > 0 ||
    (branding.fonts?.length ?? 0) > 0 ||
    Object.keys(branding.typography?.fontFamilies ?? {}).length > 0 ||
    Object.keys(branding.components ?? {}).length > 0
  );
}

function summarizeDetectedFonts(branding: FirecrawlBrandingProfile | null): string {
  if (!branding) return "No structured font data detected by Firecrawl.";

  const lines: string[] = [];
  for (const font of branding.fonts ?? []) {
    if (!font.family) continue;
    lines.push(`- ${font.role ?? "Font"}: ${font.family}${font.weight ? `, weight ${font.weight}` : ""}`);
  }

  const families = branding.typography?.fontFamilies ?? {};
  for (const [role, family] of Object.entries(families)) {
    if (family) lines.push(`- ${role}: ${family}`);
  }

  return lines.length > 0 ? lines.join("\n") : "No structured font data detected by Firecrawl.";
}

function firstDefined(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
}

function buildFirecrawlTokenSection(branding: FirecrawlBrandingProfile | null): string {
  if (!branding) {
    return [
      "## Detected Tokens",
      "No structured branding profile was returned for this page. Use metadata and page content cautiously.",
    ].join("\n");
  }

  const lines: string[] = [
    "## Detected Tokens",
    "These tokens are detected from the page and should be treated as the visual source of truth for this analysis.",
  ];

  const colors = Object.entries(branding.colors ?? {})
    .filter(([, value]) => typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value));
  if (colors.length > 0) {
    lines.push("", "### Color Palette");
    for (const [name, value] of colors) {
      lines.push(`- **${name}** (\`${value}\`): detected ${name} color token.`);
    }
  }

  const families = branding.typography?.fontFamilies ?? {};
  const fontFamiliesFromArray = (branding.fonts ?? [])
    .map((font) => font.family)
    .filter((font): font is string => Boolean(font));
  const primaryFont = firstDefined(families.primary, families.body, fontFamiliesFromArray[0]);
  const headingFont = firstDefined(families.heading, families.display, families.primary, primaryFont);
  const bodyFont = firstDefined(families.body, families.primary, primaryFont);
  const codeFont = firstDefined(families.code, families.mono, families.monospaced);

  if (primaryFont || headingFont || bodyFont || codeFont || (branding.fonts?.length ?? 0) > 0) {
    lines.push("", "### Typography");
    if (headingFont) lines.push(`Display: ${headingFont}`);
    if (headingFont) lines.push(`Heading: ${headingFont}`);
    if (bodyFont) lines.push(`Body: ${bodyFont}`);
    if (codeFont) lines.push(`Code: ${codeFont}`);

    for (const font of branding.fonts ?? []) {
      if (!font.family) continue;
      lines.push(`- **${font.role ?? "Font"}**: ${font.family}${font.weight ? `, weight ${font.weight}` : ""}`);
    }
  }

  if (branding.logo || branding.images?.logo || branding.images?.favicon || branding.images?.ogImage) {
    lines.push("", "### Brand Imagery");
    if (branding.logo) lines.push(`- Logo: ${branding.logo}`);
    if (branding.images?.logo) lines.push(`- Image logo: ${branding.images.logo}`);
    if (branding.images?.favicon) lines.push(`- Favicon: ${branding.images.favicon}`);
    if (branding.images?.ogImage) lines.push(`- Open graph image: ${branding.images.ogImage}`);
  }

  return lines.join("\n");
}

export async function callNvidiaForBrandDesign(
  scrapeResult: FirecrawlScrapeResult,
  projectName: string,
  url: string
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.startsWith("nvapi-your")) {
    throw new Error("NVIDIA_API_KEY is not configured in backend/.env");
  }

  const brandBrief = buildBrandBrief(scrapeResult.metadata, projectName);
  const brandingContext = buildBrandingContext(scrapeResult.branding);
  const detectedFonts = summarizeDetectedFonts(scrapeResult.branding);
  const systemPrompt = `You are a senior product designer, brand strategist, and UX reviewer creating a production-grade DESIGN.md brand analysis.

Source-of-truth rules:
- Firecrawl branding data is the primary source of truth for visual identity.
- Use Firecrawl branding fields for logo, favicon, colors, typography, spacing, components, imagery, layout, visual personality, and design system signals.
- Firecrawl metadata and page markdown are secondary context only for product positioning, copy, audience, UX, and content interpretation.
- If Firecrawl branding conflicts with page markdown or your assumptions, trust Firecrawl branding.
- Do not invent colors, fonts, logos, component styles, imagery, layout patterns, or brand attributes that are not supported by Firecrawl data.
- Use exact hex values and exact font family names from Firecrawl whenever present.
- If a visual token is missing, write "not detected by Firecrawl" before giving a clearly labeled recommendation or inference.
- Do not use generic fallback examples like Inter/system-ui unless Firecrawl actually detected those fonts.

Required analysis behavior:
- Analyze as a professional product designer, not a copywriter summary bot.
- Explain what the current brand communicates, what is working, what is weak, why it matters, and what concrete improvements should be made.
- Keep recommendations actionable for founders, product designers, and frontend engineers.
- Separate detected facts from recommendations.
- No roast tone, jokes, profanity, or unsupported speculation.

Required output structure:
# design.md
## Design Overview
## Brand Snapshot
## Positioning
## Audience
## Color Palette
## Typography
### Type Specimens
## Visual Identity
## UX and Content Observations
## Trust Signals
## Component Patterns
## Layout and Spacing
## Recommended Design Direction
## Priority Improvements
## Action Plan
### Quick Wins
### Next Iteration
### Strategic Bets
## Implementation Notes`;
  const prompt = `Create a formal brand and product design analysis as a production-grade DESIGN.md document.

Use Firecrawl as the source of truth. The Firecrawl branding profile is the primary source for logo, color palette, typography, spacing, component styling, layout, imagery, and visual personality. Firecrawl metadata and page markdown are secondary context for positioning, messaging, UX, and content.
If Firecrawl branding conflicts with page markdown, trust the structured branding profile for visual tokens. Do not invent details that are not supported by Firecrawl. Use the exact hex values and font family names from the Firecrawl branding profile whenever present. If exact fonts or colors are missing, say "not detected by Firecrawl" before giving any inferred recommendation.

Typography requirement:
- Use the detected Firecrawl font families below as the typography source of truth.
- Do not output generic fallback specimens like Inter/system-ui unless Firecrawl actually detected those fonts.
- In the Typography section, include lines that start with "Display:", "Heading:", and "Body:" followed by the exact detected font family where available.

Detected Firecrawl fonts:
${detectedFonts}

Act like a senior product designer, brand strategist, and conversion-focused UX reviewer. Do not merely describe the brand. Analyze what the current experience communicates, diagnose weaknesses, explain why they matter, and recommend actionable improvements a founder or designer can implement.

Target URL: ${url}

=== FIRECRAWL BRAND METADATA ===
${brandBrief}

=== FIRECRAWL BRANDING PROFILE (PRIMARY VISUAL SOURCE OF TRUTH) ===
${brandingContext}

=== FIRECRAWL PAGE CONTENT ===
${scrapeResult.markdown || "No page content could be extracted."}

Return clean markdown only. Use this structure:
# design.md
## Design Overview
Title this section "Design System Inspired by \"${projectName}\"". Provide a high-level executive summary of the brand's design system: what the brand is, its core aesthetic, visual personality, key design decisions observed, strengths, and critical gaps. This is the 60-second read for a stakeholder — keep it to 4-6 paragraphs covering brand purpose, design quality, consistency, and the one thing the team should fix first.
## Brand Snapshot
Summarize the product, current visual personality, maturity level, and design confidence in 3-5 concise bullets.
## Positioning
Explain what the brand appears to promise, where the message is strong, and where the message is vague or generic.
## Audience
Identify likely user segments, their intent, and what they need to trust before converting.
## Color Palette
Group colors under these exact subheadings when available: ### Primary, ### Accent, ### Neutral, ### Surface & Borders, ### Semantic / Status.
For every color use this exact bullet format:
- **Token Name** (\`#HEX\`): role and recommended usage.
Include only colors supported by Firecrawl branding first. You may add a short "Recommended additions" subsection only after the detected palette, and those must be clearly labeled as recommendations.
## Typography
Include font family, fallback stack, sizes, weights, line heights, and usage rules. If a font is inferred, label it as inferred and explain the evidence.
Do not replace detected Firecrawl fonts with generic choices like Inter unless Firecrawl detects Inter or no font is detected.
### Type Specimens
Include at least three specimens using the recommended typography:
- Display specimen: one short headline written in the brand voice
- Heading specimen: one product-section heading
- Body specimen: two short sentences of product UI copy
## Visual Identity
## UX and Content Observations
Separate strengths from problems. Be specific about hierarchy, clarity, calls to action, above-the-fold communication, trust, accessibility, and visual consistency.
## Trust Signals
## Component Patterns
## Layout and Spacing
## Recommended Design Direction
Define the strongest design direction in plain language, then list concrete style rules that preserve the brand.
## Priority Improvements
Provide 6-10 prioritized improvements. Each item must include: problem, why it matters, and specific action.
## Action Plan
Create three groups: ### Quick Wins, ### Next Iteration, ### Strategic Bets. Each group should contain concrete tasks that a product designer or frontend engineer can execute.
## Implementation Notes
Include practical tokens, component guidance, responsive behavior, and accessibility checks.

Be specific, formal, and useful for a founder/designer. The style should be close to a DesignMD library entry: practical tokens, specimens, and implementation guidance. No roast tone, no profanity, no jokes.`;

  let res: Response;
  try {
    res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.FRONTEND_URL ?? "https://lokalhost.club",
      "X-Title": "Lokal Brand Analyzer",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: "moonshotai/kimi-k2.6",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: prompt },
      ],
      temperature: 1.0,
      top_p: 1.0,
      max_tokens: BRAND_NVIDIA_MAX_TOKENS,
      // Stream the response. The AbortSignal above only fires on
      // COMPLETE silence for BRAND_NVIDIA_TIMEOUT_MS — receiving
      // a chunk resets the wall-clock on Node's TCP read side. This
      // lets the model take up to (effectively) the full budget for
      // slow generation, instead of timing out because the response
      // body was still in flight.
      stream: true,
    }),
      signal: AbortSignal.timeout(BRAND_NVIDIA_TIMEOUT_MS),
    });
  } catch (error: any) {
    const message = String(error?.message ?? "");
    const isTimeout =
      error?.name === "TimeoutError" ||
      error?.name === "AbortError" ||
      /aborted.*timeout|timeout/i.test(message);
    if (isTimeout) {
      throw new Error("Brand analysis timed out while generating design.md. The page was scraped, but the AI response took too long. Try again or use a simpler public landing page.");
    }
    throw error;
  }

  if (!res.ok || !res.body) {
    const err = res.body ? await res.text() : "(no response body)";
    throw new Error(`NVIDIA NIM API error ${res.status}: ${err}`);
  }

  // Parse SSE stream. Each event is `data: {json}\n\n`. A `data: [DONE]`
  // sentinel marks the end. We accumulate `choices[0].delta.content`
  // from every chunk. This is what `stream: true` enables — we get the
  // first token in seconds, not after the full response body transmits.
  // The AbortSignal only fires if NO chunk arrives for 170s.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by \n\n. Process every complete event.
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);
        if (!event.startsWith("data:")) continue;
        const payload = event.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            content += delta;
          }
        } catch {
          // Incomplete chunk — wait for more bytes (next read iteration).
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!content) {
    throw new Error("DeepSeek returned empty brand analysis content. Please try again shortly.");
  }
  return content.trim();
}

export async function generateBrandDesignAnalysis(
  url: string,
  projectName: string
): Promise<BrandAnalysisResult> {
  const scraped = await scrapeWithFirecrawl(url, { includeBranding: true });
  if (!hasUsefulBrandingProfile(scraped.branding) && !scraped.markdown.trim()) {
    throw new Error(
      "Firecrawl could not extract enough branding or page content for a reliable brand analysis. Try a public landing page with visible logo, colors, copy, and typography."
    );
  }

  const firecrawlTokenSection = buildFirecrawlTokenSection(scraped.branding);
  const aiDesignMd = await callNvidiaForBrandDesign(scraped, projectName, url);
  const designMd = `${firecrawlTokenSection}\n\n${aiDesignMd}`;
  return {
    title: `Design System Inspired by "${projectName}"`,
    designMd,
    screenshotUrl: scraped.screenshotUrl,
    faviconUrl: scraped.metadata.favicon ?? scraped.branding?.images?.favicon ?? scraped.branding?.logo ?? scraped.branding?.images?.logo ?? null,
    ogImageUrl: scraped.metadata.ogImage ?? scraped.branding?.images?.ogImage ?? null,
    projectUrl: url,
    projectName,
  };
}
