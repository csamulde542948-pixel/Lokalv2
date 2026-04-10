import dns from "dns/promises";

/**
 * SSRF Protection Utility
 * ───────────────────────
 * Used by any resolver or service that fetches a user-supplied URL server-side
 * (scrapeProjectInfo, generateRoast, /og proxy).
 *
 * Checks:
 *  1. Valid URL structure
 *  2. Only http / https schemes allowed
 *  3. Hostname not a known internal alias
 *  4. DNS resolution does not point to a private/loopback/link-local IP
 */

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "0.0.0.0" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") || // AWS / GCP metadata endpoint
    ip.startsWith("fd") ||       // IPv6 ULA
    ip.startsWith("fc") ||       // IPv6 ULA
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) // 172.16–31.x.x
  );
}

/**
 * Validate that a URL is safe to fetch from the server.
 * Throws an Error with a user-facing message if the URL is not allowed.
 * Returns the normalised href if safe.
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are allowed");
  }

  const host = parsed.hostname.toLowerCase();

  // Block well-known internal hostnames
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("URL not allowed");
  }

  // DNS resolution check — prevents DNS rebinding attacks
  try {
    const { address } = await dns.lookup(host);
    if (isPrivateIp(address)) {
      throw new Error("URL resolves to a private or reserved IP address");
    }
  } catch (e: any) {
    // Re-throw our own domain errors as-is
    if (
      e.message === "URL not allowed" ||
      e.message === "URL resolves to a private or reserved IP address"
    ) {
      throw e;
    }
    // DNS lookup failure — fail closed
    throw new Error("URL could not be resolved");
  }

  return parsed.href;
}
