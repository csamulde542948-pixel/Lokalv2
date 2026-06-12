-- Repair production drift that breaks Supabase Auth signup triggers.
-- handle_new_user inserts account_links/security_events without explicit IDs,
-- so both tables must have database-generated text IDs.

ALTER TABLE public.account_links
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.security_events
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

