import { GraphQLError } from "graphql";
import { Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_STARTER_CREDITS = 100;

function readPositiveIntEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export const STARTER_CREDITS = readPositiveIntEnv(
  "STARTER_CREDITS",
  DEFAULT_STARTER_CREDITS
);

export const TOOL_CREDIT_COSTS = {
  AI_ROAST: readPositiveIntEnv("AI_ROAST_CREDIT_COST", 1),
  AI_BRAND_ANALYZER: readPositiveIntEnv("AI_BRAND_ANALYZER_CREDIT_COST", 1),
} as const;

export type CreditBalance = {
  balance: number;
  lifetimeCredits: number;
  lifetimeSpent: number;
  starterCredits: number;
};

type CreditAccountRow = {
  balance: number;
  lifetimeCredits: number;
  lifetimeSpent: number;
};

function insufficientCreditsError(required: number, balance: number): GraphQLError {
  return new GraphQLError(
    `Not enough credits. This action needs ${required} credit(s), but you have ${balance}.`,
    { extensions: { code: "INSUFFICIENT_CREDITS", required, balance } }
  );
}

async function ensureCreditAccountInTx(
  tx: Prisma.TransactionClient,
  profileId: string
): Promise<CreditAccountRow> {
  const existing = await tx.creditAccount.findUnique({
    where: { profileId },
    select: { balance: true, lifetimeCredits: true, lifetimeSpent: true },
  });
  if (existing) return existing;

  try {
    const created = await tx.creditAccount.create({
      data: {
        profileId,
        balance: STARTER_CREDITS,
        lifetimeCredits: STARTER_CREDITS,
      },
      select: { balance: true, lifetimeCredits: true, lifetimeSpent: true },
    });

    await tx.creditLedger.create({
      data: {
        profileId,
        amount: STARTER_CREDITS,
        balanceAfter: STARTER_CREDITS,
        tool: "SYSTEM",
        action: "STARTER_GRANT",
        idempotencyKey: `starter:${profileId}`,
        metadata: { reason: "starter_credits" },
      },
    });

    return created;
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;

    const account = await tx.creditAccount.findUnique({
      where: { profileId },
      select: { balance: true, lifetimeCredits: true, lifetimeSpent: true },
    });
    if (!account) throw error;
    return account;
  }
}

export async function ensureCreditAccount(
  profileId: string,
  prisma: PrismaClient
): Promise<CreditBalance> {
  const account = await prisma.$transaction((tx) =>
    ensureCreditAccountInTx(tx, profileId)
  );

  return {
    ...account,
    starterCredits: STARTER_CREDITS,
  };
}

export async function getCreditBalance(
  profileId: string,
  prisma: PrismaClient
): Promise<CreditBalance> {
  return ensureCreditAccount(profileId, prisma);
}

export async function assertHasCredits(
  profileId: string,
  requiredCredits: number,
  prisma: PrismaClient
): Promise<CreditBalance> {
  const balance = await getCreditBalance(profileId, prisma);
  if (balance.balance < requiredCredits) {
    throw insufficientCreditsError(requiredCredits, balance.balance);
  }
  return balance;
}

export async function spendCredits(args: {
  profileId: string;
  tool: string;
  action: string;
  amount: number;
  metadata?: Prisma.InputJsonValue;
  prisma: PrismaClient;
}): Promise<CreditBalance> {
  const { profileId, tool, action, amount, metadata, prisma } = args;
  if (amount <= 0) {
    throw new Error("Credit spend amount must be positive");
  }

  const account = await prisma.$transaction(async (tx) => {
    await ensureCreditAccountInTx(tx, profileId);

    const updated = await tx.$queryRaw<CreditAccountRow[]>`
      UPDATE public.credit_accounts
      SET
        balance = balance - ${amount},
        "lifetimeSpent" = "lifetimeSpent" + ${amount},
        "updatedAt" = NOW()
      WHERE "profileId" = CAST(${profileId} AS uuid)
        AND balance >= ${amount}
      RETURNING balance, "lifetimeCredits", "lifetimeSpent"
    `;

    const row = updated[0];
    if (!row) {
      const current = await tx.creditAccount.findUnique({
        where: { profileId },
        select: { balance: true },
      });
      throw insufficientCreditsError(amount, current?.balance ?? 0);
    }

    await tx.creditLedger.create({
      data: {
        profileId,
        amount: -amount,
        balanceAfter: row.balance,
        tool,
        action,
        metadata: metadata ?? {},
      },
    });

    return row;
  });

  return {
    ...account,
    starterCredits: STARTER_CREDITS,
  };
}
