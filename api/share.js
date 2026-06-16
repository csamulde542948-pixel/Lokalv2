const SITE_ORIGIN = "https://lokalhost.club";
const FALLBACK_IMAGE = `${SITE_ORIGIN}/og-card.svg`;

const ROAST_QUERY = `
  query ShareRoast($id: ID!) {
    roastGeneration(id: $id) {
      id
      title
      quickRoast
      fullRoast
      projectUrl
      projectName
      screenshotUrl
      ogImageUrl
      createdAt
    }
  }
`;

const BRAND_QUERY = `
  query ShareBrand($id: ID!) {
    brandAnalysis(id: $id) {
      id
      title
      designMd
      projectUrl
      projectName
      screenshotUrl
      ogImageUrl
      createdAt
    }
  }
`;

function graphqlUrl() {
  const explicit = process.env.GRAPHQL_URL || process.env.VITE_GRAPHQL_URL;
  if (explicit) return explicit;

  const backend = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL;
  if (backend) return `${backend.replace(/\/+$/, "")}/graphql`;

  return "https://api.lokalhost.club/graphql";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripMarkdown(value = "") {
  return String(value)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value = "", max = 190) {
  const clean = stripMarkdown(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function absoluteUrl(value) {
  if (!value) return null;
  try {
    return new URL(value, SITE_ORIGIN).href;
  } catch {
    return null;
  }
}

function projectDomain(projectUrl) {
  try {
    return new URL(projectUrl).hostname.replace(/^www\./, "");
  } catch {
    return projectUrl || "a website";
  }
}

async function fetchGraphQL(query, id) {
  const response = await fetch(graphqlUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id } }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || "GraphQL error");
  }
  return payload.data;
}

function notFound(response) {
  response.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  return response.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Result not found | Lokalhost.club</title>
  </head>
  <body>Result not found.</body>
</html>`);
}

function pageHtml(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const shareUrl = escapeHtml(meta.shareUrl);
  const resultUrl = escapeHtml(meta.resultUrl);
  const projectName = escapeHtml(meta.projectName);
  const domain = escapeHtml(meta.domain);
  const eyebrow = escapeHtml(meta.eyebrow);
  const accent = meta.kind === "brand" ? "#06b6d4" : "#ff6600";
  const schema = JSON.stringify(meta.schema).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${shareUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="lokalhost.club" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${shareUrl}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:locale" content="en_PH" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@lokalhostclub" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">${schema}</script>
    <style>
      :root { color-scheme: dark; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080808; color: #f5f5f5; }
      .shell { width: min(920px, calc(100vw - 32px)); border: 1px solid rgba(255,255,255,.14); background: #111; box-shadow: 0 0 60px rgba(255,102,0,.13); }
      .bar { height: 42px; display: flex; align-items: center; gap: 8px; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.48); font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
      .dot { width: 9px; height: 9px; border-radius: 50%; background: ${accent}; box-shadow: 0 0 14px ${accent}; }
      .body { display: grid; grid-template-columns: minmax(0, 1fr) 310px; gap: 0; }
      .media { min-height: 340px; background: #050505; overflow: hidden; }
      .media img { width: 100%; height: 100%; min-height: 340px; object-fit: cover; object-position: top; opacity: .86; }
      .content { padding: 28px; border-left: 1px solid rgba(255,255,255,.12); }
      .eyebrow { color: ${accent}; font-size: 11px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 14px 0 14px; font-size: clamp(28px, 5vw, 44px); line-height: 1.02; letter-spacing: -.03em; }
      p { color: rgba(255,255,255,.64); line-height: 1.7; font-size: 14px; }
      .domain { color: rgba(255,255,255,.44); font-size: 12px; overflow-wrap: anywhere; }
      .cta { display: inline-flex; margin-top: 24px; padding: 12px 16px; background: ${accent}; color: #080808; text-decoration: none; font-weight: 900; font-size: 13px; }
      @media (max-width: 760px) { .body { grid-template-columns: 1fr; } .content { border-left: 0; border-top: 1px solid rgba(255,255,255,.12); } }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="bar"><span class="dot"></span>${eyebrow}</div>
      <section class="body">
        <div class="media"><img src="${image}" alt="" /></div>
        <div class="content">
          <div class="eyebrow">${domain}</div>
          <h1>${projectName}</h1>
          <p>${description}</p>
          <a class="cta" href="${resultUrl}">Open full result</a>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function buildMeta(type, id, record) {
  const isBrand = type === "brand";
  const domain = projectDomain(record.projectUrl);
  const projectName = record.projectName || domain;
  const image = absoluteUrl(record.ogImageUrl) || absoluteUrl(record.screenshotUrl) || FALLBACK_IMAGE;
  const shareUrl = `${SITE_ORIGIN}/share/${type}/${encodeURIComponent(id)}`;
  const resultUrl = isBrand
    ? `${SITE_ORIGIN}/roast/brand/${encodeURIComponent(id)}`
    : `${SITE_ORIGIN}/roast/result/${encodeURIComponent(id)}`;
  const title = isBrand
    ? `${projectName} Brand Analysis | Lokalhost.club`
    : `${projectName} Got Roasted | Lokalhost.club`;
  const description = isBrand
    ? truncate(record.designMd, 180) || `A Lokalhost.club brand and product design analysis of ${domain}.`
    : truncate(record.quickRoast || record.fullRoast, 180) || `A Lokalhost.club AI roast of ${domain}.`;
  const schemaType = isBrand ? "AnalysisNewsArticle" : "Review";

  return {
    kind: type,
    title,
    description,
    image,
    shareUrl,
    resultUrl,
    projectName,
    domain,
    eyebrow: isBrand ? "Lokal Brand Analysis" : "Loki Roast Result",
    schema: {
      "@context": "https://schema.org",
      "@type": schemaType,
      headline: title,
      description,
      image,
      url: shareUrl,
      datePublished: record.createdAt,
      author: { "@type": "Organization", name: "Lokalhost.club" },
      publisher: { "@type": "Organization", name: "Lokalhost.club", url: SITE_ORIGIN },
      about: {
        "@type": "WebSite",
        name: projectName,
        url: record.projectUrl,
      },
      isBasedOn: resultUrl,
    },
  };
}

export default async function handler(request, response) {
  const type = Array.isArray(request.query.type) ? request.query.type[0] : request.query.type;
  const id = Array.isArray(request.query.id) ? request.query.id[0] : request.query.id;

  if (!id || (type !== "roast" && type !== "brand")) {
    return notFound(response);
  }

  try {
    const data = type === "brand"
      ? await fetchGraphQL(BRAND_QUERY, id)
      : await fetchGraphQL(ROAST_QUERY, id);
    const record = type === "brand" ? data?.brandAnalysis : data?.roastGeneration;
    if (!record) return notFound(response);

    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response.status(200).send(pageHtml(buildMeta(type, id, record)));
  } catch (error) {
    console.error("[share-card]", error);
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    return response.status(502).send("Unable to render share preview.");
  }
}
