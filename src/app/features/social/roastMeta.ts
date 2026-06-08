/**
 * Helpers for extracting project metadata from a roast post.
 * Shared by RoastCardBody, post-modal, and the polymorphic PostCard
 * (used for the nested shared post) so the project-header layout stays
 * in sync across all surfaces.
 * extraction logic only lives in one place.
 */

const URL_REGEX = /https?:\/\/[^\s\)\]>"']+/i;

export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}

export function getDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

export function getFaviconUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
  } catch {
    return null;
  }
}

/**
 * Convenience: pull URL + domain + favicon from a roast post's content
 * in one call. Returns `undefined` for any field that couldn't be derived.
 */
export function extractRoastProjectMeta(content: string): {
  projectUrl: string | undefined;
  projectDomain: string | undefined;
  faviconUrl: string | undefined;
} {
  const projectUrl = extractFirstUrl(content) ?? undefined;
  const projectDomain = getDomain(projectUrl) ?? undefined;
  const faviconUrl = getFaviconUrl(projectUrl) ?? undefined;
  return { projectUrl, projectDomain, faviconUrl };
}

/**
 * Tags that are used internally by the roast system ("roast", "ai", "lokal")
 * and should be hidden from the user-facing tag list.
 */
export const ROAST_META_TAGS = new Set(["roast", "ai", "lokal"]);

export function filterDisplayTags<T extends { name: string }>(tags: T[] | null | undefined): T[] {
  return (tags ?? []).filter((t) => !ROAST_META_TAGS.has(t.name));
}
