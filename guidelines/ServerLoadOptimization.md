# 🚀 Server Load Optimization Plan — Lokal v2

> **Status**: Feed recommendation system ✅ 100% complete (all Phase 4 P0–P3 done + 5 bugs fixed).  
> **Next**: Prevent server overload on first user load.

---

## Current Problem

When a logged-in user first visits the app, **7+ sequential/parallel data loads** fire:

```
┌─ Auth ─────────────┐  ┌─ Chat ──────────────────────┐  ┌─ UI ────────────────────────────┐
│ 1. getSession()    │→ │ 2. GetStreamToken (GQL)     │  │ 5. GetMeSidebar (GQL)           │
│                    │  │ 3. connectUser() (WebSocket) │  │ 6. GetSidebarData/leaderboard   │
│                    │  │ 4. queryChannels(30)         │  │ 7. GetFeed (MASSIVE)            │
└────────────────────┘  └─────────────────────────────┘  └─────────────────────────────────┘
```

The `GetFeed` query alone runs **9+ DB queries** + a GetStream API call + pgvector cosine similarity per request. 

---

## 🔴 P0 — Server-Killing (Fix First)

### 1. Remove Nested Comments from Feed Query
**Problem**: Feed fetches 3 levels of nested comments (10 comments → unlimited replies → unlimited sub-replies). A single post could return **1,000+ comment nodes**. 20 posts = **20,000 nodes**.

**Fix**:
- **Feed query**: Only fetch `comments(limit: 3)` with NO nested replies — preview only
- **Post detail / expanded post**: Fetch full comments on-demand when user clicks "View all comments"
- Add `commentsPreview` field that returns top 3 comments (most liked) without replies

**Files**: `src/app/pages/feed.tsx` (GET_FEED query), `backend/src/graphql/typedefs/index.ts`, `backend/src/graphql/resolvers/feed.resolvers.ts`

**Impact**: ~90% reduction in feed payload size

---

### 2. Server-Side Limit Caps
**Problem**: No resolver enforces a maximum `limit`. A client can send `feed(limit: 100000)`.

**Fix**: Add `Math.min(limit, MAX)` to every paginated resolver:
| Resolver | Current Default | Proposed Max |
|----------|----------------|--------------|
| `feed` | 20 | 50 |
| `exploreFeed` | 20 | 50 |
| `leaderboard` | 50 | 50 |
| `notifications` | 30 | 50 |
| `comments` | 10 | 30 |
| `jobs` | 20 | 50 |
| `events` | 20 | 50 |

**Files**: `backend/src/graphql/resolvers/feed.resolvers.ts`, `notification.resolvers.ts`, `job.resolvers.ts`, `event.resolvers.ts`, `leaderboard.resolvers.ts`

**Impact**: Prevents abuse, bounds query cost

---

## 🔴 P1 — Performance-Killing (Fix Next)

### 3. Cache Feed Ranking Signals (60s TTL)
**Problem**: Every feed request runs 6 parallel signal-collection queries (tag affinities, follows, author affinities, semantic scores, dwell averages, not-interested). These are relatively stable between requests.

**Fix**:
- In-memory LRU cache (keyed by `userId`) with 60s TTL for:
  - `tagAffinities` — changes on like/comment/share (rare within 60s)
  - `authorAffinities` — same
  - `notInterested` — changes on explicit action only
- Invalidate on write (like, comment, share, markNotInterested)
- Keep `mutualLikes`, `semanticScores`, `reactionWeights` fresh (post-dependent, not user-dependent for long)

**Files**: `backend/src/graphql/resolvers/feed.resolvers.ts`, new `backend/src/lib/cache.ts`

**Impact**: ~40% fewer DB queries per feed request for repeat loads

---

### 4. Minimize createPost Mutation Response
**Problem**: `CREATE_POST_MUTATION` requests the entire feed query shape including 3 levels of nested comments — for a brand-new post with 0 comments.

**Fix**: Return minimal fields from createPost:
```graphql
mutation CreatePost($content: String!, ...) {
  createPost(content: $content, ...) {
    id content imageUrl imageUrls projectName likesCount commentsCount sharesCount createdAt
    author { id name username avatarUrl }
    tags { id name }
  }
}
```

**Files**: `src/app/pages/feed.tsx` (CREATE_POST_MUTATION)

**Impact**: ~80% smaller mutation response

---

## 🟠 P2 — Wasteful (Optimize)

### 5. Right Sidebar: Cache-First + Limit 5
**Problem**: `GetSidebarData` fires on **every page navigation** with `cache-and-network` (always hits server). Fetches 50 items, renders 5.

**Fix**:
- Change `fetchPolicy` to `cache-first`
- Add `pollInterval: 300_000` (5 min refresh)
- Change query to `leaderboard(limit: 5)` and `featuredProjects(limit: 5)`

**Files**: `src/app/components/right-sidebar.tsx`

**Impact**: ~90% fewer leaderboard queries

---

### 6. Route-Level Code Splitting
**Problem**: All 20+ page components are eagerly imported in `routes.tsx`. Initial JS bundle is **1.89 MB**.

