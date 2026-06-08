import { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  try {
    // 1) Enum value present
    const enumValues = await p.$queryRaw<{ enumlabel: string }[]>(Prisma.sql`
      SELECT enumlabel FROM pg_enum
      WHERE enumtypid = '"InteractionType"'::regtype
      ORDER BY enumsortorder
    `);
    console.log("InteractionType values:", enumValues.map((v) => v.enumlabel).join(", "));

    // 2) feed_score_logs new columns present
    const cols = await p.$queryRaw<{ column_name: string }[]>(Prisma.sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'feed_score_logs'
        AND column_name IN ('ownDwellMs', 'ownDwellScore', 'modalOpenScore', 'commentQualityScore')
      ORDER BY column_name
    `);
    console.log("feed_score_logs new columns:", cols.map((c) => c.column_name).join(", "));

    // 3) posts.commentQualityScore present
    const postsCols = await p.$queryRaw<{ column_name: string }[]>(Prisma.sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'posts' AND column_name = 'commentQualityScore'
    `);
    console.log("posts.commentQualityScore present:", postsCols.length === 1);

    // 4) indexes
    const idx = await p.$queryRaw<{ indexname: string }[]>(Prisma.sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'user_post_impressions'
      ORDER BY indexname
    `);
    console.log("user_post_impressions indexes:", idx.map((i) => i.indexname).join(", "));
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
