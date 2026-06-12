import { ApolloClient, InMemoryCache } from "@apollo/client/core";
import { from } from "@apollo/client/link";
import { createHttpLink } from "@apollo/client/link/http";
import { setContext } from "@apollo/client/link/context";
import { DocumentTransform } from "@apollo/client/utilities";
import { separateOperations, OperationDefinitionNode, FragmentDefinitionNode, Kind, DocumentNode } from "graphql";
import { supabase } from "./supabase";
import { GRAPHQL_URL } from "./env";

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include",
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

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
  // Always do a fresh getSession() — it reads from localStorage and is fast.
  // This prevents the race where cachedToken is still null on first load.
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? cachedToken ?? null;
  const csrfToken = readCookie("lokal_csrf_token");
  // Keep cache in sync
  cachedToken = token;

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
    },
  };
});

// ── Remove unused fragment definitions before sending the request ──────────
// Apollo Client v4 does not strip unused fragments by default. Several
// queries interpolate `POST_CARD_FRAGMENT` (which transitively references
// the other 4 fragments), and a few queries interpolate just one fragment
// (`AUTHOR_FRAGMENT`, `TAG_FRAGMENT`, `RANK_FRAGMENT`). Without this strip,
// the server's `NoUnusedFragments` validator rejects requests that include
// fragment definitions the operation never reaches.
//
// `separateOperations` from `graphql` does exactly this: for each operation
// in the document, it produces a new document containing only the fragment
// definitions that operation transitively uses. We pick the first operation
// (queries and mutations in this codebase always have exactly one).
const stripUnusedFragments = new DocumentTransform((document: DocumentNode): DocumentNode => {
  const operation = document.definitions.find(
    (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION
  );
  if (!operation) return document;
  const operationName = operation.name?.value ?? "";
  const separated = separateOperations(document);
  return separated[operationName] ?? document;
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  documentTransform: stripUnusedFragments,
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
