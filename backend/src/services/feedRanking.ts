/**
 * Lokal Feed Ranking Service — Phase 3 (Feedback Loops & Online Learning)
 * ─────────────────────────────────────────────────────────────────────────
 * Facebook-inspired scoring pipeline:
 *
 * Stage 1: GetStream delivers raw candidate activities (done in resolvers)
 * Stage 2: Collect signals per post
 * Stage 3: Score each post (with full breakdown for FeedScoreLog)
 * Stage 4: Diversity pass (author + type diversification)
 * Stage 5: Return ranked list + log score breakdowns
 *
 * Phase 3 additions:
 * - scorePost returns full breakdown object (for FeedScoreLog)
 * - Configurable weights via FeedConfig (DB-backed, cached)
 * - Session-aware semantic boost (low-CTR sessions get extra semantic weight)
 * - CTR tracking via PostView position/engaged fields
 */

export interface PostSignals {
  postId: string;
  authorId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  authorXp: number;             // author's XP/rank score
  tagAffinityScore: number;     // cosine sim between user interests & post tags
  socialProof: number;          // how many of the user's follows liked this
  isFromFollowing: boolean;     // is this from someone the user follows?
  authorAffinityScore: number;  // composite author affinity (sigmoid-normalized 0–1)
  postType: "post" | "roast" | "project" | "event";
  notInterested?: boolean;      // user explicitly marked "not interested"
  semanticRelevance?: number;   // 0–1 cosine similarity between user interest & post embedding
  avgDwellMs?: number;          // average dwell time across all viewers (quality signal)
  feedVariant?: "ranked" | "chronological"; // A/B test variant
  reactionWeightedLikes?: number; // weighted likes score (Love/Fire=2.0, Haha=1.5, Like=1.0, etc.)
  // ─── Phase 0: per-user signals (the user's OWN behavior on this post) ───
  ownDwellMs?: number;          // user's own dwell on this post (0 if never seen)
  ownDwellScore?: number;       // 0–1 normalised ownDwellMs (sigmoid 8s midpoint)
  ownEngaged?: boolean;         // did THIS user engage with this post previously?
  modalOpenScore?: number;      // 0–1 — recent MODAL_OPEN events for this post by this user
  commentQualityScore?: number; // 0–1 — post's discussion quality (reply + reaction density)
}

/** Full score breakdown — logged to feed_score_logs for every ranked post */
export interface ScoreBreakdown {
  finalScore: number;
  engagementScore: number;
  decayFactor: number;
  rankBoost: number;
  socialBoost: number;
  typeBoost: number;
  interestBoost: number;
  followingBoost: number;
  authorAffinityBoost: number;
  velocityBoost: number;
  semanticBoost: number;
  dwellBoost: number;
  freshnessBoost: number;
  notInterestedPenalty: number;
  // ─── Phase 0: per-user signals ───
  ownDwellBoost: number;        // 1.0–2.0 from the user's own dwell on this post
  modalOpenBoost: number;       // 1.0–1.5 from recent modal opens on this post
  commentQualityBoost: number;  // 1.0–1.4 from discussion quality
}

/** Externalized weight configuration — loaded from feed_config table, cached in memory */
export interface FeedWeightConfig {
  // Engagement weights
  engagementLikeWeight: number;     // default 1.5
  engagementCommentWeight: number;  // default 2.0
  engagementShareWeight: number;    // default 3.0
  // Type multipliers
  typeProjectMultiplier: number;    // default 1.4
  typeRoastMultiplier: number;      // default 1.3
  typeEventMultiplier: number;      // default 1.2
  typePostMultiplier: number;       // default 1.0
  // Boost multipliers
  followingBoostValue: number;      // default 1.5
  notInterestedPenaltyValue: number; // default 0.05
  // Decay
  decayLambda: number;              // default 0.029 (24h half-life)
  // Session-aware semantic boost
  lowCtrSemanticMultiplier: number; // default 1.5 — extra semantic weight when session CTR < 10%
  lowCtrThreshold: number;          // default 0.10
  // Freshness boost — temporary lift for new posts so they reach the top of the feed
  freshnessBoostUnderOneHour: number;    // default 4.0 — < 1h old
  freshnessBoostUnderThreeHours: number; // default 2.5 — 1–3h old
  freshnessBoostUnderSixHours: number;   // default 1.5 — 3–6h old
  // Phase 0: per-user signal weights
  ownDwellBoostMax: number;          // default 2.0 — max boost from user's own dwell
  ownDwellMidpoint: number;          // default 8.0 — sigmoid midpoint (seconds) for own dwell
  modalOpenBoostMax: number;         // default 1.5 — max boost from recent modal opens
  modalOpenDecayHours: number;       // default 24.0 — modal-open signal half-life
  commentQualityBoostMax: number;    // default 1.4 — max boost from discussion quality
}

