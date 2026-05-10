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
  "FRONTEND_URL",
];

// Warn (but don't crash) for optional service keys — chat/AI features will be disabled
const OPTIONAL_ENV: string[] = [
  "GETSTREAM_API_KEY",
  "GETSTREAM_API_SECRET",
  "OPENROUTER_API_KEY",
  "FIRECRAWL_API_KEY",
  "RESEND_API_KEY",
];
const missingOptional = OPTIONAL_ENV.filter((key) => !process.env[key]);
if (missingOptional.length > 0) {
  console.warn(
    `[env] WARNING: Optional environment variables not set (features may be degraded):\n  ${missingOptional.join("\n  ")}`
  );
}

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[env] FATAL: Missing required environment variables:\n  ${missing.join("\n  ")}`
  );
  process.exit(1);
}
