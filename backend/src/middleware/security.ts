/**
 * Security middleware for Lokal backend.
 *
 * Provides:
 * 1. Rate limiting (per-IP, per-endpoint)
 * 2. Login attempt tracking & brute-force protection
 * 3. Security audit logging
 * 4. Input sanitisation helpers
 * 5. Request validation
 */

import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";

// ─── Rate Limiters ───────────────────────────────────────────────────────────

/** General API rate limiter: 200 requests per 15-minute window */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

/** Auth endpoints: stricter limit — 20 requests per 15 min */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts. Please try again in 15 minutes.",
  },
});

/** GraphQL mutations: 60 per 15 min */
export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many mutations. Please slow down." },
  skip: (req) => {
    // Only rate-limit mutations, not queries
    const body = req.body;
    if (!body?.query) return true;
    return !body.query.trimStart().startsWith("mutation");
  },
});

// ─── Login Security Helpers ──────────────────────────────────────────────────

export interface LoginCheckResult {
  isLocked: boolean;
  lockoutMinutesRemaining: number;
  linkedProviders: string[];
  accountExists: boolean;
}

/**
 * Pre-login check: Is the account locked? What providers are linked?
 * Called before Supabase auth to give helpful error messages.
 */
export async function preLoginCheck(email: string): Promise<LoginCheckResult> {
  try {
    const profiles = await prisma.$queryRaw<
      { id: string; isLocked: boolean; lockedUntil: Date | null; failedLoginAttempts: number }[]
    >`
      SELECT "id", "isLocked", "lockedUntil", "failedLoginAttempts"
      FROM profiles WHERE "email" = ${email} LIMIT 1
    `;

    if (!profiles.length) {
      return {
        isLocked: false,
        lockoutMinutesRemaining: 0,
        linkedProviders: [],
        accountExists: false,
      };
    }

    const profile = profiles[0];
    let isLocked = profile.isLocked ?? false;
    const lockedUntil = profile.lockedUntil;

    if (isLocked && lockedUntil && new Date(lockedUntil) < new Date()) {
      await prisma.$executeRaw`
        UPDATE profiles
        SET "isLocked" = false, "lockedUntil" = NULL, "failedLoginAttempts" = 0, "updatedAt" = now()
        WHERE "id" = ${profile.id}::uuid
      `;
      isLocked = false;
    }

    let lockoutMinutesRemaining = 0;
    if (isLocked && lockedUntil) {
      lockoutMinutesRemaining = Math.max(
        0,
        Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000)
      );
    }

    // Get linked providers
    let linkedProviders: string[] = [];
    try {
      const links = await prisma.$queryRaw<{ provider: string }[]>`
        SELECT "provider" FROM "account_links" WHERE "profileId" = ${profile.id}::uuid
      `;
      linkedProviders = links.map((l) => l.provider);
    } catch {
      // account_links table might not exist yet
    }

    return {
      isLocked,
      lockoutMinutesRemaining,
      linkedProviders,
      accountExists: true,
    };
  } catch {
    // Columns might not exist if migration hasn't run
    // Fall back to basic check
    const profile = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
    return {
      isLocked: false,
      lockoutMinutesRemaining: 0,
      linkedProviders: [],
      accountExists: !!profile,
    };
  }
}

/**
 * Record a failed login attempt and possibly lock the account.
 */
