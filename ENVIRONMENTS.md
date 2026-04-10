# Lokal v2 — Environment Architecture

## Overview

Lokal uses **three environments** with isolated infrastructure:

```
Local Dev ──► Staging ──► Production
   │             │             │
   │         (test here)   (users here)
   ▼             ▼             ▼
localhost    staging branch   main branch
```

---

## Git Branching Strategy

```
main ← production (auto-deploys to prod)
  └── staging ← integration branch (auto-deploys to staging)
        └── feature/xyz ← individual feature work
```

### Workflow

1. **Create feature branch** from `staging`:
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/my-feature
   ```

2. **Develop & test locally** against local backend + dev Supabase

3. **PR → staging** — merge triggers staging deploy
   - Vercel builds preview from `staging` branch
   - Railway staging service redeploys
   - Test on staging URL with staging database

4. **PR → main** from `staging` — merge triggers production deploy
   - Only after QA on staging
   - Vercel production build
   - Railway production service redeploys

---

## Service Architecture Per Environment

| Service | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Git Branch** | `feature/*` | `staging` | `main` |
| **Frontend** | `localhost:5173` | Vercel preview deploy | Vercel production |
| **Backend** | `localhost:4000` | Railway staging service | Railway production service |
| **Database** | Supabase (staging project) | Supabase staging project | Supabase production project |
| **Auth** | Supabase Auth (staging) | Supabase Auth (staging) | Supabase Auth (production) |
| **Storage** | Supabase Storage (staging) | Supabase Storage (staging) | Supabase Storage (production) |
| **GetStream** | Shared app | Shared app | Shared app |
| **OpenRouter/Jina** | Shared keys | Shared keys | Shared keys |
| **Email (Resend)** | Disabled/test | Test mode | Live |

---

## Environment Variables

### Backend (Railway / .env)

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NODE_ENV` | `development` | `staging` | `production` |
| `PORT` | `4000` | Set by Railway | Set by Railway |
| `FRONTEND_URL` | `http://localhost:5173` | Vercel staging URL | Vercel prod URL / custom domain |
| `DATABASE_URL` | Staging Supabase pooled | Staging Supabase pooled | Production Supabase pooled |
| `DIRECT_URL` | Staging Supabase direct | Staging Supabase direct | Production Supabase direct |
| `SUPABASE_URL` | Staging project URL | Staging project URL | Production project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging key | Staging key | Production key |
| `GETSTREAM_API_KEY` | Shared | Shared | Shared |
| `GETSTREAM_API_SECRET` | Shared | Shared | Shared |
| `OPENROUTER_API_KEY` | Shared | Shared | Shared |
| `JINA_API_KEY` | Shared | Shared | Shared |
| `RESEND_API_KEY` | Empty | Test key | Production key |

### Frontend (Vercel / .env.local)

Set in Vercel dashboard with **scope** (Preview vs Production):

| Variable | Vercel Scope | Staging Value | Production Value |
|----------|-------------|---------------|-----------------|
| `VITE_APP_ENV` | Preview | `staging` | _(not set)_ |
| `VITE_APP_ENV` | Production | _(not set or `production`)_ | |
| `VITE_SUPABASE_URL` | Preview | Staging Supabase URL | |
| `VITE_SUPABASE_URL` | Production | | Production Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Preview | Staging anon key | |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production | | Production anon key |
| `VITE_GRAPHQL_URL` | Preview | Staging Railway URL + `/graphql` | |
| `VITE_GRAPHQL_URL` | Production | | Production Railway URL + `/graphql` |
| `VITE_BACKEND_URL` | Preview | Staging Railway URL | |
| `VITE_BACKEND_URL` | Production | | Production Railway URL |
| `VITE_GETSTREAM_API_KEY` | Preview + Production | Same value | Same value |

---

## Behavior Differences by `NODE_ENV`

| Behavior | `development` | `staging` | `production` |
|----------|---------------|-----------|--------------|
| GraphQL Introspection | ✅ Enabled | ✅ Enabled | ❌ Disabled |
| Apollo Studio CORS | ✅ Allowed | ✅ Allowed | ❌ Blocked |
| Helmet CSP | ❌ Disabled | ✅ Enforced | ✅ Enforced |
| HSTS | ❌ Disabled | ✅ Enforced | ✅ Enforced |
| CSRF Origin Check | ❌ Disabled | ✅ Enforced | ✅ Enforced |
| Error Masking | ❌ Full errors | ✅ Masked | ✅ Masked |
| Staging Banner (frontend) | ❌ Hidden | ✅ Shown | ❌ Hidden |

---

## Setup Checklist

### One-Time Setup

- [ ] **Create Supabase staging project**
  1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
  2. New Project → Name: `lokal-staging`, Region: same as prod (Tokyo)
  3. Save the project ref, URL, anon key, service role key, DB password
  4. Run all SQL migrations from `backend/supabase/migrations/` in order
  5. Configure Auth → URL Configuration:
     - Site URL: `https://lokalv2-git-staging-lokakhost.vercel.app`
     - Redirect URL: `https://lokalv2-git-staging-lokakhost.vercel.app/**`

- [ ] **Create Railway staging service**
  1. Go to Railway project dashboard
  2. Click "New Service" → connect to same GitHub repo
  3. Set **Source Branch**: `staging`
  4. Add all env vars (see table above) with staging values
  5. Set `NODE_ENV=staging`

- [ ] **Configure Vercel environment variables by scope**
  1. Go to Vercel → Project → Settings → Environment Variables
  2. For each `VITE_*` variable, set **two entries**:
     - Scope: **Preview** → staging values
     - Scope: **Production** → production values
  3. Add `VITE_APP_ENV=staging` with scope **Preview** only

- [ ] **Push staging branch**
  ```bash
  git push origin staging
  ```

### Per-Feature Workflow

```bash
# 1. Start from staging
git checkout staging && git pull

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Develop...
# 4. Push and create PR → staging
git push origin feature/my-feature

# 5. After PR merge → test on staging URLs
# 6. When QA passes → create PR staging → main
# 7. Merge → production deploys automatically
```

---

## Supabase Migrations Strategy

Migrations run against **staging first**, then production:

```bash
# 1. Write new migration
#    backend/supabase/migrations/17_my_new_feature.sql

# 2. Test locally
#    Run against local/staging Supabase

# 3. Apply to staging (via Supabase dashboard SQL editor or CLI)
#    supabase db push --linked --project-ref <staging-ref>

# 4. Test on staging environment

# 5. Apply to production (after QA)
#    supabase db push --linked --project-ref <production-ref>
```

---

## URLs Reference

| Environment | Frontend | Backend | Supabase Dashboard |
|-------------|----------|---------|-------------------|
| **Development** | `http://localhost:5173` | `http://localhost:4000` | Staging project |
| **Staging** | `https://lokalv2-git-staging-lokakhost.vercel.app` | `https://lokal-staging.up.railway.app` _(varies)_ | Staging project |
| **Production** | `https://lokalv2-i4guuljj9-lokakhost.vercel.app` | `https://lokalv2-production.up.railway.app` | Production project |

> **Note**: The exact Vercel staging URL depends on your team/project name.
> Vercel branch deploys follow the pattern: `https://<project>-git-<branch>-<scope>.vercel.app`
