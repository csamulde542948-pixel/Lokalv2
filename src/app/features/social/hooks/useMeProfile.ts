import { useQuery } from "@apollo/client/react";
import { GET_ME_PROFILE } from "../graphql";
import { useAuth } from "../../../../contexts/AuthContext";

/**
 * Central hook for "who is the current user" with the full profile shape.
 *
 * Why this exists: the Supabase auth `user` only carries auth metadata
 * (`id`, `email`, `user_metadata`). It has no `name`, `username`,
 * `displayName`, or `avatarUrl` — those live on the application's `Profile`
 * entity, fetched via the `me` GraphQL query.
 *
 * Anywhere the UI needs to display the current user as an author of
 * user-generated content (optimistic comments, new posts, share previews,
 * avatars in headers), it should use this hook instead of reading from
 * `useAuth().user` directly. That way:
 *
 *   1. The fallback "You" / "you" / no-avatar state never appears
 *      (we always have the real profile fields).
 *   2. The Apollo cache is primed with a `Profile` entity keyed by the
 *      user's id — so any post / comment / reply that references the
 *      current user as author gets the same normalized entry.
 *   3. The hook returns a `loading` flag so callers can show a spinner
 *      instead of a flash of default state.
 *
 * The query uses `cache-first`: if another component has already
 * populated the cache (e.g. `GET_ME_SIDEBAR` from the left sidebar),
 * this hook reuses that data without a network call. On first mount
 * the query fires normally and primes the cache for everyone else.
 */
export function useMeProfile() {
  const { user: authUser } = useAuth();
  const { data, loading, error, refetch } = useQuery(GET_ME_PROFILE, {
    skip: !authUser,
    fetchPolicy: "cache-first",
  });

  return {
    me: (data as any)?.me ?? null,
    loading,
    error,
    refetch,
    isAuthenticated: !!authUser,
  };
}
