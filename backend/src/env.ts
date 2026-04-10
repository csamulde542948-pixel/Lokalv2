// This file MUST be imported first in index.ts — before any other local imports.
// ES module `import` statements are hoisted, so dotenv.config() in index.ts runs
// AFTER all module-level code in imported files. By importing this file first,
// process.env is populated before stream.ts / prisma.ts / etc read their env vars.
import dotenv from "dotenv";
dotenv.config();

// MED-05: Fail fast on startup if any required environment variable is absent.
// This prevents cryptic runtime errors (e.g. "Cannot read properties of undefined")
// when the server starts with a missing .env entry.
const REQUIRED_ENV: string[] = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GETSTREAM_API_KEY",
  "GETSTREAM_API_SECRET",
  "FRONTEND_URL",
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[env] FATAL: Missing required environment variables:\n  ${missing.join("\n  ")}`
  );
  process.exit(1);
}
