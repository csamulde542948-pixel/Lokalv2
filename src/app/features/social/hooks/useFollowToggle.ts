import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { FOLLOW_USER, UNFOLLOW_USER } from "../graphql";

type UseFollowToggleOptions = {
  userId?: string | null;
  isFollowing?: boolean;
  onChange?: (isFollowing: boolean) => void;
};

export function useFollowToggle({
  userId,
  isFollowing = false,
  onChange,
}: UseFollowToggleOptions) {
  const [localFollowing, setLocalFollowing] = useState(isFollowing);
  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);

  useEffect(() => {
    setLocalFollowing(isFollowing);
  }, [isFollowing]);

  async function toggleFollow() {
    if (!userId) return;
    const next = !localFollowing;
    setLocalFollowing(next);
    try {
      if (next) {
        await followUser({ variables: { userId } });
      } else {
        await unfollowUser({ variables: { userId } });
      }
      onChange?.(next);
    } catch {
      setLocalFollowing(!next);
    }
  }

  return {
    localFollowing,
    toggleFollow,
  };
}
