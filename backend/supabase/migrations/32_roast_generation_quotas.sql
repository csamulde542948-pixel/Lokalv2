-- Migration 32: Persistent AI roast generation quotas
-- Stores daily successful roast generations and active reservations in Postgres
-- so limits survive Railway restarts and multi-instance deployments.

CREATE TABLE IF NOT EXISTS roast_generation_quotas (
  "scope"            VARCHAR(20)  NOT NULL,
  "quotaKey"         VARCHAR(255) NOT NULL,
  "quotaDate"        DATE        NOT NULL,
  "successfulCount"  INTEGER     NOT NULL DEFAULT 0 CHECK ("successfulCount" >= 0),
  "inFlightCount"    INTEGER     NOT NULL DEFAULT 0 CHECK ("inFlightCount" >= 0),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT roast_generation_quotas_pkey
    PRIMARY KEY ("scope", "quotaKey", "quotaDate"),
  CONSTRAINT roast_generation_quotas_scope_check
    CHECK ("scope" IN ('AUTH_USER', 'AUTH_IP', 'ANON_IP'))
);

CREATE INDEX IF NOT EXISTS roast_generation_quotas_date_idx
  ON roast_generation_quotas ("quotaDate");

ALTER TABLE roast_generation_quotas ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE roast_generation_quotas IS
  'Server-side quota ledger for AI roast preview generation. Accessed by backend Prisma only.';
