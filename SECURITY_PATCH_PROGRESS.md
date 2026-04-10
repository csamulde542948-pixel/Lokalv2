# 🔒 Lokal V2 — Security Patch Progress & Roadmap

**Last Updated:** April 10, 2026
**Audit Date:** April 9, 2026

---

## ✅ Completed — HIGH Severity Fixes (8/8)

### Finding #5 — GraphQL Depth/Complexity Limits ✅
- **Files:** `backend/src/index.ts`, `backend/package.json`
- **Changes:**
  - Installed `graphql-depth-limit` package
  - Added `validationRules: [depthLimit(7)]` to Apollo Server config
  - Prevents deeply nested recursive query DoS attacks
- **Commit Note:** Prevents algebraic DoS via deeply nested GraphQL queries

### Finding #6 — CORS & Introspection in Production ✅
- **Files:** `backend/src/index.ts`
- **Changes:**
  - Added `IS_PRODUCTION` flag (`process.env.NODE_ENV === "production"`)
  - CORS now only allows `FRONTEND_URL` in production; Apollo Studio only in dev
  - `introspection: !IS_PRODUCTION` — disabled in production to prevent schema exposure
  - `formatError` now masks internal errors in production (returns generic "Internal server error" for unknown errors)
- **Commit Note:** Restricts CORS origins and disables introspection in production

### Finding #7 — Admin Mutation Input Validation ✅
- **Files:** `backend/src/graphql/resolvers/feed.resolvers.ts`
- **Changes:**
  - `cleanupOldInteractions`: added minimum 7-day retention check
  - `cleanupOldScoreLogs`: added minimum 7-day retention check
  - Both mutations now validate `olderThanDays >= 7` before executing
- **Commit Note:** Prevents accidental or malicious mass deletion of feed data

### Finding #8 — likeRoast Idempotency (Infinite Like Prevention) ✅
- **Files:**
  - `backend/prisma/schema.prisma` — Added `RoastLike` model
  - `backend/src/graphql/resolvers/roast.resolvers.ts` — Rewrote `likeRoast` mutation
  - `backend/supabase/migrations/14_roast_likes_table.sql` — SQL migration
- **Changes:**
  - Created `RoastLike` join table (like `PostLike`, `ProjectLike`)
  - `likeRoast` now checks for existing like before incrementing counter
  - `likedByMe` field resolver now queries the real `RoastLike` table
  - Added RLS policies on `roast_likes` table
- **Migration Required:** Run `14_roast_likes_table.sql` against your Supabase database
- **Commit Note:** Prevents infinite like farming on roasts

### Finding #9 — Project Like/Unlike/Star/Unstar Counter Bugs ✅
- **Files:** `backend/src/graphql/resolvers/project.resolvers.ts`
- **Changes:**
  - `likeProject`: now checks if already liked before incrementing (prevents double-count)
  - `unlikeProject`: only decrements if a like actually existed (prevents negative counts)
  - `starProject`: now checks if already starred before incrementing
  - `unstarProject`: only decrements if a star actually existed
- **Commit Note:** Fixes counter inflation/negative count bugs on project likes and stars

### Finding #10 — GetStream API Key Exposure via GraphQL ✅
- **Files:**
  - `backend/src/graphql/resolvers/profile.resolvers.ts` — Removed API key from response
  - `src/contexts/ChatContext.tsx` — Reads key from `VITE_GETSTREAM_API_KEY` env var
  - `src/vite-env.d.ts` — Added type declaration for new env var
- **Changes:**
  - Backend `streamToken` query no longer returns the GetStream API key
  - Frontend now reads the API key from `import.meta.env.VITE_GETSTREAM_API_KEY`
- **⚠️ Action Required:** Add `VITE_GETSTREAM_API_KEY=your_key_here` to your frontend `.env.local`
- **Commit Note:** Stops leaking GetStream API key through GraphQL responses

