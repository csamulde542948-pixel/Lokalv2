/**
 * Lokal Feed Ranking Service — Phase 2
 * ─────────────────────────────────────
 * Facebook-inspired scoring pipeline:
 *
 * Stage 1: GetStream delivers raw candidate activities (done in resolvers)
 * Stage 2: Collect signals per post
 * Stage 3: Score each post
 * Stage 4: Diversity pass (no 2 posts from same author in top 5, mix types)
 * Stage 5: Return ranked list
 *
 * Phase 2 improvements:
 * - Additive baseline so brand-new 0-engagement posts don't score 0
 * - 24h half-life time decay (dev communities check ~once/day)
 * - Engagement velocity signal (trending detection)
 * - Sigmoid normalization for author affinity
 * - Negative signal support (notInterested penalty)
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
 * Core scoring function.
 * Returns a float score — higher is better.
 *
 * KEY FIX (Phase 2): Uses an additive baseline (1.0) so that a brand-new post
 * with 0 likes/comments/shares doesn't score 0. This ensures context signals
 * (author affinity, tag relevance, etc.) still surface fresh content.
 */
export function scorePost(signals: PostSignals): number {
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
    * notInterestedPenalty;

  return score;
}

/**
 * Score + sort a list of posts.
 */
export function rankPosts(posts: PostSignals[]): PostSignals[] {
  const scored = posts.map((p) => ({ ...p, _score: scorePost(p) }));
  return scored
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...p }) => p); // strip _score from return value
}

/**
 * Diversity pass — prevents feed feeling repetitive.
 * Rules:
 * - No more than 2 consecutive posts from the same author
 * - At least 1 "explore" post (outside follow graph) every 5 posts
 */
export function applyDiversityPass(
  posts: (PostSignals & { rankScore?: number })[],
  explorePosts: (PostSignals & { rankScore?: number })[]
): (PostSignals & { rankScore?: number })[] {
  const result: (PostSignals & { rankScore?: number })[] = [];
  const authorConsecutive: Record<string, number> = {};
  let exploreInserted = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    // Insert an explore post every 5 slots
    if (i > 0 && i % 5 === 0 && exploreInserted < explorePosts.length) {
      result.push(explorePosts[exploreInserted]);
      exploreInserted++;
    }

    // Cap same-author consecutive posts at 2
    const prev = result[result.length - 1];
    const prevAuthor = prev?.authorId;
    authorConsecutive[post.authorId] =
      prevAuthor === post.authorId
        ? (authorConsecutive[post.authorId] ?? 0) + 1
        : 0;

    if (authorConsecutive[post.authorId] < 2) {
      result.push(post);
    }
  }

  return result;
}