export const DEFAULT_WEIGHTS: FeedWeightConfig = {
  engagementLikeWeight: 1.5,
  engagementCommentWeight: 2.0,
  engagementShareWeight: 3.0,
  typeProjectMultiplier: 1.4,
  typeRoastMultiplier: 1.3,
  typeEventMultiplier: 1.2,
  typePostMultiplier: 1.0,
  followingBoostValue: 1.5,
  notInterestedPenaltyValue: 0.05,
  decayLambda: 0.029,
  lowCtrSemanticMultiplier: 1.5,
  lowCtrThreshold: 0.10,
  freshnessBoostUnderOneHour: 4.0,
  freshnessBoostUnderThreeHours: 2.5,
  freshnessBoostUnderSixHours: 1.5,
  ownDwellBoostMax: 2.0,
  ownDwellMidpoint: 8.0,
  modalOpenBoostMax: 1.5,
  modalOpenDecayHours: 24.0,
  commentQualityBoostMax: 1.4,
};

// ─── In-memory config cache with TTL ────────────────────────

let cachedWeights: FeedWeightConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Safe config reader: returns the DB value only when it is a finite number AND
 * passes the optional minimum-value guard.  Falls back to the default otherwise.
 *
 * Using `?? default` alone is NOT sufficient because 0 is falsy in JS only for
 * the `||` operator — `??` lets 0 through.  We therefore use an explicit finite
 * + minimum check so that a corrupt DB row (value = 0, NaN, Infinity) can never
 * zero-out a multiplier and blank the entire feed.
 */
function safeWeight(
  map: Map<string, number>,
  key: string,
  fallback: number,
  min = -Infinity
): number {
  const v = map.get(key);
  if (v === undefined || !Number.isFinite(v) || v < min) return fallback;
  return v;
}

/**
 * Load weight config from DB (feed_config table).
 * Caches in memory for 60 seconds to avoid DB hit every request.
 * Falls back to DEFAULT_WEIGHTS on any error.
 */
