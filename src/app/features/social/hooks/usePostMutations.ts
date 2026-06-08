import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import {
  DELETE_POST,
  MARK_NOT_INTERESTED,
  PIN_POST,
  UNPIN_POST,
} from "../graphql";

/**
 * Centralized post-level mutations (delete, mark-not-interested, pin/unpin).
 * Replaces the inline `useMutation` calls that were scattered across
 * `post-card.tsx` and `feed.tsx`.
 *
 * Returns a `hidden` flag (true after the user clicks "Not interested")
 * and the three handlers + a pin handler. All errors are swallowed and
 * logged so the optimistic UI stays the source of truth.
 */
export function usePostMutations({
  postId,
  onDeleted,
  onHidden,
}: {
  postId: string;
  onDeleted?: () => void;
  onHidden?: () => void;
} = {} as { postId: string }) {
  const [deletePostMutation] = useMutation(DELETE_POST, {
    update(cache) {
      const ref = cache.identify({ __typename: "Post", id: postId });
      if (ref) {
        cache.evict({ id: ref });
        cache.gc();
      }
      cache.modify({
        fields: {
          pinnedPost: () => null,
        },
      });
    },
  });
  const [notInterestedMutation] = useMutation(MARK_NOT_INTERESTED);
  const [pinPostMutation] = useMutation(PIN_POST, {
    update(cache, { data }) {
      const newId = data?.pinPost?.id;
      if (!newId) return;
      cache.modify({
        fields: {
          pinnedPost: () => ({ __ref: `Post:${newId}` }),
        },
      });
    },
  });
  const [unpinPostMutation] = useMutation(UNPIN_POST, {
    update(cache) {
      cache.modify({
        fields: {
          pinnedPost: () => null,
        },
      });
    },
  });

  const [hidden, setHidden] = useState(false);
  const [busy, setBusy]     = useState<null | "delete" | "hide" | "pin">(null);

  const handleDelete = useCallback(async () => {
    if (!postId) return;
    setBusy("delete");
    try {
      await deletePostMutation({ variables: { id: postId } });
      onDeleted?.();
    } catch (err) {
      console.error("[usePostMutations] deletePost failed:", err);
    } finally {
      setBusy(null);
    }
  }, [deletePostMutation, postId, onDeleted]);

  const handleNotInterested = useCallback(async () => {
    if (!postId) return;
    setBusy("hide");
    try {
      await notInterestedMutation({ variables: { postId } });
      setHidden(true);
      onHidden?.();
    } catch (err) {
      console.error("[usePostMutations] markNotInterested failed:", err);
    } finally {
      setBusy(null);
    }
  }, [notInterestedMutation, postId, onHidden]);

  const handlePinToggle = useCallback(async (currentlyPinned: boolean) => {
    if (!postId) return;
    setBusy("pin");
    try {
      if (currentlyPinned) {
        await unpinPostMutation({ variables: { postId } });
      } else {
        await pinPostMutation({ variables: { postId } });
      }
    } catch (err) {
      console.error("[usePostMutations] pin toggle failed:", err);
    } finally {
      setBusy(null);
    }
  }, [pinPostMutation, unpinPostMutation, postId]);

  return {
    hidden,
    busy,
    handleDelete,
    handleNotInterested,
    handlePinToggle,
  };
}
