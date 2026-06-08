import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`w-4 h-4 fill-[#1877F2] text-white flex-shrink-0 ${className}`}
      aria-label="Verified account"
    />
  );
}
