import { useEffect, useState } from "react";
import type React from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { MY_ROAST_TOKENS, ROAST_REACT, ROAST_REACTORS } from "../graphql";

type UseRoastReactionInput = {
  postId?: string | null;
  userId?: string | null;
  authorId?: string | null;
  isRoast: boolean;
  initialReacted?: boolean | null;
  initialCount?: number | null;
};

export function useRoastReaction({
  postId,
  userId,
  authorId,
  isRoast,
  initialReacted = false,
  initialCount = 0,
}: UseRoastReactionInput) {
  const isOwnPost = !!userId && !!authorId && userId === authorId;
  const [roastReacted, setRoastReacted] = useState(initialReacted ?? false);
  const [roastReactCount, setRoastReactCount] = useState(initialCount ?? 0);
  const [roastReactError, setRoastReactError] = useState<string | null>(null);
  const [roastReactLoading, setRoastReactLoading] = useState(false);
  const [flameHovered, setFlameHovered] = useState(false);
  const [showReactors, setShowReactors] = useState(false);

  const [doRoastReact] = useMutation(ROAST_REACT);
  const { data: tokenData, refetch: refetchTokens } = useQuery(MY_ROAST_TOKENS, {
    skip: !userId || !isRoast || isOwnPost,
    fetchPolicy: "network-only",
  });
  const [fetchReactors, { data: reactorsData, loading: reactorsLoading }] = useLazyQuery(ROAST_REACTORS, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    setRoastReacted(initialReacted ?? false);
    setRoastReactCount(initialCount ?? 0);
    setRoastReactError(null);
  }, [postId, initialReacted, initialCount]);

  const tokensRemaining: number = (tokenData as any)?.myRoastTokens?.remaining ?? 999;
  const tokenDataLoaded: boolean = !!(tokenData as any)?.myRoastTokens;
  const tokenAllowance: number = (tokenData as any)?.myRoastTokens?.allowance ?? 1;

  async function handleRoastReact(event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!postId || !userId || isOwnPost || roastReacted) return;
    if (tokenDataLoaded && tokensRemaining === 0) {
      setRoastReactError("No 🔥 tokens left today. Balik bukas! 🕛");
      return;
    }

    setRoastReactLoading(true);
    setRoastReactError(null);
    setRoastReacted(true);
    setRoastReactCount((n) => n + 1);

    try {
      await doRoastReact({ variables: { postId } });
      refetchTokens();
    } catch (err: any) {
      setRoastReacted(false);
      setRoastReactCount((n) => Math.max(0, n - 1));

      const message: string = err?.message ?? "";
      if (message.startsWith("ROAST_TOKEN_EXHAUSTED:")) {
        const limit = message.split(":")[1];
        setRoastReactError(`No 🔥 tokens left today (${limit}/${limit} used). Balik bukas! 🕛`);
      } else if (message.includes("already gave")) {
        setRoastReacted(true);
        setRoastReactError(null);
      } else {
        setRoastReactError("Failed to send 🔥 react. Try again.");
      }
    } finally {
      setRoastReactLoading(false);
    }
  }

  return {
    flameHovered,
    fetchReactors,
    handleRoastReact,
    isOwnPost,
    reactorsData,
    reactorsLoading,
    roastReactCount,
    roastReactError,
    roastReactLoading,
    roastReacted,
    setFlameHovered,
    setShowReactors,
    showReactors,
    tokenAllowance,
    tokenDataLoaded,
    tokensRemaining,
  };
}
