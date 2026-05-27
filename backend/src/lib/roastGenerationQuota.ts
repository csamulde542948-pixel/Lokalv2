import { Prisma, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";

export type RoastGenerationQuotaScope = "AUTH_USER" | "AUTH_IP" | "ANON_IP";

export interface RoastGenerationQuotaRule {
  scope: RoastGenerationQuotaScope;
  key: string;
  limit: number;
  action: string;
}

export interface RoastGenerationQuotaStatus {
  used: number;
  reserved: number;
  remaining: number;
  limit: number;
}

interface QuotaRow {
  successfulCount: number;
  inFlightCount: number;
}

const STALE_RESERVATION_MINUTES = 10;

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextUtcMidnightIso(): string {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
  )).toISOString();
}

function retryMessage(action: string): GraphQLError {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1
  ));
  const secsLeft = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
  const h = Math.floor(secsLeft / 3600);
  const m = Math.floor((secsLeft % 3600) / 60);

  return new GraphQLError(
    `Daily limit reached for ${action}. Resets in ${h}h ${m}m (at UTC midnight).`,
    { extensions: { code: "RATE_LIMITED" } }
  );
}

async function ensureQuotaRow(
  tx: Prisma.TransactionClient,
  rule: RoastGenerationQuotaRule,
  quotaDate: string
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO roast_generation_quotas ("scope", "quotaKey", "quotaDate", "successfulCount", "inFlightCount", "createdAt", "updatedAt")
    VALUES (${rule.scope}, ${rule.key}, ${quotaDate}::date, 0, 0, now(), now())
    ON CONFLICT ("scope", "quotaKey", "quotaDate") DO NOTHING
  `;
}

async function clearStaleReservations(
  tx: Prisma.TransactionClient,
  rule: RoastGenerationQuotaRule,
  quotaDate: string
): Promise<void> {
  await tx.$executeRaw`
    UPDATE roast_generation_quotas
    SET "inFlightCount" = 0, "updatedAt" = now()
    WHERE "scope" = ${rule.scope}
      AND "quotaKey" = ${rule.key}
      AND "quotaDate" = ${quotaDate}::date
      AND "inFlightCount" > 0
      AND "updatedAt" < now() - make_interval(mins => ${STALE_RESERVATION_MINUTES})
  `;
}

async function getLockedQuotaRow(
  tx: Prisma.TransactionClient,
  rule: RoastGenerationQuotaRule,
  quotaDate: string
): Promise<QuotaRow> {
  const rows = await tx.$queryRaw<QuotaRow[]>`
    SELECT "successfulCount", "inFlightCount"
    FROM roast_generation_quotas
    WHERE "scope" = ${rule.scope}
      AND "quotaKey" = ${rule.key}
      AND "quotaDate" = ${quotaDate}::date
    FOR UPDATE
  `;

  return rows[0] ?? { successfulCount: 0, inFlightCount: 0 };
}

export async function reserveRoastGenerationQuota(
  prisma: PrismaClient,
  rules: RoastGenerationQuotaRule[]
): Promise<void> {
  const quotaDate = todayUtcDate();

  await prisma.$transaction(async (tx) => {
    for (const rule of rules) {
      await ensureQuotaRow(tx, rule, quotaDate);
      await clearStaleReservations(tx, rule, quotaDate);

      const row = await getLockedQuotaRow(tx, rule, quotaDate);
      if (row.successfulCount + row.inFlightCount >= rule.limit) {
        throw retryMessage(rule.action);
      }

      await tx.$executeRaw`
        UPDATE roast_generation_quotas
        SET "inFlightCount" = "inFlightCount" + 1, "updatedAt" = now()
        WHERE "scope" = ${rule.scope}
          AND "quotaKey" = ${rule.key}
          AND "quotaDate" = ${quotaDate}::date
      `;
    }
  });
}

export async function commitRoastGenerationQuota(
  prisma: PrismaClient,
  rules: RoastGenerationQuotaRule[]
): Promise<void> {
  const quotaDate = todayUtcDate();

  await prisma.$transaction(
    rules.map((rule) => prisma.$executeRaw`
      UPDATE roast_generation_quotas
      SET
        "successfulCount" = "successfulCount" + 1,
        "inFlightCount" = GREATEST("inFlightCount" - 1, 0),
        "updatedAt" = now()
      WHERE "scope" = ${rule.scope}
        AND "quotaKey" = ${rule.key}
        AND "quotaDate" = ${quotaDate}::date
    `)
  );
}

export async function refundRoastGenerationQuota(
  prisma: PrismaClient,
  rules: RoastGenerationQuotaRule[]
): Promise<void> {
  const quotaDate = todayUtcDate();

  await prisma.$transaction(
    rules.map((rule) => prisma.$executeRaw`
      UPDATE roast_generation_quotas
      SET
        "inFlightCount" = GREATEST("inFlightCount" - 1, 0),
        "updatedAt" = now()
      WHERE "scope" = ${rule.scope}
        AND "quotaKey" = ${rule.key}
        AND "quotaDate" = ${quotaDate}::date
    `)
  );
}

export async function getRoastGenerationQuotaStatus(
  prisma: PrismaClient,
  rules: RoastGenerationQuotaRule[]
): Promise<RoastGenerationQuotaStatus & { resetsAt: string }> {
  const quotaDate = todayUtcDate();

  const statuses = await prisma.$transaction(async (tx) => {
    const result: RoastGenerationQuotaStatus[] = [];
    for (const rule of rules) {
      await ensureQuotaRow(tx, rule, quotaDate);
      await clearStaleReservations(tx, rule, quotaDate);

      const rows = await tx.$queryRaw<QuotaRow[]>`
        SELECT "successfulCount", "inFlightCount"
        FROM roast_generation_quotas
        WHERE "scope" = ${rule.scope}
          AND "quotaKey" = ${rule.key}
          AND "quotaDate" = ${quotaDate}::date
      `;
      const row = rows[0] ?? { successfulCount: 0, inFlightCount: 0 };
      result.push({
        used: row.successfulCount,
        reserved: row.inFlightCount,
        remaining: Math.max(0, rule.limit - row.successfulCount - row.inFlightCount),
        limit: rule.limit,
      });
    }
    return result;
  });

  const effective = statuses.reduce((best, status) =>
    status.remaining < best.remaining ? status : best
  );

  return { ...effective, resetsAt: nextUtcMidnightIso() };
}
