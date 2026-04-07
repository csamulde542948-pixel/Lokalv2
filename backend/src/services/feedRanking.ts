/**
 * Lokal Feed Ranking Service — Phase 2.5 (Critical Gap Fixes)
 * ─────────────────────────────────────────────────────────────
 * Facebook-inspired scoring pipeline:
 *
 * Stage 1: GetStream delivers raw candidate activities (done in resolvers)
 * Stage 2: Collect signals per post
 * Stage 3: Score each post
 * Stage 4: Diversity pass (author + type diversification)
 * Stage 5: Return ranked list
 *
 * Improvements over Phase 2:
 * - Semantic relevance via pgvector embeddings (cosine similarity)
 * - Dwell-time quality signal from PostView data
 * - Content-type diversification in diversity pass
 * - Tag affinity decay based on recency
 * - A/B testing support (feedVariant)
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
}

const TYPE_MULTIPLIER: Record<PostSignals["postType"], number> = {
  project: 1.4,
  roast: 1.3,
  event: 1.2,
  post: 1.0,
};

/**
 * Exponential time decay.
 * Half-life ≈ 24 hours (suited for dev communities where users check ~daily).
 * A 24h-old post retains 50% score; a 48h-old post retains 25%.
 */
function timeDecay(createdAt: Date): number {
  const ageInHours =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const lambda = 0.029; // decay constant → half-life ≈ 24h (ln(2)/24)
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
 * Core scoring function.
 * Returns a float score — higher is better.
 *
 * Uses an additive baseline (1.0) so that a brand-new post
 * with 0 likes/comments/shares doesn't score 0. This ensures context signals
 * (author affinity, tag relevance, etc.) still surface fresh content.
 *
 * Phase 2.5 additions:
 * - Semantic relevance from embedding cosine similarity (1.0–2.0x)
 * - Dwell-time quality signal (1.0–2.0x)
 */
export function scorePost(signals: PostSignals): number {
  // A/B test: chronological variant bypasses scoring
  // (handled in rankPosts — this still scores for logging/analytics)

  // Additive baseline ensures fresh posts with 0 engagement don't vanish
  const rawEngagement =
    signals.likesCount * 1.5 +
    signals.commentsCount * 2.0 +
    signals.sharesCount * 3.0;
  const engagementScore = Math.max(rawEngagement, 1.0);

  const decay = timeDecay(signals.createdAt);
  const rankBoost = authorRankMultiplier(signals.authorXp);
  const socialBoost = socialProofMultiplier(signals.socialProof);
  const typeBoost = TYPE_MULTIPLIER[signals.postType];
  const interestBoost = 1.0 + signals.tagAffinityScore; // 1.0–2.0
  const followingBoost = signals.isFromFollowing ? 1.5 : 1.0;
  const authorAffinityBoost = 1.0 + signals.authorAffinityScore; // 1.0–2.0 (already sigmoid-normalized)
  const velocityBoost = engagementVelocityMultiplier(signals);

  // Negative signal: harshly penalize content user marked "not interested"
  const notInterestedPenalty = signals.notInterested ? 0.05 : 1.0;

  // Phase 2.5: Semantic relevance from embedding cosine similarity
  // 0 means no embedding data → neutral 1.0x; 1.0 means perfect match → 2.0x
  const semanticBoost = 1.0 + (signals.semanticRelevance ?? 0);

  // Phase 2.5: Dwell-time quality multiplier (1.0–2.0x)
  const dwellBoost = dwellQualityMultiplier(signals.avgDwellMs);

  const score =
    engagementScore
    * decay
    * rankBoost
    * socialBoost
    * typeBoost
    * interestBoost
    * followingBoost
    * authorAffinityBoost
    * velocityBoost
    * notInterestedPenalty
    * semanticBoost
    * dwellBoost;

  return score;
}

/**
 * Score + sort a list of posts.
 * Supports A/B testing: if feedVariant is "chronological", returns time-sorted (no scoring).
 */
export function rankPosts(posts: PostSignals[]): PostSignals[] {
  // A/B test: chronological variant — pure reverse-chron, no ranking algorithm
  if (posts.length > 0 && posts[0].feedVariant === "chronological") {
    return [...posts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const scored = posts.map((p) => ({ ...p, _score: scorePost(p) }));
  return scored
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...p }) => p); // strip _score from return value
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
  posts: (PostSignals & { rankScore?: number })[],
  explorePosts: (PostSignals & { rankScore?: number })[]
): (PostSignals & { rankScore?: number })[] {
  const result: (PostSignals & { rankScore?: number })[] = [];
  const authorConsecutive: Record<string, number> = {};
  const typeConsecutive: Record<string, number> = {};
  let exploreInserted = 0;
  let slotsSinceNonPostType = 0; // counts slots since last roast/project/event

  // Build a pool of deferred posts (bumped due to diversity rules) for re-insertion
  const deferred: (PostSignals & { rankScore?: number })[] = [];

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
