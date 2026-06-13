import dns from "node:dns/promises";
import http, { IncomingHttpHeaders } from "node:http";
import https from "node:https";
import net from "node:net";

interface ResolvedExternalUrl {
  url: URL;
  address: string;
  family: 4 | 6;
}

export interface SafeExternalResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export class ExternalFetchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_URL"
      | "BLOCKED_ADDRESS"
      | "DNS_FAILURE"
      | "TIMEOUT"
      | "RESPONSE_TOO_LARGE"
      | "UNSUPPORTED_CONTENT_TYPE"
      | "FETCH_FAILED"
  ) {
    super(message);
    this.name = "ExternalFetchError";
  }
}

function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet < 0 || octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function isInIpv4Cidr(ip: number, base: string, prefix: number): boolean {
  const baseNumber = ipv4ToNumber(base);
  if (baseNumber === null) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ip & mask) === (baseNumber & mask);
}

function isPublicIpv4(address: string): boolean {
  const ip = ipv4ToNumber(address);
  if (ip === null) return false;

  const blockedRanges: Array<[string, number]> = [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.88.99.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 4],
    ["240.0.0.0", 4],
  ];

  return !blockedRanges.some(([base, prefix]) =>
    isInIpv4Cidr(ip, base, prefix)
  );
}

function ipv6ToBigInt(address: string): bigint | null {
  let normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }

  const ipv4Match = normalized.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Match) {
    const ipv4 = ipv4ToNumber(ipv4Match[1]);
    if (ipv4 === null) return null;
    normalized = normalized.replace(
      ipv4Match[1],
      `${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`
    );
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;

  const groups = [
    ...left,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...right,
  ];
  if (groups.length !== 8) return null;

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
    value = (value << 16n) | BigInt(`0x${group}`);
  }
  return value;
}

function isInIpv6Cidr(ip: bigint, base: string, prefix: number): boolean {
  const baseNumber = ipv6ToBigInt(base);
  if (baseNumber === null) return false;
  const shift = BigInt(128 - prefix);
  return (ip >> shift) === (baseNumber >> shift);
}

function isPublicIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0].replace(/^\[|\]$/g, "");
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIpv4(mapped[1]);

  const ip = ipv6ToBigInt(normalized);
  if (ip === null) return false;

  // Publicly routable IPv6 space is currently 2000::/3. Explicitly reject
  // special ranges inside it that can tunnel or represent non-public targets.
  if (!isInIpv6Cidr(ip, "2000::", 3)) return false;

  const blockedRanges: Array<[string, number]> = [
    ["2001::", 32],
    ["2001:2::", 48],
    ["2001:10::", 28],
    ["2001:20::", 28],
    ["2001:db8::", 32],
    ["2002::", 16],
  ];

  return !blockedRanges.some(([base, prefix]) =>
    isInIpv6Cidr(ip, base, prefix)
  );
}

export function isPublicIpAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

function parseExternalUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ExternalFetchError("Invalid URL format", "INVALID_URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ExternalFetchError(
      "Only http:// and https:// URLs are allowed",
      "INVALID_URL"
    );
  }
  if (parsed.username || parsed.password) {
    throw new ExternalFetchError("URL credentials are not allowed", "INVALID_URL");
  }

  const host = parsed.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    throw new ExternalFetchError("URL not allowed", "BLOCKED_ADDRESS");
  }

  return parsed;
}

export async function resolvePublicExternalUrl(
  rawUrl: string
): Promise<ResolvedExternalUrl> {
  const url = parseExternalUrl(rawUrl);
  const host = url.hostname.replace(/^\[|\]$/g, "");

  try {
    const addresses = await dns.lookup(host, { all: true, verbatim: true });
    if (addresses.length === 0) {
      throw new ExternalFetchError("URL could not be resolved", "DNS_FAILURE");
    }
    if (addresses.some(({ address }) => !isPublicIpAddress(address))) {
      throw new ExternalFetchError(
        "URL resolves to a private or reserved IP address",
        "BLOCKED_ADDRESS"
      );
    }

    const selected = addresses[0];
    if (selected.family !== 4 && selected.family !== 6) {
      throw new ExternalFetchError("URL could not be resolved", "DNS_FAILURE");
    }

    return {
      url,
      address: selected.address,
      family: selected.family,
    };
  } catch (error) {
    if (error instanceof ExternalFetchError) throw error;
    throw new ExternalFetchError("URL could not be resolved", "DNS_FAILURE");
  }
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<string> {
  return (await resolvePublicExternalUrl(rawUrl)).url.href;
}

export async function fetchSafeExternalHtml(
  rawUrl: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    maxBytes?: number;
  } = {}
): Promise<SafeExternalResponse> {
  const resolved = await resolvePublicExternalUrl(rawUrl);
  const { url, address, family } = resolved;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBytes = options.maxBytes ?? 1_000_000;
  const requestFn = url.protocol === "https:" ? https.request : http.request;
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  return new Promise<SafeExternalResponse>((resolve, reject) => {
    let settled = false;
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const request = requestFn(
      {
        protocol: url.protocol,
        hostname,
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: options.headers,
        servername: url.protocol === "https:" ? hostname : undefined,
        lookup: (_host, lookupOptions, callback) => {
          if (lookupOptions.all) {
            callback(null, [{ address, family }]);
            return;
          }
          callback(null, address, family);
        },
      },
      (response) => {
        const status = response.statusCode ?? 502;
        const contentLength = Number(response.headers["content-length"] ?? 0);
        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
          response.destroy();
          finishReject(
            new ExternalFetchError("Response too large", "RESPONSE_TOO_LARGE")
          );
          return;
        }

        const contentType = String(response.headers["content-type"] ?? "");
        if (
          contentType &&
          !contentType.toLowerCase().includes("text/html") &&
          !contentType.toLowerCase().includes("application/xhtml+xml")
        ) {
          response.destroy();
          finishReject(
            new ExternalFetchError(
              "URL did not return an HTML document",
              "UNSUPPORTED_CONTENT_TYPE"
            )
          );
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buffer.length;
          if (totalBytes > maxBytes) {
            response.destroy();
            finishReject(
              new ExternalFetchError("Response too large", "RESPONSE_TOO_LARGE")
            );
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => {
          if (settled) return;
          settled = true;
          resolve({
            status,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
        response.on("error", (error) => {
          finishReject(
            new ExternalFetchError(error.message, "FETCH_FAILED")
          );
        });
      }
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      finishReject(new ExternalFetchError("Request timed out", "TIMEOUT"));
    });
    request.on("error", (error) => {
      finishReject(new ExternalFetchError(error.message, "FETCH_FAILED"));
    });
    request.end();
  });
}
