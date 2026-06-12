-- Weekly AI credit reset and durable action events for anti-spam limits.

ALTER TABLE public.credit_accounts
  ADD COLUMN IF NOT EXISTS "weeklyResetAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.user_action_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action VARCHAR(80) NOT NULL,
  "targetId" VARCHAR(200),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_action_events_profile_action_created
  ON public.user_action_events ("profileId", action, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_user_action_events_profile_action_target_created
  ON public.user_action_events ("profileId", action, "targetId", "createdAt" DESC);

ALTER TABLE public.user_action_events ENABLE ROW LEVEL SECURITY;
