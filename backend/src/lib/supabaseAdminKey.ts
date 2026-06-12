const modernSecret = process.env.SUPABASE_SECRET_KEY;
const legacyServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdminKey =
  modernSecret?.startsWith("sb_secret_") ? modernSecret : legacyServiceRole!;
