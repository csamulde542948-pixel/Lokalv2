// Supabase Edge Function: on-post-created
// Triggered by a Supabase Database Webhook on INSERT to the Post table.
// Generates an OpenAI text-embedding-3-small vector and stores it in the post.
// P3 #14: Retry with exponential backoff for OpenAI API failures.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"
) as Record<string, string>;
const supabaseSecretKey = supabaseSecretKeys.edge_functions;
const webhookSecretKey = supabaseSecretKeys.database_webhooks;
const openAiKey = Deno.env.get("OPENAI_API_KEY")!;

if (!supabaseSecretKey || !webhookSecretKey) {
  throw new Error(
    "Missing edge_functions or database_webhooks Supabase secret key"
  );
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const MAX_RETRIES = 3;

/** Fetch with exponential backoff retry */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res;

    // Retry on 429 (rate limit) or 5xx (server error), not on 4xx client errors
    if (attempt < retries && (res.status === 429 || res.status >= 500)) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000); // 1s, 2s, 4s (max 8s)
      console.warn(`OpenAI API ${res.status} — retrying in ${backoffMs}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }

    throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
  }
  throw new Error("Max retries exceeded");
}

Deno.serve(async (req: Request) => {
  try {
    if (req.headers.get("apikey") !== webhookSecretKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { record } = await req.json();
    const postId: string = record.id;
    const content: string = record.content ?? "";

    if (!content.trim()) {
      return new Response(JSON.stringify({ message: "Empty content, skipping." }), {
        status: 200,
      });
    }

    // Call OpenAI Embeddings API with retry
    const embeddingRes = await fetchWithRetry("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: content.slice(0, 8191),
      }),
    });

    const embeddingData = await embeddingRes.json();
    const embedding: number[] = embeddingData.data[0].embedding;

    // Store in Post.contentEmbedding (pgvector column)
    // Table is "posts" (Prisma @@map), NOT "Post"
    const { error } = await supabase
      .from("posts")
      .update({ contentEmbedding: embedding })
      .eq("id", postId);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, postId }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("on-post-created error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
