// ============================================================
// Screenshot Capture Service
// Captures website screenshots and uploads them to Supabase Storage
// Uses Microlink API (free, no key required — 50 req/day)
// Fallback: Google PageSpeed Insights screenshot (no key required)
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

// MED-04: Singleton client — avoids creating a new TCP connection pool on
// every captureAndUploadScreenshot call, which was wasteful and could exhaust
// the connection limit under load.
const supabaseStorage = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

/**
 * Build the Microlink screenshot API URL for a given website.
 * Returns a JSON response with `data.screenshot.url` containing a CDN image.
 */
function buildMicrolinkUrl(websiteUrl: string, width = 1920, height = 1080, fullLoad = true): string {
  const params = new URLSearchParams({
    url: websiteUrl,
    screenshot: "true",
    meta: "false",
    // Viewport size for the headless browser — full HD
    "viewport.width":  String(width),
    "viewport.height": String(height),
    "screenshot.type": "png",
    embed: "screenshot.url", // return the image directly instead of JSON
    ...(fullLoad && {
      // networkidle2: fire when ≤2 in-flight network requests for 500 ms.
      // More reliable than networkidle0 for sites with background polling.
      waitUntil: "networkidle2",
      // Hard pause AFTER the network-idle event — catches CSS animations,
      // JS-rendered content, skeleton loaders, lazy images, etc.
      waitForTimeout: "4000",
    }),
  });
  return `https://api.microlink.io/?${params.toString()}`;
}

/**
 * Fallback: Google PageSpeed / Lighthouse thumbnail.
 * Returns a base64-encoded JPEG screenshot via PageSpeed Insights API.
 */
async function fetchGooglePageSpeedScreenshot(websiteUrl: string): Promise<Buffer | null> {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(websiteUrl)}&category=PERFORMANCE&strategy=DESKTOP`;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(apiUrl, { signal: controller.signal })
      .finally(() => clearTimeout(timeoutId));

    if (!res.ok) return null;
    const json = await res.json();
    const base64 = json?.lighthouseResult?.audits?.["final-screenshot"]?.details?.data;
    if (!base64 || typeof base64 !== "string") return null;
    // Strip "data:image/jpeg;base64," prefix
    const raw = base64.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(raw, "base64");
  } catch {
    return null;
  }
}

/**
 * Generate a direct screenshot URL (no upload).
 * Uses Microlink embed mode which redirects to a CDN-hosted PNG.
 */
export function getScreenshotUrl(websiteUrl: string): string {
  return buildMicrolinkUrl(websiteUrl);
}

/**
 * Capture a screenshot of a website and upload it to Supabase Storage.
 * Returns the public URL of the uploaded screenshot.
 *
 * Strategy:
 *  1. Try Microlink embed (direct image redirect)
 *  2. Fallback: Google PageSpeed Insights thumbnail
 *  3. Last resort: Return Microlink direct URL (renders on demand)
 */
export async function captureAndUploadScreenshot(
  websiteUrl: string,
  projectId: string,
  userId: string
): Promise<string> {
  const microlinkUrl = buildMicrolinkUrl(websiteUrl);

  let imageBuffer: Buffer | null = null;
  let contentType = "image/png";

  // ── Attempt 1: Microlink ──
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 50_000);

    const response = await fetch(microlinkUrl, {
      headers: { Accept: "image/png,image/*" },
      redirect: "follow",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (response.ok) {
      const ct = response.headers.get("content-type") || "";
      if (ct.startsWith("image/")) {
        imageBuffer = Buffer.from(await response.arrayBuffer());
        contentType = ct.split(";")[0];
        console.log(`[Screenshot] Microlink OK for ${websiteUrl} (${imageBuffer.length} bytes)`);
      } else {
        // Microlink returned JSON/HTML instead of an image (rate-limited or error page)
        console.warn(`[Screenshot] Microlink returned non-image content-type "${ct}" for ${websiteUrl}`);
      }
    } else {
      console.warn(`[Screenshot] Microlink returned ${response.status} for ${websiteUrl}`);
    }
  } catch (err: any) {
    // ECONNRESET / "socket hang up" — Microlink closed the connection.
    // Fall through gracefully to PageSpeed fallback.
    const code: string = err?.code ?? err?.cause?.code ?? "";
    const isSocketReset = code === "ECONNRESET" || err?.message?.includes("socket hang up");
    if (isSocketReset) {
      console.warn(`[Screenshot] Microlink socket reset for ${websiteUrl} — trying PageSpeed fallback`);
    } else {
      console.warn(`[Screenshot] Microlink failed for ${websiteUrl}: ${err.message}`);
    }
  }

  // ── Attempt 2: Google PageSpeed ──
  if (!imageBuffer) {
    console.log(`[Screenshot] Trying Google PageSpeed for ${websiteUrl}…`);
    imageBuffer = await fetchGooglePageSpeedScreenshot(websiteUrl);
    if (imageBuffer) {
      contentType = "image/jpeg";
      console.log(`[Screenshot] PageSpeed OK for ${websiteUrl} (${imageBuffer.length} bytes)`);
    } else {
      console.warn(`[Screenshot] PageSpeed also failed for ${websiteUrl}`);
    }
  }

  // ── Upload to Supabase Storage ──
  if (imageBuffer && imageBuffer.length > 1000) {
    try {
      const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
      const storagePath = `${userId}/screenshots/${projectId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseStorage.storage
        .from("project-assets")
        .upload(storagePath, imageBuffer, {
          contentType,
          cacheControl: "86400",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`[Screenshot] Upload failed: ${uploadError.message}`);
        return microlinkUrl; // fallback
      }

      const { data: publicUrlData } = supabaseStorage.storage
        .from("project-assets")
        .getPublicUrl(storagePath);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.warn(`[Screenshot] Upload error: ${err.message}`);
    }
  }

  // ── Last resort: Microlink direct URL (renders on demand) ──
  return microlinkUrl;
}

/**
 * Generate a quick screenshot URL without uploading.
 * Useful for previews — smaller resolution.
 */
export function getQuickScreenshotUrl(websiteUrl: string): string {
  return buildMicrolinkUrl(websiteUrl, 1920, 1080, false);
}
