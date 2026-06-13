import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import {
  AUTH_STORAGE_KEY,
  clearLegacySupabaseAuthStorage,
  pkceOnlyAuthStorage,
} from "./secure-auth-storage";

clearLegacySupabaseAuthStorage();

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: false,
    storage: pkceOnlyAuthStorage,
    storageKey: AUTH_STORAGE_KEY,
  },
});