export async function loadWeightConfig(prisma: any): Promise<FeedWeightConfig> {
  if (cachedWeights && Date.now() < cacheExpiry) {
    return cachedWeights;
  }
  try {
    const rows: { key: string; value: number }[] = await prisma.feedConfig.findMany();
    const configMap = new Map(rows.map((r) => [r.key, r.value]));

    // Multipliers that appear directly in the final product MUST be ≥ 0.1 so that
    // a single zero value cannot collapse the entire feed score to 0.
    cachedWeights = {
      engagementLikeWeight:      safeWeight(configMap, "engagementLikeWeight",      DEFAULT_WEIGHTS.engagementLikeWeight,      0),
      engagementCommentWeight:   safeWeight(configMap, "engagementCommentWeight",    DEFAULT_WEIGHTS.engagementCommentWeight,   0),
      engagementShareWeight:     safeWeight(configMap, "engagementShareWeight",      DEFAULT_WEIGHTS.engagementShareWeight,     0),
      typeProjectMultiplier:     safeWeight(configMap, "typeProjectMultiplier",      DEFAULT_WEIGHTS.typeProjectMultiplier,     0.1),
      typeRoastMultiplier:       safeWeight(configMap, "typeRoastMultiplier",        DEFAULT_WEIGHTS.typeRoastMultiplier,       0.1),
      typeEventMultiplier:       safeWeight(configMap, "typeEventMultiplier",        DEFAULT_WEIGHTS.typeEventMultiplier,       0.1),
      typePostMultiplier:        safeWeight(configMap, "typePostMultiplier",         DEFAULT_WEIGHTS.typePostMultiplier,        0.1),
      followingBoostValue:       safeWeight(configMap, "followingBoostValue",        DEFAULT_WEIGHTS.followingBoostValue,       0.1),
      notInterestedPenaltyValue: safeWeight(configMap, "notInterestedPenaltyValue",  DEFAULT_WEIGHTS.notInterestedPenaltyValue, 0.01),
      decayLambda:               safeWeight(configMap, "decayLambda",               DEFAULT_WEIGHTS.decayLambda,               0),
      lowCtrSemanticMultiplier:  safeWeight(configMap, "lowCtrSemanticMultiplier",   DEFAULT_WEIGHTS.lowCtrSemanticMultiplier,  0.1),
      lowCtrThreshold:           safeWeight(configMap, "lowCtrThreshold",            DEFAULT_WEIGHTS.lowCtrThreshold,           0),
      freshnessBoostUnderOneHour:    safeWeight(configMap, "freshnessBoostUnderOneHour",    DEFAULT_WEIGHTS.freshnessBoostUnderOneHour,    1.0),
      freshnessBoostUnderThreeHours: safeWeight(configMap, "freshnessBoostUnderThreeHours", DEFAULT_WEIGHTS.freshnessBoostUnderThreeHours, 1.0),
      freshnessBoostUnderSixHours:   safeWeight(configMap, "freshnessBoostUnderSixHours",   DEFAULT_WEIGHTS.freshnessBoostUnderSixHours,   1.0),
      // Phase 0: per-user signals
      ownDwellBoostMax:          safeWeight(configMap, "ownDwellBoostMax",          DEFAULT_WEIGHTS.ownDwellBoostMax,          0.1),
      ownDwellMidpoint:          safeWeight(configMap, "ownDwellMidpoint",          DEFAULT_WEIGHTS.ownDwellMidpoint,          0.1),
      modalOpenBoostMax:         safeWeight(configMap, "modalOpenBoostMax",         DEFAULT_WEIGHTS.modalOpenBoostMax,         0.1),
      modalOpenDecayHours:       safeWeight(configMap, "modalOpenDecayHours",       DEFAULT_WEIGHTS.modalOpenDecayHours,       0.1),
      commentQualityBoostMax:    safeWeight(configMap, "commentQualityBoostMax",    DEFAULT_WEIGHTS.commentQualityBoostMax,    0.1),
    };
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedWeights!;
  } catch (err) {
    console.error("[feedRanking] loadWeightConfig error, using defaults:", err);
    return DEFAULT_WEIGHTS;
  }
}

/** Invalidate the in-memory cache (called when admin updates weights) */
export function invalidateWeightCache(): void {
  cachedWeights = null;
  cacheExpiry = 0;
}

// ─── Scoring helper functions ───────────────────────────────

function getTypeMultiplier(postType: PostSignals["postType"], weights: FeedWeightConfig): number {
  switch (postType) {
    case "project": return weights.typeProjectMultiplier;
    case "roast": return weights.typeRoastMultiplier;
    case "event": return weights.typeEventMultiplier;
    default: return weights.typePostMultiplier;
  }
}

/**
 * Exponential time decay.
 * Half-life ≈ 24 hours (suited for dev communities where users check ~daily).
 * A 24h-old post retains 50% score; a 48h-old post retains 25%.
 */
function timeDecay(createdAt: Date, lambda: number): number {
  const ageInHours =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return Math.exp(-lambda * ageInHours);
}

/**
 * Author rank multiplier — boosts content from high-XP users.
 * Capped at 2.0x to prevent complete dominance.
 */
function authorRankMultiplier(authorXp: number): number {
  const maxXp = 10000;
  return 1.0 + Math.min(authorXp / maxXp, 1.0);
}

/**
 * Social proof multiplier — how many people the user follows liked this.
 */
function socialProofMultiplier(socialProof: number): number {
  if (socialProof === 0) return 1.0;
  if (socialProof === 1) return 1.5;
  if (socialProof <= 3) return 2.0;
  return 2.5;
}

