/**
 * Lokal Feed Ranking Service
 * ──────────────────────────
 * Facebook-inspired scoring pipeline:
 *
 * Stage 1: GetStream delivers raw candidate activities (done in resolvers)
 * Stage 2: Collect signals per post
 * Stage 3: Score each post
 * Stage 4: Diversity pass (no 2 posts from same author in top 5, mix types)
 * Stage 5: Return ranked list
 */

export interface PostSignals {
  postId: string;
  authorId: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  authorXp: number;         // author's XP/rank score
  tagAffinityScore: number; // cosine sim between user interests & post tags
  socialProof: number;      // how many of the user's follows liked this
  isFromFollowing: boolean; // is this from someone the user follows?
  authorAffinityScore: number; // composite author affinity (0–1 normalized)
  postType: "post" | "roast" | "project" | "event"; // content type multiplier
}

const TYPE_MULTIPLIER: Record<PostSignals["postType"], number> = {
  project: 1.4,
  roast: 1.3,
  event: 1.2,
  post: 1.0,
};

/**
 * Exponential time decay — same formula used by Reddit's "Hot" algorithm.
 * More recent posts decay less. Half-life ≈ 12 hours.
 */
function timeDecay(createdAt: Date): number {
  const ageInHours =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const lambda = 0.058; // decay constant → half-life ≈ 12h
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
 * Core scoring function.
 * Returns a float score — higher is better.
 */
export function scorePost(signals: PostSignals): number {
  const engagementScore =
    signals.likesCount * 1.5 +
    signals.commentsCount * 2.0 +
    signals.sharesCount * 3.0;

  const decay = timeDecay(signals.createdAt);
  const rankBoost = authorRankMultiplier(signals.authorXp);
  const socialBoost = socialProofMultiplier(signals.socialProof);
  const typeBoost = TYPE_MULTIPLIER[signals.postType];
  const interestBoost = 1.0 + signals.tagAffinityScore; // 1.0–2.0
  const followingBoost = signals.isFromFollowing ? 1.5 : 1.0;
  const authorAffinityBoost = 1.0 + Math.min(signals.authorAffinityScore, 1.0); // 1.0–2.0

  const score =
    engagementScore * decay * rankBoost * socialBoost * typeBoost * interestBoost * followingBoost * authorAffinityBoost;

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
