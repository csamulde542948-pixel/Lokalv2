import { createClient } from "@supabase/supabase-js";
import type { AuthUser } from "../graphql/context";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client — used server-side only. Has full DB access.
// NEVER expose this to the client.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verify a Supabase JWT and return the user payload.
 * Called in the Apollo Server context function on every request.
 */
export async function verifySupabaseToken(token: string): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}
