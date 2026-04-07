# Lokal Backend

GraphQL API for Lokal v2 — the Filipino developer social platform.

## Stack

| Layer | Technology |
|---|---|
| API | Apollo Server v4 (GraphQL) |
| ORM | Prisma v5 |
| Database | Supabase (PostgreSQL + pgvector) |
| Auth | Supabase Auth (JWT) |
| Feeds & Chat | GetStream.io (Maker account) |
| Email | Resend |
| Runtime | Node.js + TypeScript (tsx) |

---

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Run Prisma migration

```bash
npm run prisma:generate   # generate the Prisma client
npm run prisma:migrate    # apply migrations to Supabase
```

### 4. Start the dev server

```bash
npm run dev
```

The API will be available at: `http://localhost:4000/graphql`

You can explore it with [Apollo Sandbox](https://studio.apollographql.com/sandbox/explorer) by pointing it at `http://localhost:4000/graphql`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Port to run the server on (default: 4000) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Origin allowed by CORS |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `DATABASE_URL` | Prisma pooled DB connection string |
| `DIRECT_URL` | Prisma direct DB connection (for migrations) |
| `GETSTREAM_API_KEY` | GetStream.io App API key |
| `GETSTREAM_API_SECRET` | GetStream.io App API secret |
| `RESEND_API_KEY` | Resend transactional email API key |
| `OPENAI_API_KEY` | OpenAI key (Phase 3 — embedding generation) |

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:push` | Push schema changes without migration |
| `npm run prisma:studio` | Open Prisma Studio GUI |

---

## Architecture

```
src/
├── index.ts                  # Apollo Server + Express entry point
├── graphql/
│   ├── typedefs/
│   │   └── index.ts          # Complete GraphQL SDL
│   ├── context.ts            # GraphQL context + DataLoaders
│   └── resolvers/
│       ├── index.ts          # Merged resolver map
│       ├── profile.resolvers.ts
│       ├── feed.resolvers.ts
│       ├── project.resolvers.ts
│       ├── job.resolvers.ts
│       ├── event.resolvers.ts
│       ├── roast.resolvers.ts
│       ├── launchpad.resolvers.ts
│       ├── leaderboard.resolvers.ts
│       └── notification.resolvers.ts
├── lib/
│   ├── prisma.ts             # Prisma singleton
│   ├── supabase.ts           # Supabase service client + token verification
│   └── stream.ts             # GetStream.io helpers
├── middleware/
│   └── auth.ts               # JWT extraction + verification middleware
└── services/
    ├── email.ts              # Resend transactional emails
    ├── feedRanking.ts        # Facebook-inspired feed scoring algorithm
    └── xp.ts                 # XP award + rank-up logic
prisma/
└── schema.prisma             # Full database schema
supabase/
└── functions/
    ├── on-post-created/      # Edge Function: generate post embeddings
    └── on-xp-award/          # Edge Function: rank-up detection + email
```

---

## Feed Ranking Algorithm

The personalized feed uses a Facebook-inspired scoring pipeline:

```
score = engagementScore × timeDecay × authorRankMultiplier × socialProofMultiplier × typeMultiplier × interestBoost × followingBoost
```

- **Time decay**: Exponential `e^(-0.058 × ageInHours)` → half-life ~12 hours
- **Type boost**: Projects ×1.4, Roasts ×1.3, Events ×1.2, Posts ×1.0
- **Author rank boost**: Legend ×1.5 → Newbie ×1.0
- **Social proof**: Scales with likes + comments + view signals
- **Interest boost**: Based on `UserTagAffinity` scores (updated on every interaction)
- **Following boost**: ×1.3 for posts from people you follow
- **Diversity pass**: Max 2 consecutive posts from same author, explore injection every 5 slots

---

## Supabase Edge Functions

Deploy with:

```bash
supabase functions deploy on-post-created
supabase functions deploy on-xp-award
```

Then set up Database Webhooks in the Supabase Dashboard:
- **on-post-created**: Trigger on `INSERT` to `Post` table
- **on-xp-award**: Trigger on `INSERT` to `XpLog` table

---

## GetStream.io (Maker Account)

Feed types used:
- `timeline` — follows-based personalized feed (read by the logged-in user)
- `user` — per-user activity feed (public posts, project launches)
- `notification` — in-app notification feed

> **Note**: Ranked Feeds require a paid GetStream plan. On the Maker account, raw feeds are fetched and **ranked in the Apollo resolver** using our custom scoring algorithm — giving us Lokal-specific control over what rises.