**Fix**:
```tsx
const Feed = lazy(() => import('./pages/feed'));
const Jobs = lazy(() => import('./pages/jobs'));
const Events = lazy(() => import('./pages/events'));
// ... etc
```
Wrap routes in `<Suspense fallback={<PageSkeleton />}>`.

**Files**: `src/app/routes.tsx`, all page components (add `export default`)

**Impact**: ~60-70% smaller initial JS bundle, faster TTI

---

### 7. Lazy Chat Connection
**Problem**: `ChatProvider` runs `connectUser()` + `queryChannels(30)` on **every authenticated page** — even `/settings`, `/leaderboard`, etc.

**Fix**:
- Move Stream Chat initialization into a `connectChat()` function
- Only call it when user opens `MessagesPopover` or navigates to `/messages`
- Keep `ChatProvider` mounted but lazy-connecting

**Files**: `src/contexts/ChatContext.tsx`

**Impact**: Eliminates WebSocket + 30-channel query on non-messaging pages

---

### 8. Apollo Cache Policy Optimization
**Problem**: Global `cache-and-network` means **every** `useQuery` always hits the server, defeating Apollo's cache.

**Fix**:
```ts
// apollo.ts — change default
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          feed: { merge: false },  // replace, don't merge
          leaderboard: { merge: false },
        }
      },
      Post: { keyFields: ["id"] },
      Profile: { keyFields: ["id"] },
    }
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-first" },  // ← changed from cache-and-network
  },
});
```

Only use `cache-and-network` on: `GetFeed`, `GetNotifications` (when open).

**Files**: `src/lib/apollo.ts`, update specific queries with explicit `fetchPolicy`

**Impact**: ~50% fewer network requests across the app

---

### 9. Cache Auth Token in Memory
**Problem**: `authLink` calls `supabase.auth.getSession()` on every GraphQL request — reads from localStorage each time.

**Fix**:
```ts
let cachedToken: string | null = null;
supabase.auth.onAuthStateChange((_, session) => {
  cachedToken = session?.access_token ?? null;
});
// In authLink:
const token = cachedToken ?? (await supabase.auth.getSession()).data.session?.access_token;
```

**Files**: `src/lib/apollo.ts`

**Impact**: ~5-10ms saved per GraphQL request

---

## 🟡 P3 — Minor (Polish)

### 10. Smart Chat Channel Updates
**Problem**: Every Stream Chat event (`message.new`, `message.read`, etc.) triggers `queryChannels(30)` — full re-fetch.

**Fix**: Update the specific channel in local state:
```ts
client.on('message.new', (event) => {
  setChannels(prev => prev.map(ch => 
    ch.cid === event.cid ? { ...ch, lastMessage: event.message } : ch
  ));
});
```

**Files**: `src/contexts/ChatContext.tsx`

---

### 11. Slim Notification Payload
**Problem**: Each notification includes full `post` and `project` objects. Frontend only uses `entityId`.

**Fix**: Remove `post { ... }` and `project { ... }` from `GetNotifications` query. Frontend already navigates by `entityId`.

**Files**: `src/app/components/notifications-popover.tsx`, `backend/src/graphql/resolvers/notification.resolvers.ts`

---

### 12. Cap seenIds Array
**Problem**: `seenIds` accumulates all viewed post IDs during a session — grows unbounded with long scrolling.

**Fix**: Cap at last 200 IDs in the frontend:
```ts
const seen = Array.from(seenIdsRef.current).slice(-200);
```

**Files**: `src/app/pages/feed.tsx`

---

### 13. Cursor-Based Pagination for Feed
**Problem**: Offset-based pagination becomes slow at high offsets (`OFFSET 10000`).

**Fix**: Switch to cursor-based pagination using `createdAt` of last post:
```graphql
feed(limit: 20, after: "2026-04-01T00:00:00Z", seenIds: [...])
```

**Files**: `backend/src/graphql/typedefs/index.ts`, `backend/src/graphql/resolvers/feed.resolvers.ts`, `src/app/pages/feed.tsx`

**Impact**: Constant-time pagination regardless of depth

---

## Implementation Order

| Phase | Items | Estimated Effort | Cumulative Impact |
|-------|-------|-----------------|-------------------|
| **Sprint 1** | P0 #1, #2 | ~2 hours | Prevents crashes, ~90% payload reduction |
| **Sprint 2** | P1 #3, #4 | ~2 hours | ~40% fewer DB queries per feed load |
| **Sprint 3** | P2 #5, #6, #7, #8, #9 | ~3 hours | ~60% less JS, ~50% fewer requests |
| **Sprint 4** | P3 #10, #11, #12, #13 | ~2 hours | Polish, unbounded growth prevention |

---

## Expected Before/After

| Metric | Before | After All Sprints |
|--------|--------|-------------------|
| First load queries | 9+ parallel DB queries | 4-5 (cached signals) |
| Feed payload | 50-200 KB | 10-30 KB |
| Initial JS bundle | 1.89 MB | ~600 KB (code split) |
| Chat connections | Every page | Only messaging pages |
| Sidebar queries | Every navigation | Cache-first, 5-min poll |
| Max comment depth | 3 levels (unlimited) | Preview only (3 top-level) |
| Worst-case limit | Unbounded | Capped at 50 |
