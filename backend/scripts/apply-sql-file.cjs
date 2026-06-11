const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.resolve(process.cwd(), "backend/.env") });

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: node backend/scripts/apply-sql-file.cjs <sql-file>");

  const sqlPath = path.resolve(process.cwd(), file);
  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query(sql);
  await client.end();
  console.log(`[apply-sql-file] applied ${file}`);
}

main().catch((error) => {
  console.error("[apply-sql-file] failed:", error);
  process.exit(1);
});
