export const EMAIL_SIGNUP_COOLDOWN_MS = 15 * 60 * 1000;

type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export function isEmailSendRateLimitError(error: AuthErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "over_email_send_rate_limit") return true;

  return (
    error.status === 429
    && /email.*rate limit|rate limit.*email/i.test(error.message ?? "")
  );
}

export function getCooldownMinutesRemaining(
  cooldownUntil: number,
  now: number = Date.now()
): number {
  return Math.max(0, Math.ceil((cooldownUntil - now) / 60_000));
}
