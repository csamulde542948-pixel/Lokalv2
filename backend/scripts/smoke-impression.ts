import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  try {
    const r = await p.userPostImpression.findMany({ take: 1 });
    console.log("OK rows:", r.length);
  } catch (e: any) {
    console.error("FAIL:", e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
