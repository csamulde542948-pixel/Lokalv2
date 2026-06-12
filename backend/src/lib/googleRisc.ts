import { createPublicKey } from "node:crypto";
import jwt, { JwtPayload } from "jsonwebtoken";

const RISC_CONFIGURATION_URL =
  "https://accounts.google.com/.well-known/risc-configuration";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_TOKEN_BYTES = 32_000;

interface RiscConfiguration {
  issuer: string;
  jwks_uri: string;
}

interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

let configurationCache: CachedValue<RiscConfiguration> | null = null;
let jwksCache: CachedValue<any[]> | null = null;

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Google RISC metadata request failed with ${response.status}`);
  }
  return response.json();
}

function configuredClientIds(): string[] {
  return (process.env.GOOGLE_RISC_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function getConfiguration(): Promise<RiscConfiguration> {
  if (configurationCache && configurationCache.expiresAt > Date.now()) {
    return configurationCache.value;
  }

  const data = await fetchJson(RISC_CONFIGURATION_URL);
  if (
    typeof data?.issuer !== "string" ||
    typeof data?.jwks_uri !== "string"
  ) {
    throw new Error("Google RISC configuration is invalid");
  }

  const jwksUrl = new URL(data.jwks_uri);
  if (
    jwksUrl.protocol !== "https:" ||
    !["www.googleapis.com", "accounts.google.com"].includes(jwksUrl.hostname)
  ) {
    throw new Error("Google RISC JWKS URL is not trusted");
  }

  const value = { issuer: data.issuer, jwks_uri: jwksUrl.href };
  configurationCache = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return value;
}

async function getJwks(jwksUri: string): Promise<any[]> {
  if (jwksCache && jwksCache.expiresAt > Date.now()) {
    return jwksCache.value;
  }

  const data = await fetchJson(jwksUri);
  if (!Array.isArray(data?.keys)) {
    throw new Error("Google RISC JWKS response is invalid");
  }

  jwksCache = {
    value: data.keys,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return data.keys;
}

export async function verifyGoogleRiscToken(token: string): Promise<JwtPayload> {
  if (Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) {
    throw new Error("Google RISC token is too large");
  }

  const clientIds = configuredClientIds();
  if (clientIds.length === 0) {
    throw new Error("GOOGLE_RISC_CLIENT_IDS is not configured");
  }

  const decoded = jwt.decode(token, { complete: true });
  if (
    !decoded ||
    typeof decoded === "string" ||
    decoded.header.alg !== "RS256" ||
    typeof decoded.header.kid !== "string"
  ) {
    throw new Error("Google RISC token header is invalid");
  }

  const configuration = await getConfiguration();
  const keys = await getJwks(configuration.jwks_uri);
  const jwk = keys.find(
    (candidate) =>
      candidate?.kid === decoded.header.kid &&
      candidate?.kty === "RSA" &&
      (!candidate?.alg || candidate.alg === "RS256")
  );
  if (!jwk) {
    jwksCache = null;
    throw new Error("Google RISC signing key was not found");
  }

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const verified = jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    audience: [clientIds[0], ...clientIds.slice(1)] as [
      string,
      ...string[],
    ],
    issuer: configuration.issuer,
    ignoreExpiration: true,
  });

  if (typeof verified === "string") {
    throw new Error("Google RISC token payload is invalid");
  }
  return verified;
}
