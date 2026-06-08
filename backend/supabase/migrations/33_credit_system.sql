-- Durable credit system for AI tools.
-- Credits are tied to authenticated profiles and tracked with an append-only
-- ledger so future tools can share one usage model.

CREATE TABLE IF NOT EXISTS public.credit_accounts (
  "profileId" UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  "lifetimeCredits" INTEGER NOT NULL DEFAULT 0 CHECK ("lifetimeCredits" >= 0),
  "lifetimeSpent" INTEGER NOT NULL DEFAULT 0 CHECK ("lifetimeSpent" >= 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL CHECK ("balanceAfter" >= 0),
  tool VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  "idempotencyKey" VARCHAR(160) UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_profile_created
  ON public.credit_ledger ("profileId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_tool_created
  ON public.credit_ledger (tool, "createdAt" DESC);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
