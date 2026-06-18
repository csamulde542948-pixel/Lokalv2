-- Repair production drift that breaks profile inserts through the auto-follow trigger.
-- The trigger inserts into public.follows without an explicit id, so the table
-- needs a database-side default in addition to Prisma's client-side default.

ALTER TABLE public.follows
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
