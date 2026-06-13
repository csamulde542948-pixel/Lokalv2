import { useQuery } from "@apollo/client/react";
import { Flame, Loader2, RotateCcw } from "lucide-react";
import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { avatarSrc } from "../../../../lib/defaults";
import { GET_COMMENT_REACTORS, GET_POST_REACTORS } from "../graphql";
import { VerifiedBadge } from "./VerifiedBadge";

interface ReactorProfile {
  id: string;
  name: string;
  displayName?: string | null;
  username: string;
  avatarUrl?: string | null;
  isVerified: boolean;
}

interface ReactorListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType: "post" | "comment";
}

export function ReactorListDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
}: ReactorListDialogProps) {
  const isPost = targetType === "post";
  const postQuery = useQuery(GET_POST_REACTORS, {
    variables: { postId: targetId, limit: 100 },
    skip: !open || !isPost,
    fetchPolicy: "network-only",
  });
  const commentQuery = useQuery(GET_COMMENT_REACTORS, {
    variables: { commentId: targetId, limit: 100 },
    skip: !open || isPost,
    fetchPolicy: "network-only",
  });

  const activeQuery = isPost ? postQuery : commentQuery;
  const reactors = (
    isPost
      ? postQuery.data?.postReactors
      : commentQuery.data?.commentReactors
  ) as ReactorProfile[] | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(620px,calc(100vh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader className="border-b px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 fill-primary text-primary" />
            Fire reactions
          </DialogTitle>
          <DialogDescription className="sr-only">
            People who reacted with fire.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-32 overflow-y-auto">
          {activeQuery.loading ? (
            <div className="flex min-h-36 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeQuery.error ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                Could not load reactions.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => activeQuery.refetch()}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : reactors?.length ? (
            <div className="divide-y">
              {reactors.map((profile) => {
                const displayName = profile.displayName || profile.name || profile.username;
                return (
                  <Link
                    key={profile.id}
                    to={`/profile/${profile.username}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarSrc(profile.avatarUrl)} />
                      <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{displayName}</span>
                        <VerifiedBadge
                          profileId={profile.id}
                          isVerified={profile.isVerified}
                        />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        @{profile.username}
                      </p>
                    </div>
                    <Flame className="h-4 w-4 shrink-0 fill-primary text-primary" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-6 text-center">
              <Flame className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No fire reactions yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
