/**
 * Frontend security utilities and backend auth API helpers.
 *
 * Communicates with the backend's /auth/* REST endpoints for:
 * - Pre-login checks (account existence, lockout, provider hints)
 * - Login attempt recording
 * - Password validation
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreLoginCheckResult {
  isLocked: boolean;
  lockoutMinutesRemaining: number;
  providerHint: string | null;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}

export interface LoginRecordResult {
  attempts?: number;
  maxAttempts?: number;
  isLocked?: boolean;
  ok?: boolean;
}

// ─── API Calls ───────────────────────────────────────────────────────────────

/**
 * Pre-login check: does the account exist? Is it locked? What provider was used?
 * Call BEFORE attempting signInWithPassword.
 */
export async function preLoginCheck(email: string): Promise<PreLoginCheckResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/pre-login-check`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    // If backend is unreachable, don’t block login — fail open
    return {
      isLocked: false,
      lockoutMinutesRemaining: 0,
      providerHint: null,
    };
  }
}

/**
 * Record a login attempt (success or failure) for brute-force tracking.
 * Medium #16: Backend now requires a valid Bearer token so we pass it here.
 * If there is no token (e.g. wrong password — no session yet), the call is
 * skipped — failed-attempt tracking falls back to Supabase Auth Hooks.
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean,
  provider: string = "email",
  accessToken?: string
): Promise<LoginRecordResult> {
  // Without a token we can’t safely record failures (would be abusable).
  // Successful logins always have a session, so those still get recorded.
  if (!accessToken) return {};
  try {
    const res = await fetch(`${BACKEND_URL}/auth/record-login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, success, provider }),
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return {};
  }
}

// ─── Client-side Password Validation ─────────────────────────────────────────

/**
 * Validate password strength on the client side (instant feedback).
 * Mirrors the backend validation logic.
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters");
  }
  if (password.length > 128) {
    errors.push("Maximum 128 characters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }

  // Calculate strength score
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strength: PasswordValidation["strength"] =
    score <= 1 ? "weak" : score <= 2 ? "fair" : score <= 3 ? "good" : "strong";

  return { isValid: errors.length === 0, errors, strength };
}

/**
 * Validate email format on client side.
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 255;
}

/**
 * Validate username format on client side.
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}

// ─── Provider display names ──────────────────────────────────────────────────

export function providerDisplayName(provider: string): string {
  const map: Record<string, string> = {
    email: "Email & Password",
    google: "Google",
    github: "GitHub",
    web3: "Web3 Wallet",
    ethereum: "Web3 Wallet",
  };
  return map[provider] || provider;
}
