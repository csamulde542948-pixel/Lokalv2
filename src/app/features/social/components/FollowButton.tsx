import { UserCheck, UserPlus } from "lucide-react";

type FollowButtonProps = {
  isFollowing: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  labelClassName?: string;
  iconClassName?: string;
};

export function FollowButton({
  isFollowing,
  onClick,
  className,
  labelClassName,
  iconClassName = "w-3.5 h-3.5",
}: FollowButtonProps) {
  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center ${className ?? ""}`}
    >
      <Icon className={iconClassName} strokeWidth={2} />
      <span className={labelClassName}>{isFollowing ? "Following" : "Follow"}</span>
    </button>
  );
}