### Finding #11 — Helmet CSP & HSTS Enabled ✅
- **Files:** `backend/src/index.ts`
- **Changes:**
  - CSP enabled in production with strict directives (`default-src: 'none'`, `script-src: 'none'`)
  - CSP disabled in development for Apollo Studio/playground
  - HSTS enabled in production (max-age: 1 year, includeSubDomains, preload)
  - `crossOriginEmbedderPolicy` only enforced in production
- **Commit Note:** Enables Content Security Policy and HSTS for production deployments

### Finding #12 — Email HTML Injection Prevention ✅
- **Files:** `backend/src/services/email.ts`
- **Changes:**
  - Added `escapeHtml()` utility function that escapes `& < > " '`
  - All 4 email templates now escape user-provided data before interpolation:
    - `sendWelcomeEmail` — escapes `name`
    - `sendJobApplicationEmail` — escapes `applicantName`, `jobTitle`, `company`
    - `sendEventRegistrationEmail` — escapes `name`, `eventTitle`, `eventDate`, `eventLocation`
    - `sendLevelUpEmail` — escapes `name`, `newRankName`
- **Commit Note:** Prevents HTML injection / phishing attacks via email templates

---

## ✅ Completed — CRITICAL Severity Fixes (3/4)

### Finding #2 — SSRF via `/og` Endpoint ✅
- **Files:** `backend/src/index.ts`
- **Changes:**
  - Added `import dns from "dns/promises"`
  - Added `isPrivateIp()` helper — blocks loopback, RFC-1918, link-local, ULA ranges
  - Added `assertSafeUrl()` async function — scheme check, hostname blocklist, DNS resolution → private IP check
  - `/og` endpoint now calls `assertSafeUrl(url)` before fetching; returns 400 on blocked URLs
- **Commit Note:** Prevents server-side requests to internal network via OG proxy endpoint

### Finding #3 — Unauth SSRF in `scrapeProjectInfo` / `generateRoast` ✅
- **Files:**
  - `backend/src/lib/ssrf.ts` — NEW shared SSRF utility
  - `backend/src/graphql/resolvers/project.resolvers.ts` — `scrapeProjectInfo` mutation
  - `backend/src/graphql/resolvers/roast.resolvers.ts` — `generateRoast` mutation
- **Changes:**
  - Created `assertSafeExternalUrl()` shared utility (mirrors `/og` SSRF protection)
  - `scrapeProjectInfo`: added `if (!user) throw new Error("Unauthorized")` + `assertSafeExternalUrl(url)`
  - `generateRoast`: added third `{ user }` context param + auth check + `assertSafeExternalUrl(input.projectUrl)`
  - Both mutations now require authentication before initiating any external HTTP fetch
- **Commit Note:** Prevents unauthenticated SSRF and cost-DoS via AI/scraper APIs

### Finding #4 — `$executeRawUnsafe` SQL Injection Risk ✅
- **Files:** `backend/src/graphql/resolvers/feed.resolvers.ts`
- **Changes:**
  - Replaced single `$executeRawUnsafe(templateString, userId, authorId)` call (which used string interpolation for `field` and `weights[field]`) with four separate `$executeRaw\`` tagged-template calls — one per field branch (`likeCount`, `commentCount`, `shareCount`, `viewCount`)
  - All values are now fully parameterised — no runtime string interpolation in SQL
  - Removed now-unused `colMap` / `targetCol` variables
- **Commit Note:** Eliminates SQL injection risk in author affinity upsert; all values fully parameterised

---

## 🔴 Pending — CRITICAL Severity (1 remaining)

| # | Finding | Priority | Effort | Status |
|---|---------|----------|--------|--------|
| 1 | **Secrets in git history** — Rotate all API keys before deployment | P0 | 30min | ⏳ Pre-deploy action |

## ✅ Completed — MEDIUM Severity Fixes

