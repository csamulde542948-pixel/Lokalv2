-- Repair production drift that breaks the auto-follow trigger on new signup.
-- auto_follow_brand_account inserts follows without an explicit id.

ALTER TABLE public.follows
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

