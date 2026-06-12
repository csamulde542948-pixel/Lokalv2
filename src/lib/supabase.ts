import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import {
  AUTH_STORAGE_KEY,
  clearLegacySupabaseAuthStorage,
  secureAuthStorage,
} from "./secure-auth-storage";

clearLegacySupabaseAuthStorage();

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: "pkce",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: secureAuthStorage,
    storageKey: AUTH_STORAGE_KEY,
  },
});