### Finding #13 — Input Length Limits ✅
- **Files:** `feed.resolvers.ts`, `profile.resolvers.ts`
- `createPost`: content ≤5000, projectName ≤120, tags ≤10
- `commentOnPost` / `replyToComment`: content ≤2000, mentions ≤20
- `updateProfile`: name ≤80, bio ≤500, website ≤200, location/company/jobTitle ≤100, githubUsername ≤39

### Finding #14 — Mass Assignment Whitelists ✅
- **Files:** `project.resolvers.ts`, `job.resolvers.ts`, `event.resolvers.ts`, `profile.resolvers.ts`
- All four update mutations now extract only schema-declared fields before passing to Prisma
- Prevents callers from overwriting `xp`, `rankId`, `isAdmin`, etc.

### Finding #15 — Account Enumeration via Pre-Login Check ✅
- **Files:** `backend/src/index.ts`, `src/lib/auth-security.ts`, `src/app/pages/login.tsx`
- `/auth/pre-login-check` no longer returns `accountExists` — response shape is always identical
- Frontend no longer checks `accountExists` or `linkedProviders`; uses `providerHint` directly

### Finding #16 — Unauthenticated Account Lockout DoS ✅
- **Files:** `backend/src/index.ts`, `src/lib/auth-security.ts`, `src/app/pages/auth-callback.tsx`
- `/auth/record-login` now requires `Authorization: Bearer <token>`
- Verifies token via Supabase and checks `sbUser.email === body.email` before recording
- Frontend passes session `access_token` on successful logins