/**
 * Engagement velocity — measures how fast a post is gaining traction.
 * A post with 50 likes in 2 hours is much more "hot" than 50 likes in 30 days.
 * Returns a 1.0–3.0x multiplier.
 */
function engagementVelocityMultiplier(signals: PostSignals): number {
  const ageInHours = Math.max(
    (Date.now() - signals.createdAt.getTime()) / (1000 * 60 * 60),
    1 // min 1h to avoid division by zero on brand-new posts
  );
  const totalEngagements =
    signals.likesCount + signals.commentsCount * 2 + signals.sharesCount * 3;
  const velocity = totalEngagements / ageInHours;

  // Sigmoid scaling: velocity of ~10/h → 2.0x, ~50/h → ~2.8x
  return 1.0 + 2.0 * (1.0 / (1.0 + Math.exp(-0.15 * (velocity - 5))));
}

/**
 * Sigmoid normalization for author affinity.
 * Maps raw composite score (0–∞) smoothly to 0–1 range.
 * midpoint = 15 (casual interaction), steepness = 0.15
 */
export function sigmoidNormalize(raw: number, midpoint = 15, steepness = 0.15): number {
  return 1.0 / (1.0 + Math.exp(-steepness * (raw - midpoint)));
}

/**
 * Dwell-time quality multiplier — maps average dwell time to 1.0–2.0x.
 * Posts that people actually read/watch (high dwell) are higher quality.
 * Below 1s → 1.0x (barely glanced), 5s → 1.3x, 15s+ → ~2.0x
 */
function dwellQualityMultiplier(avgDwellMs?: number): number {
  if (!avgDwellMs || avgDwellMs <= 0) return 1.0;
  const avgDwellSec = avgDwellMs / 1000;
  // Sigmoid: midpoint at 8 seconds, steepness 0.3
  return 1.0 + 1.0 / (1.0 + Math.exp(-0.3 * (avgDwellSec - 8)));
}

/**
 * Core scoring function — returns full breakdown for FeedScoreLog.
 *
 * Accepts configurable weights (from FeedConfig) and optional session CTR
 * for session-aware semantic boosting.
 *
 * Uses an additive baseline (1.0) so that a brand-new post
 * with 0 likes/comments/shares doesn't score 0. This ensures context signals
 * (author affinity, tag relevance, etc.) still surface fresh content.
 */
