/** Default assets served from /public/defaults/ */
export const DEFAULT_AVATAR = "/defaults/default-avatar.svg";
export const DEFAULT_COVER  = "/defaults/default-cover.png";

/**
 * Returns the avatar URL, falling back to the default SVG when null/undefined.
 */
export function avatarSrc(url: string | null | undefined): string {
  return url || DEFAULT_AVATAR;
}
