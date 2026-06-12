export const LOKALHOST_VERIFIED_PROFILE_ID = "1efb2d7c-adf9-4c34-a292-72566f9271bc";

export function hasLokalhostVerifiedBadge(
  profileId?: string | null,
  isVerified?: boolean | null,
) {
  return Boolean(isVerified) && profileId === LOKALHOST_VERIFIED_PROFILE_ID;
}

export function VerifiedBadge({
  profileId,
  isVerified,
  className = "",
}: {
  profileId?: string | null;
  isVerified?: boolean | null;
  className?: string;
}) {
  if (!hasLokalhostVerifiedBadge(profileId, isVerified)) return null;

  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center ${className}`}
      role="img"
      aria-label="Verified lokalhost.club account"
    >
      <img
        src="/lokalhost_badge.svg"
        alt=""
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
