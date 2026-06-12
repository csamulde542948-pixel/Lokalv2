/** Default assets served from /public/defaults/ */
export const DEFAULT_AVATAR = "/defaults/default-avatar.svg";
export const DEFAULT_COVER  = "/defaults/default-cover.png";

/**
 * Returns the avatar URL, falling back to the default SVG when null/undefined.
 */
export function avatarSrc(url: string | null | undefined): string {
  const trimmed = url?.trim();
  if (!trimmed) return DEFAULT_AVATAR;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

/**
 * Project-specific avatar adapter. Some upstream resolvers return a raw
 * Supabase storage path (no host) or a relative URL; this normalises to a
 * fully-qualified URL the browser can load. Falls back to DEFAULT_AVATAR
 * for nullish inputs. Kept as a separate name so callers can swap
 * resolution strategies per entity without forking the helper.
 */
export function adaptProjectAvatar(url: string | null | undefined): string {
  return avatarSrc(url);
}
