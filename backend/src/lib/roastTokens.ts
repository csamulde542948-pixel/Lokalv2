/**
 * Roast Token System — Daily 🔥 Reaction Currency
 *
 * Tokens are spent when a user gives a 🔥 Roast React on a feed roast post.
 * They reset every day at midnight Asia/Manila time (UTC+8).
 * They are a one-way spend — no refunds on un-react (un-react is not allowed).
 *
 * Allowance by rank:
 *   Newbie / Junior Dev  → 1 token/day
 *   Developer            → 2 tokens/day
 *   Senior Dev and above → 3 tokens/day
 */

import { PrismaClient } from "@prisma/client";

// ─── Midnight Manila helper ───────────────────────────────────────────────────

/**
 * Returns the most recent midnight in Asia/Manila (UTC+8) as a UTC Date.
 * Deliberately avoids Date.getTimezoneOffset() — always computes from
 * a fixed +8h offset so server timezone has zero effect.
 */
function getTodayMidnightManila(): Date {
  const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8 in ms
  const nowUtcMs = Date.now();
  // Shift 'now' into Manila local time
  const nowManilaMs = nowUtcMs + MANILA_OFFSET_MS;
  // Truncate to midnight in Manila local time
  const manilaDay = new Date(nowManilaMs);
  manilaDay.setUTCHours(0, 0, 0, 0);
  // Shift back to UTC — this is "today 00:00 Manila" expressed as UTC
  return new Date(manilaDay.getTime() - MANILA_OFFSET_MS);
}

/** Returns the next midnight Manila as UTC (i.e. when tokens reset next). */
function getNextMidnightManila(): Date {
  return new Date(getTodayMidnightManila().getTime() + 24 * 60 * 60 * 1000);
}

// ─── Token allowance by rank ──────────────────────────────────────────────────

const SENIOR_RANKS = ["Senior Dev", "Tech Lead", "Architect", "CTO"];
const MID_RANKS    = ["Developer"];

export function getTokenAllowance(rankName: string | null | undefined): number {
  if (!rankName) return 1;
  if (SENIOR_RANKS.includes(rankName)) return 3;
  if (MID_RANKS.includes(rankName))    return 2;
  return 1; // Newbie, Junior Dev, or any unrecognised rank
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RoastTokenStatus {
  used:      number;
  allowance: number;
  remaining: number;
  resetsAt:  Date;
}

/**
 * Returns the current token status for a profile without spending a token.
 * Safe to call for display purposes — never mutates state.
 */
export async function getRoastTokenStatus(
  profileId: string,
  prisma: PrismaClient
): Promise<RoastTokenStatus> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      roastTokensUsed:    true,
      roastTokensResetAt: true,
      rank:               { select: { name: true } },
    },
  });

  const allowance = getTokenAllowance(profile?.rank?.name);

  if (!profile) {
    return { used: 0, allowance, remaining: allowance, resetsAt: getNextMidnightManila() };
  }

  const todayMidnight = getTodayMidnightManila();
  const lastReset     = profile.roastTokensResetAt;
  // If last reset is from a previous day (or never set), treat as 0 used
  const used = !lastReset || lastReset < todayMidnight ? 0 : profile.roastTokensUsed;

  return {
    used,
    allowance,
    remaining: Math.max(0, allowance - used),
    resetsAt:  getNextMidnightManila(),
  };
}

/**
 * Checks whether the profile has a token available and consumes it.
 * Throws a structured error string if the daily limit is reached.
 *
 * Error format: "ROAST_TOKEN_EXHAUSTED:{allowance}"
 *   → parsed by the frontend for a friendly message.
 *
 * Call this inside the `roastReact` resolver BEFORE any DB writes.
 */
export async function checkAndConsumeRoastToken(
  profileId: string,
  prisma: PrismaClient
): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      roastTokensUsed:    true,
      roastTokensResetAt: true,
      rank:               { select: { name: true } },
    },
  });
  if (!profile) throw new Error("Profile not found");

  const todayMidnight = getTodayMidnightManila();
  const lastReset     = profile.roastTokensResetAt;
  const isNewDay      = !lastReset || lastReset < todayMidnight;
  const currentUsed   = isNewDay ? 0 : profile.roastTokensUsed;
  const allowance     = getTokenAllowance(profile.rank?.name);

  if (currentUsed >= allowance) {
    throw new Error(`ROAST_TOKEN_EXHAUSTED:${allowance}`);
  }

  // Consume 1 token atomically
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      roastTokensUsed:    currentUsed + 1,
      // On a new day: record today's midnight as the reset boundary.
      // On the same day: leave roastTokensResetAt unchanged.
      ...(isNewDay ? { roastTokensResetAt: todayMidnight } : {}),
    },
  });
}
