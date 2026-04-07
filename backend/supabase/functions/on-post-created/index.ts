// Supabase Edge Function: on-post-created
// Triggered by a Supabase Database Webhook on INSERT to the Post table.
// Generates an OpenAI text-embedding-3-small vector and stores it in the post.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openAiKey = Deno.env.get("OPENAI_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
  try {
    const { record } = await req.json();
    const postId: string = record.id;
    const content: string = record.content ?? "";

    if (!content.trim()) {
      return new Response(JSON.stringify({ message: "Empty content, skipping." }), {
        status: 200,
      });
    }

    // Call OpenAI Embeddings API
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
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

    if (!embeddingRes.ok) {
      throw new Error(`OpenAI API error: ${embeddingRes.statusText}`);
    }

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
