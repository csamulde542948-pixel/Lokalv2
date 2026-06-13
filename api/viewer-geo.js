const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

export function normalizeCountry(value) {
  const country = Array.isArray(value) ? value[0] : value;
  if (typeof country !== "string") return null;

  const normalized = country.trim().toUpperCase();
  return COUNTRY_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function resolveViewerCountry(headers) {
  const vercelCountry = headers?.["x-vercel-ip-country"];
  const cloudflareCountry = headers?.["cf-ipcountry"];
  return normalizeCountry(vercelCountry ?? cloudflareCountry);
}

export default function handler(request, response) {
  const country = resolveViewerCountry(request.headers);

  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Vary", "X-Vercel-IP-Country, CF-IPCountry");
  return response.status(200).json({
    country,
    detected: country !== null,
  });
}