### Finding #17 — Error Messages Expose Internal State ✅
- Fixed in Sprint 1 (Finding #6 — `formatError` masking in production)

### Finding #18 — Notification Badge Counter Bypass ✅
- **Files:** `backend/src/graphql/resolvers/launchpad.resolvers.ts`
- Replaced `prisma.notification.createMany` with `Promise.allSettled` of individual `createNotification()` calls
- Each call atomically increments `unreadNotificationsCount` for the recipient

### Finding #19 — No Rate Limiting on Expensive Mutations ✅
- **Files:** `backend/src/lib/rateLimit.ts` (NEW), `project.resolvers.ts`, `roast.resolvers.ts`
- `PerUserRateLimiter` class — sliding window, per-user, in-memory
- `generateRoast`: 5 per 10 minutes; `scrapeProjectInfo`: 10 per 10 minutes
- Auto-prunes stale entries every 30 minutes

### Finding #20 — Private Projects Visible to Any User ✅
- **Files:** `project.resolvers.ts`
- `userProjects` now filters `visibility: "PUBLIC"` unless the viewer is the owner

## 🔵 LOW Severity Fixes

| # | Finding | Priority | Effort | Status |
|---|---------|----------|--------|--------|
| 21 | `sanitizeInput()` defined but never used | P3 | 15min | ✅ Done |
| 22 | OG cache has no size limit (memory leak) | P3 | 15min | ✅ Done |
| 23 | Missing HTTPS/HSTS enforcement | P3 | N/A | ✅ Fixed with #11 |
| 24 | Verify no service role key with `VITE_` prefix | P3 | 5min | ⏳ Pre-deploy check |
| 25 | Missing CSRF protection on REST endpoints | P3 | 1hr | ✅ Done |

---

## 🗓️ Recommended Fix Order (Roadmap)

### Sprint 1 — Critical SSRF & Injection ✅ COMPLETE
1. ~~HIGH severity fixes~~ ✅ **DONE**
2. ~~Add SSRF protection to `/og` endpoint (Finding #2)~~ ✅ **DONE**
3. ~~Add auth to `generateRoast` + URL validation (Finding #3)~~ ✅ **DONE**
4. ~~Replace `$executeRawUnsafe` with per-field parameterized queries (Finding #4)~~ ✅ **DONE**

### Sprint 2 — Input Validation & Access Control ✅ COMPLETE
5. ~~Add input sanitization / length limits to all mutations (Finding #13)~~ ✅ **DONE**
6. ~~Whitelist allowed fields in `updateProject`/`updateJob`/`updateEvent`/`updateProfile` (Finding #14)~~ ✅ **DONE**
7. ~~Fix `userProjects` to filter private projects (Finding #20)~~ ✅ **DONE**
8. ~~Fix notification badge counter in launchpad announcements (Finding #18)~~ ✅ **DONE**

### Sprint 3 — Auth Hardening ✅ COMPLETE
9. ~~Fix pre-login check to not leak account existence (Finding #15)~~ ✅ **DONE**
10. ~~Fix `/auth/record-login` account lockout DoS (Finding #16)~~ ✅ **DONE**
11. ~~Add per-user rate limiting for expensive mutations (Finding #19)~~ ✅ **DONE**
12. ~~Add CSRF protection to REST auth endpoints (Finding #25)~~ ✅ **DONE**

### Sprint 4 — Cleanup & Monitoring ✅ COMPLETE
13. ~~Integrate `sanitizeInput()` into post/comment mutations (Finding #21)~~ ✅ **DONE**
14. ~~Replace OG cache `Map` with bounded LRU (Finding #22)~~ ✅ **DONE**
15. Audit `.env.local` for leaked service role keys (Finding #24) ⏳ **Pre-deploy**

### Pre-Deployment Checklist
- [ ] Rotate ALL secrets (Supabase, GetStream, OpenRouter, Jina, DB password)
- [ ] Run `14_roast_likes_table.sql` migration
- [ ] Add `VITE_GETSTREAM_API_KEY` to frontend `.env.local` / deployment env
- [ ] Set `NODE_ENV=production` in deployment environment
- [ ] Run `npm audit` on both frontend and backend
- [ ] Verify all RLS policies are enabled

---

## 📁 Files Modified in This Patch

| File | Changes |
|------|---------|
| `backend/package.json` | Added `graphql-depth-limit` dependency |
| `backend/src/index.ts` | Depth limit, CORS, CSP, HSTS, introspection, error masking, SSRF on /og, #15 account enum fix, #16 record-login auth, #22 LRU OG cache, #25 CSRF origin check |
| `backend/src/lib/ssrf.ts` | NEW — shared SSRF URL validation utility |
| `backend/src/graphql/resolvers/feed.resolvers.ts` | Min retention on admin cleanup; replaced $executeRawUnsafe; createPost/comment/reply length limits |
| `backend/src/graphql/resolvers/roast.resolvers.ts` | Idempotent likeRoast; generateRoast auth + SSRF check |
| `backend/src/graphql/resolvers/project.resolvers.ts` | Counter fixes; scrapeProjectInfo auth + SSRF; userProjects visibility filter; updateProject whitelist |
| `backend/src/graphql/resolvers/job.resolvers.ts` | updateJob field whitelist |
| `backend/src/graphql/resolvers/event.resolvers.ts` | updateEvent field whitelist |
| `backend/src/graphql/resolvers/profile.resolvers.ts` | Removed API key from streamToken; updateProfile whitelist + length limits |
| `backend/src/services/email.ts` | Added escapeHtml(), applied to all templates |
| `backend/prisma/schema.prisma` | Added RoastLike model |
| `backend/supabase/migrations/14_roast_likes_table.sql` | New migration for roast_likes table |
| `backend/src/lib/rateLimit.ts` | NEW — PerUserRateLimiter class; roastRateLimiter; scrapeRateLimiter |
| `backend/src/graphql/resolvers/launchpad.resolvers.ts` | createMany → batched createNotification() for badge counter fix |
| `src/app/pages/login.tsx` | Removed accountExists check; pass access_token to recordLoginAttempt |
| `src/app/pages/auth-callback.tsx` | Pass access_token to recordLoginAttempt on OAuth callback |