export function scorePost(
  signals: PostSignals,
  weights: FeedWeightConfig = DEFAULT_WEIGHTS,
  sessionCtr?: number // current session CTR for session-aware semantic boost
): ScoreBreakdown {
  // Additive baseline ensures fresh posts with 0 engagement don't vanish
  // P2 #8: Use reaction-weighted likes when available (Love/Fire count more than plain Like)
  const effectiveLikes = signals.reactionWeightedLikes ?? signals.likesCount;
  const rawEngagement =
    effectiveLikes * weights.engagementLikeWeight +
    signals.commentsCount * weights.engagementCommentWeight +
    signals.sharesCount * weights.engagementShareWeight;
  const engagementScore = Math.max(rawEngagement, 1.0);

  // Every factor that participates in the final product is clamped to a minimum
  // of 0.01 so that a single corrupt/zero signal can never blank the whole feed.
  // The clamp is intentionally small — it only fires on bad data, not normal operation.
  const clamp = (v: number, min = 0.01): number =>
    Number.isFinite(v) ? Math.max(v, min) : min;

  const decayFactor = clamp(timeDecay(signals.createdAt, weights.decayLambda));
  const rankBoost = clamp(authorRankMultiplier(signals.authorXp));
  const socialBoost = clamp(socialProofMultiplier(signals.socialProof));
  const typeBoost = clamp(getTypeMultiplier(signals.postType, weights));
  const interestBoost = clamp(1.0 + Math.max(signals.tagAffinityScore, 0)); // 1.0–2.0
  const followingBoost = clamp(signals.isFromFollowing ? weights.followingBoostValue : 1.0);
  const authorAffinityBoost = clamp(1.0 + Math.max(signals.authorAffinityScore, 0)); // 1.0–2.0 (already sigmoid-normalized)
  const velocityBoost = clamp(engagementVelocityMultiplier(signals));

  // Freshness boost — gives brand-new posts a temporary score lift so they can
  // compete with older posts that already have accumulated engagement.
  // < 1 hour  → 4.0×  (just posted: push to near top of feed)
  // 1–3 hours → 2.5×  (still very recent)
  // 3–6 hours → 1.5×  (a few hours old: mild boost)
  // 6+ hours  → 1.0×  (rely on real engagement signals from here on)
  const ageInHoursForFreshness = Math.max(
    (Date.now() - signals.createdAt.getTime()) / (1000 * 60 * 60),
    0
  );
  let rawFreshness = 1.0;
  if (ageInHoursForFreshness < 1) rawFreshness = weights.freshnessBoostUnderOneHour;
  else if (ageInHoursForFreshness < 3) rawFreshness = weights.freshnessBoostUnderThreeHours;
  else if (ageInHoursForFreshness < 6) rawFreshness = weights.freshnessBoostUnderSixHours;
  const freshnessBoost = clamp(rawFreshness);

  // Negative signal: harshly penalize content user marked "not interested"
  // Floor at 0.01 — even "not interested" posts get a non-zero score so they
  // don't cause NaN propagation if anything divides by finalScore downstream.
  const notInterestedPenalty = clamp(signals.notInterested ? weights.notInterestedPenaltyValue : 1.0);

  // Semantic relevance — session-aware: boost extra if user's session CTR is low
  // This helps recover users who aren't engaging — show them more relevant content
  let semanticBase = signals.semanticRelevance ?? 0;
  if (!Number.isFinite(semanticBase) || semanticBase < 0) semanticBase = 0;
  if (sessionCtr !== undefined && sessionCtr < weights.lowCtrThreshold && semanticBase > 0) {
    semanticBase *= weights.lowCtrSemanticMultiplier;
  }
  const semanticBoost = clamp(1.0 + Math.min(semanticBase, 2.0)); // 1.0–3.0x

  // Dwell-time quality multiplier (1.0–2.0x)
  const dwellBoost = clamp(dwellQualityMultiplier(signals.avgDwellMs));

  // ─── Phase 0: per-user signal boosts ────────────────────────────────────

  // ownDwellBoost: the user's OWN dwell on this post (0 if never seen).
  //   Sigmoid around `ownDwellMidpoint` (default 8s), capped at `ownDwellBoostMax`.
  //   This is the strongest intent signal we have — if the user spent 30s
  //   on this post, it should rank higher than a post with 100 avg dwell
  //   that this user glanced for 1s.
  const ownDwellScore = clamp(
    Math.min(1, Math.max(0,
      (signals.ownDwellMs && signals.ownDwellMs > 0)
        ? 1.0 / (1.0 + Math.exp(-0.3 * (signals.ownDwellMs / 1000 - weights.ownDwellMidpoint)))
        : 0
    ))
  );
  // ownDwellBoost range: 1.0 to ownDwellBoostMax
  const ownDwellBoost = clamp(1.0 + ownDwellScore * (weights.ownDwellBoostMax - 1.0));

  // modalOpenBoost: if the user recently opened this post's modal, that's
  //   a strong positive signal (they wanted to see the full content).
  //   Decays over `modalOpenDecayHours` (default 24h).
  const modalOpenScore = signals.modalOpenScore ?? 0;
  // range: 1.0 to modalOpenBoostMax
  const modalOpenBoost = clamp(1.0 + modalOpenScore * (weights.modalOpenBoostMax - 1.0));

  // commentQualityBoost: discussion quality on the post.
  //   1.0 if no discussion, up to commentQualityBoostMax for threads.
  const commentQualityScore = signals.commentQualityScore ?? 0;
  // range: 1.0 to commentQualityBoostMax
  const commentQualityBoost = clamp(1.0 + commentQualityScore * (weights.commentQualityBoostMax - 1.0));

  const finalScore =
    engagementScore
    * decayFactor
    * rankBoost
    * socialBoost
    * typeBoost
    * interestBoost
    * followingBoost
    * authorAffinityBoost
    * velocityBoost
    * notInterestedPenalty
    * semanticBoost
    * dwellBoost
    * freshnessBoost
    * ownDwellBoost
    * modalOpenBoost
    * commentQualityBoost;

  return {
    finalScore,
    engagementScore,
    decayFactor,
    rankBoost,
    socialBoost,
    typeBoost,
    interestBoost,
    followingBoost,
    authorAffinityBoost,
    velocityBoost,
    semanticBoost,
    dwellBoost,
    freshnessBoost,
    notInterestedPenalty,
    ownDwellBoost,
    modalOpenBoost,
    commentQualityBoost,
  };
}

