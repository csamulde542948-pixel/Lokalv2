import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { from } from "@apollo/client/link";
import { createHttpLink } from "@apollo/client/link/http";
import { setContext } from "@apollo/client/link/context";
import { supabase } from "./supabase";
import { GRAPHQL_URL } from "./env";

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

// ── S3 #9: Cache Supabase JWT in memory to avoid localStorage read per request ──
let cachedToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? null;
});
// Seed on module load (in case session already exists)
supabase.auth.getSession().then(({ data }) => {
  cachedToken = data.session?.access_token ?? null;
});

// Attach the Supabase session JWT to every GraphQL request
const authLink = setContext(async (_, { headers }) => {
  // Use in-memory token first; fall back to async getSession only if null
  const token = cachedToken ?? (await supabase.auth.getSession()).data.session?.access_token ?? null;

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          feed: {
            // Key by feedVariant so "for_you" and "chronological" are cached separately
            keyArgs: ["feedVariant"],

            merge(existing, incoming, { args }) {
              // First page (no cursor) → replace entirely
              if (!args?.after) {
                return incoming;
              }

              // Subsequent pages → append posts, keep latest pageInfo
              const merged = { ...incoming };
              merged.posts = [
                ...(existing?.posts ?? []),
                ...(incoming?.posts ?? []),
              ];
              return merged;
            },
          },
          // Leaderboard / sidebar data — replace on new fetch, don't merge arrays
          leaderboard: { merge: false },
        },
      },
      // Normalise entities by id so Apollo can deduplicate across queries
      Post: { keyFields: ["id"] },
      Profile: { keyFields: ["id"] },
      Project: { keyFields: ["id"] },
      Job: { keyFields: ["id"] },
      Event: { keyFields: ["id"] },
    },
  }),
  defaultOptions: {
    watchQuery: {
      // S3 #8: Default to cache-first — only feed & notifications override to cache-and-network
      fetchPolicy: "cache-first",
    },
  },
});
