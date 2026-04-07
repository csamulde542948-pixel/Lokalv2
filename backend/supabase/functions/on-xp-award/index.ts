// Supabase Edge Function: on-xp-award
// Triggered by a Supabase Database Webhook on INSERT to the XpLog table.
// Checks if the XP award caused a rank-up and sends a level-up email.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendKey = Deno.env.get("RESEND_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
  try {
    const { record } = await req.json();
    const profileId: string = record.profile_id;
    const newTotalXp: number = record.total_xp_after ?? 0;
    const prevTotalXp: number = record.total_xp_before ?? 0;

    // Fetch all ranks ordered by minXp
    const { data: ranks } = await supabase
      .from("Rank")
      .select("*")
      .order("minXp", { ascending: true });

    if (!ranks || ranks.length === 0) {
      return new Response(JSON.stringify({ message: "No ranks found" }), { status: 200 });
    }

    const getRankForXp = (xp: number) =>
      ranks.reduce(
        (prev: any, curr: any) => (curr.minXp <= xp ? curr : prev),
        ranks[0]
      );

    const prevRank = getRankForXp(prevTotalXp);
    const newRank = getRankForXp(newTotalXp);

    // No rank change — nothing to do
    if (prevRank.id === newRank.id) {
      return new Response(JSON.stringify({ message: "No rank-up" }), { status: 200 });
    }

    // Fetch profile for email
    const { data: profile } = await supabase
      .from("Profile")
      .select("email, displayName, username")
      .eq("id", profileId)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ message: "No email on profile" }), { status: 200 });
    }

    // Send level-up email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lokal <noreply@lokal.dev>",
        to: [profile.email],
        subject: `🎉 You ranked up to ${newRank.name}!`,
        html: `
          <h1>Congratulations, ${profile.displayName ?? profile.username}!</h1>
          <p>You just reached <strong>${newRank.name}</strong> on Lokal!</p>
          <p>Keep building, sharing, and engaging with the Filipino dev community.</p>
          <p>Your new rank brings new privileges and recognition. Keep it up! 💪</p>
          <br/>
          <a href="https://lokal.dev/profile">View your profile</a>
        `,
      }),
    });

    if (!emailRes.ok) {
      console.error("Resend error:", await emailRes.text());
    }

    // Update profile rank
    await supabase
      .from("Profile")
      .update({ rankId: newRank.id })
      .eq("id", profileId);

    return new Response(
      JSON.stringify({ success: true, prevRank: prevRank.name, newRank: newRank.name }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("on-xp-award error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