/** Scored post — PostSignals with breakdown attached */
export interface ScoredPost extends PostSignals {
  _breakdown: ScoreBreakdown;
}

/**
 * Score + sort a list of posts.
 * Returns ScoredPost[] with full breakdown for FeedScoreLog.
 * Supports A/B testing: if feedVariant is "chronological", returns time-sorted (no scoring).
 */
export function rankPosts(
  posts: PostSignals[],
  weights: FeedWeightConfig = DEFAULT_WEIGHTS,
  sessionCtr?: number
): ScoredPost[] {
  // A/B test: chronological variant — pure reverse-chron, no ranking algorithm
  if (posts.length > 0 && posts[0].feedVariant === "chronological") {
    return [...posts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((p) => ({
        ...p,
        _breakdown: scorePost(p, weights, sessionCtr), // still score for analytics, just don't sort by it
      }));
  }

  const scored: ScoredPost[] = posts.map((p) => ({
    ...p,
    _breakdown: scorePost(p, weights, sessionCtr),
  }));

  return scored.sort((a, b) => b._breakdown.finalScore - a._breakdown.finalScore);
}

/**
 * Diversity pass — prevents feed feeling repetitive.
 * Rules:
 * - No more than 2 consecutive posts from the same author
 * - No more than 3 consecutive posts of the same type
 * - At least 1 "explore" post (outside follow graph) every 5 posts
 * - Ensures variety: if we haven't shown a roast/project in 10 posts, inject one
 */
export function applyDiversityPass(
  posts: ScoredPost[],
  explorePosts: ScoredPost[]
): ScoredPost[] {
  const result: ScoredPost[] = [];
  const authorConsecutive: Record<string, number> = {};
  const typeConsecutive: Record<string, number> = {};
  let exploreInserted = 0;
  let slotsSinceNonPostType = 0; // counts slots since last roast/project/event

  // Build a pool of deferred posts (bumped due to diversity rules) for re-insertion
  const deferred: ScoredPost[] = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    // Insert an explore post every 5 slots
    if (i > 0 && i % 5 === 0 && exploreInserted < explorePosts.length) {
      result.push(explorePosts[exploreInserted]);
      exploreInserted++;
      slotsSinceNonPostType = 0; // explore posts count as variety
    }

    // Force variety: if 10 consecutive "post" type, try to inject a non-"post" from deferred
    if (slotsSinceNonPostType >= 10 && deferred.length > 0) {
      const varietyIdx = deferred.findIndex((d) => d.postType !== "post");
      if (varietyIdx >= 0) {
        result.push(deferred[varietyIdx]);
        deferred.splice(varietyIdx, 1);
        slotsSinceNonPostType = 0;
      }
    }

    // Check author consecutive limit (max 2)
    const prev = result[result.length - 1];
    const prevAuthor = prev?.authorId;
    authorConsecutive[post.authorId] =
      prevAuthor === post.authorId
        ? (authorConsecutive[post.authorId] ?? 0) + 1
        : 0;

    // Check type consecutive limit (max 3)
    const prevType = prev?.postType;
    typeConsecutive[post.postType] =
      prevType === post.postType
        ? (typeConsecutive[post.postType] ?? 0) + 1
        : 0;

    if (authorConsecutive[post.authorId] >= 2 || typeConsecutive[post.postType] >= 3) {
      deferred.push(post); // bump it, try later
      continue;
    }

    result.push(post);
    slotsSinceNonPostType = post.postType === "post" ? slotsSinceNonPostType + 1 : 0;
  }

  // Append any remaining deferred posts at the end
  result.push(...deferred);

  return result;
}
