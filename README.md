# Lokalhost.club

Open-source monorepo for **Lokalhost.club** — a community platform for builders to share projects, grow reputation (XP and ranks), discover a ranked feed, and connect with other makers.

## Stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React, Vite, TypeScript, Tailwind, Radix UI, Apollo Client |
| Backend | Node.js, Express, Apollo Server, Prisma |
| Data & auth | Supabase (Postgres, Auth, Storage, RLS) |
| Realtime chat | GetStream |
| Deploy | Vercel (frontend), Railway (backend) |

## Repository layout

```
├── src/                 # React frontend (Vite)
├── backend/
│   ├── src/             # GraphQL API & services
│   └── supabase/
│       └── migrations/  # SQL schema & RLS migrations
├── public/              # Static assets
└── .github/workflows/   # CI build & deploy pipelines
```

## Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project
- (Optional) [GetStream](https://getstream.io) app for messaging

## Local development

### 1. Clone and install

```bash
git clone https://github.com/csamulde542948-pixel/Lokalv2.git
cd Lokalv2
npm install
cd backend && npm install && cd ..
```

### 2. Environment variables

Create local env files from your own Supabase and service credentials. **Do not commit these files.**

**Frontend** (repo root) — e.g. `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_BACKEND_URL=http://localhost:4000
VITE_GETSTREAM_API_KEY=your-getstream-api-key
```

**Backend** (`backend/.env`):

```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
GETSTREAM_API_KEY=your-getstream-api-key
GETSTREAM_API_SECRET=your-getstream-api-secret
```

Apply database migrations from `backend/supabase/migrations/` via the Supabase SQL editor or your preferred migration workflow, then generate the Prisma client:

```bash
cd backend
npx prisma generate
```

### 3. Run

```bash
# Terminal 1 — API (from backend/)
npm run dev

# Terminal 2 — frontend (repo root)
npm run dev
```

- Frontend: http://localhost:5173  
- GraphQL: http://localhost:4000/graphql  

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | root | Start Vite dev server |
| `npm run build` | root | Production frontend build |
| `npm run dev` | `backend/` | Start API with hot reload |
| `npm run build` | `backend/` | Compile TypeScript + Prisma generate |

## Contributing

Issues and pull requests are welcome. Please avoid committing secrets, internal runbooks, or `.env` files. Use GitHub Actions secrets and local env files for credentials.

## License

This project is licensed under the [MIT License](LICENSE).