export async function recordFailedLogin(
  email: string,
  reason: string = "invalid_password",
  ip?: string
): Promise<{ attempts: number; maxAttempts: number; isLocked: boolean }> {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 30;

  // Record in login_attempts table
  try {
    await prisma.$executeRaw`
      INSERT INTO "login_attempts" ("id", "email", "ipAddress", "success", "failReason", "createdAt")
      VALUES (gen_random_uuid()::text, ${email}, ${ip ?? null}::inet, false, ${reason}, now())
    `;
  } catch {
    // Table might not exist yet — don't break auth
  }

  // Increment on profile
  let profile: { id: string; failedLoginAttempts: number } | null = null;
  try {
    const rows = await prisma.$queryRaw<{ id: string; failedLoginAttempts: number }[]>`
      SELECT "id", COALESCE("failedLoginAttempts", 0) as "failedLoginAttempts"
      FROM profiles WHERE "email" = ${email} LIMIT 1
    `;
    profile = rows[0] ?? null;
  } catch {
    // Column might not exist; try basic lookup
    const p = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
    if (p) profile = { id: p.id, failedLoginAttempts: 0 };
  }

  if (!profile) {
    return { attempts: 0, maxAttempts: MAX_ATTEMPTS, isLocked: false };
  }

  const newAttempts = (profile.failedLoginAttempts ?? 0) + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;

  try {
    if (shouldLock) {
      await prisma.$executeRaw`
        UPDATE profiles
        SET "failedLoginAttempts" = ${newAttempts},
            "lastFailedLoginAt" = now(),
            "isLocked" = true,
            "lockedUntil" = now() + interval '30 minutes',
            "updatedAt" = now()
        WHERE "id" = ${profile.id}::uuid
      `;

      // Log security event
      await prisma.$executeRaw`
        INSERT INTO "security_events" ("id", "profileId", "eventType", "metadata", "createdAt")
        VALUES (gen_random_uuid()::text, ${profile.id}::uuid, 'account_locked',
          ${JSON.stringify({ reason: "too_many_failed_attempts", attempts: newAttempts })}::jsonb, now())
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE profiles
        SET "failedLoginAttempts" = ${newAttempts},
            "lastFailedLoginAt" = now(),
            "updatedAt" = now()
        WHERE "id" = ${profile.id}::uuid
      `;
    }
  } catch {
    // Columns might not exist yet if migration hasn't run
  }

  return {
    attempts: newAttempts,
    maxAttempts: MAX_ATTEMPTS,
    isLocked: shouldLock,
  };
}

/**
 * Record a successful login — resets failed counters.
 */
export async function recordSuccessfulLogin(
  email: string,
  provider: string = "email",
  ip?: string
): Promise<void> {
  try {
    await prisma.$executeRaw`
      UPDATE profiles
      SET "failedLoginAttempts" = 0, "isLocked" = false, "lockedUntil" = NULL, "updatedAt" = now()
      WHERE "email" = ${email}
    `;

    await prisma.$executeRaw`
      INSERT INTO "login_attempts" ("id", "email", "ipAddress", "success", "provider", "createdAt")
      VALUES (gen_random_uuid()::text, ${email}, ${ip ?? null}::inet, true, ${provider}, now())
    `;
  } catch {
    // Columns/table might not exist yet
  }
}

/**
 * Log a security event.
 */
export async function logSecurityEvent(
  profileId: string | null,
  eventType: string,
  metadata?: Record<string, any>,
  provider?: string,
  ip?: string
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "security_events" ("id", "profileId", "eventType", "provider", "ipAddress", "metadata", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${profileId}::uuid,
        ${eventType},
        ${provider ?? null},
        ${ip ?? null}::inet,
        ${JSON.stringify(metadata ?? {})}::jsonb,
        now()
      )
    `;
  } catch {
    // Don't break the app if security_events table doesn't exist yet
    console.warn("[security] Failed to log event:", eventType, metadata);
  }
}

// ─── Input Sanitization ──────────────────────────────────────────────────────

/** Strip HTML tags and trim whitespace */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML
    .replace(/&[a-z]+;/gi, "") // strip HTML entities
    .trim();
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 255;
}

/** Validate password strength */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (password.length > 128) {
    errors.push("Password must be less than 128 characters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Must contain at least one lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Must contain at least one uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Must contain at least one number");
  }

  // Calculate strength
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const strength: PasswordValidation["strength"] =
    score <= 1 ? "weak" : score <= 2 ? "fair" : score <= 3 ? "good" : "strong";

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/** Validate username format */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}
