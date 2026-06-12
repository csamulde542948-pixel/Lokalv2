// Supabase Edge Function: recompute-interest-embedding
// Recomputes a user's interest embedding as a weighted average of
// contentEmbeddings from posts they have engaged with (liked, commented, shared).
//
// Trigger: Called on-demand or via cron (e.g., daily) for active users.
// Input: { userId: string } in the request body.
//
// Weights:
//   like    = 1.0
//   comment = 2.0
//   share   = 3.0
//   view (dwell >= 5s) = 0.5

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"
) as Record<string, string>;
const supabaseSecretKey = supabaseSecretKeys.edge_functions;
const railwaySecretKey = supabaseSecretKeys.railway;

if (!supabaseSecretKey || !railwaySecretKey) {
  throw new Error("Missing edge_functions or railway Supabase secret key");
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const EMBEDDING_DIM = 1536;

// Max posts to consider (most recent engagements)
const MAX_ENGAGEMENTS = 200;

interface WeightedEmbedding {
  embedding: number[];
  weight: number;
}

function weightedAverage(items: WeightedEmbedding[]): number[] {
  if (items.length === 0) return new Array(EMBEDDING_DIM).fill(0);

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return new Array(EMBEDDING_DIM).fill(0);

  const result = new Array(EMBEDDING_DIM).fill(0);
  for (const item of items) {
    const w = item.weight / totalWeight;
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      result[i] += item.embedding[i] * w;
    }
  }

  // L2-normalize the result for cosine similarity compatibility
  const norm = Math.sqrt(result.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      result[i] /= norm;
    }
  }

  return result;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.headers.get("apikey") !== railwaySecretKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), { status: 400 });
    }

    // 1. Gather liked post IDs (weight: 1.0)
    const { data: likedPosts } = await supabase
      .from("post_likes")
      .select("postId")
      .eq("profileId", userId)
      .order("createdAt", { ascending: false })
      .limit(MAX_ENGAGEMENTS);

    // 2. Gather commented post IDs (weight: 2.0)
    const { data: commentedPosts } = await supabase
      .from("post_comments")
      .select("postId")
      .eq("authorId", userId)
      .order("createdAt", { ascending: false })
      .limit(MAX_ENGAGEMENTS);

    // 3. Gather shared post IDs (weight: 3.0) — posts where originalPostId is set
    const { data: sharedPosts } = await supabase
      .from("posts")
      .select("originalPostId")
      .eq("authorId", userId)
      .not("originalPostId", "is", null)
      .order("createdAt", { ascending: false })
      .limit(MAX_ENGAGEMENTS);

    // 4. Gather high-dwell views (weight: 0.5) — views with dwellMs >= 5000
    const { data: viewedPosts } = await supabase
      .from("post_views")
      .select("postId")
      .eq("viewerId", userId)
      .gte("dwellMs", 5000)
      .order("createdAt", { ascending: false })
      .limit(MAX_ENGAGEMENTS);

    // Build weighted post ID map: postId → total weight
    const postWeights = new Map<string, number>();

    for (const row of likedPosts ?? []) {
      postWeights.set(row.postId, (postWeights.get(row.postId) ?? 0) + 1.0);
    }
    for (const row of commentedPosts ?? []) {
      postWeights.set(row.postId, (postWeights.get(row.postId) ?? 0) + 2.0);
    }
    for (const row of sharedPosts ?? []) {
      const pid = row.originalPostId;
      if (pid) postWeights.set(pid, (postWeights.get(pid) ?? 0) + 3.0);
    }
    for (const row of viewedPosts ?? []) {
      postWeights.set(row.postId, (postWeights.get(row.postId) ?? 0) + 0.5);
    }

    if (postWeights.size === 0) {
      return new Response(
        JSON.stringify({ message: "No engagements found, skipping." }),
        { status: 200 }
      );
    }

    // 5. Fetch contentEmbeddings for all engaged posts via raw SQL
    //    (Supabase JS client doesn't support pgvector columns directly in select,
    //     so we use rpc or raw query)
    const postIds = Array.from(postWeights.keys());

    // Use raw SQL via Supabase's rpc — we need a helper function or direct query
    // Fallback: fetch embeddings via the posts table (contentEmbedding is stored as vector)
    const { data: postEmbeddings, error: embError } = await supabase.rpc(
      "get_post_embeddings",
      { post_ids: postIds }
    );

    // If the RPC doesn't exist, fall back to raw SQL via supabase-js
    let embeddings: { postId: string; embedding: number[] }[] = [];

    if (embError || !postEmbeddings) {
      // Fallback: direct SQL query
      const { data, error } = await supabase
        .from("posts")
        .select("id, contentEmbedding")
        .in("id", postIds)
        .not("contentEmbedding", "is", null);

      if (error) throw error;
      embeddings = (data ?? [])
        .filter((p: any) => p.contentEmbedding)
        .map((p: any) => ({
          postId: p.id,
          embedding: typeof p.contentEmbedding === "string"
            ? JSON.parse(p.contentEmbedding)
            : p.contentEmbedding,
        }));
    } else {
      embeddings = postEmbeddings.map((row: any) => ({
        postId: row.post_id ?? row.id,
        embedding: typeof row.embedding === "string"
          ? JSON.parse(row.embedding)
          : row.embedding,
      }));
    }

    // 6. Compute weighted average
    const weightedItems: WeightedEmbedding[] = embeddings
      .filter((e) => e.embedding && e.embedding.length === EMBEDDING_DIM)
      .map((e) => ({
        embedding: e.embedding,
        weight: postWeights.get(e.postId) ?? 0,
      }));

    if (weightedItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No embeddings found for engaged posts." }),
        { status: 200 }
      );
    }

    const interestEmbedding = weightedAverage(weightedItems);

    // 7. Store in Profile.interestEmbedding
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ interestEmbedding: interestEmbedding })
      .eq("id", userId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        postsUsed: weightedItems.length,
        totalWeight: weightedItems.reduce((s, w) => s + w.weight, 0),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("recompute-interest-embedding error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
