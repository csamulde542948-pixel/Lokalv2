import { useState, useRef, useEffect } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { X as XIcon, MessageCircle, Loader2 } from "lucide-react";
import { CommentInput } from "./CommentInput";
import { CommentItem } from "./CommentItem";
import { adaptComment } from "../adapters";
import { useAuth } from "../../../../contexts/AuthContext";
import { useMeProfile } from "../hooks/useMeProfile";
import { useCommentComposer, type ReplyTarget } from "../hooks/useCommentComposer";
import { useCommentActions } from "../hooks/useCommentActions";
import { GET_POST_COMMENTS } from "../graphql";
import type { CommentData } from "../types";

type CommentSectionMode = "collapsed" | "open" | "always";

interface CommentSectionProps {
  postId: string;
  /** Initial count from the parent (server-rendered into the stats row). */
  initialCount: number;
  /** Initial comments — usually the `commentsPreview` from the post. */
  initialComments?: CommentData[];
  /**
   * - `collapsed` — hidden behind a "View comments" link / click on the action bar.
   *   Use the `defaultOpen` flag to control initial visibility.
   * - `open` — always visible inside the card body.
   * - `always` — always visible + no border, used by the post modal.
   */
  mode?: CommentSectionMode;
  defaultOpen?: boolean;
  /**
   * If set, the section auto-opens the comment input on mount (used by the
   * modal when the user clicks the comment count in the stats row).
   */
  focusInputOnMount?: boolean;
  /**
   * If set, scrolls the comment list to the bottom after the section
   * becomes visible. Used by the modal.
   */
  scrollToBottomOnOpen?: boolean;
  /**
   * Increments to trigger focus on the comment input + scroll-to-bottom.
   * Used by the post modal when the user clicks the "X comments" link in
   * the stats row while the section is already open.
   */
  focusSignal?: number;
  composerPlacement?: "top" | "bottom";
  onOpenComment?: (commentId: string) => void;
  showNestedReplies?: boolean;
  onCountChange?: (count: number) => void;
}

/**
 * The comment block: header (with loading/empty state) + comment list +
 * optional reply banner + comment input. Encapsulates the lazy fetch of
 * the full thread, optimistic composer, and like/edit/delete actions.
 *
 * Shared by `PostCard`, `RoastedProjectCard`, and `PostModal`.
 */
export function CommentSection({
  postId,
  initialCount,
  initialComments = [],
  mode = "collapsed",
  defaultOpen = false,
  focusInputOnMount = false,
  scrollToBottomOnOpen = false,
  focusSignal = 0,
  composerPlacement = "bottom",
  onOpenComment,
  showNestedReplies = true,
  onCountChange,
}: CommentSectionProps) {
  const { user } = useAuth();
  const { me: meProfile } = useMeProfile();

  const [localComments,     setLocalComments]     = useState<CommentData[]>(initialComments);
  const [localCommentCount, setLocalCommentCount] = useState(initialCount);
  const [open,              setOpen]              = useState(mode === "always" || defaultOpen);
  const [replyingTo,        setReplyingTo]        = useState<ReplyTarget | null>(null);
  const [commentsError,     setCommentsError]     = useState(false);

  const commentsFetchedRef = useRef(false);
  const replyInputRef      = useRef<HTMLTextAreaElement>(null);
  const cardInputRef       = useRef<HTMLTextAreaElement>(null);
  const commentListRef     = useRef<HTMLDivElement>(null);

  // Real profile (name / username / displayName / avatarUrl) comes from
  // useMeProfile so the comment input avatar + optimistic comments use
  // the actual user identity, not an email-prefix fallback.
  const myDisplayName = meProfile?.displayName ?? meProfile?.name ?? meProfile?.username;
  const myAvatarUrl = meProfile?.avatarUrl;

  const [fetchComments, { loading: commentsLoading, data: commentsQueryData, error: commentsQueryError }] =
    useLazyQuery(GET_POST_COMMENTS, { fetchPolicy: "network-only" });

  // Sync thread from lazy query result (Apollo v4 removed onCompleted).
  useEffect(() => {
    if (!commentsQueryData) return;
    const fetched: any[] = (commentsQueryData as any)?.post?.comments ?? [];
    setLocalComments(fetched.map(adaptComment));
    // Update the count to the denormalized total if the server returns it,
    // otherwise fall back to the top-level count. We DO NOT naively use
    // `fetched.length` because replies are loaded separately by the user
    // (and repliesCount on each comment is what the server has already
    // counted into Post.commentsCount).
    const totalFromServer = (commentsQueryData as any)?.post?.commentsCount;
    if (typeof totalFromServer === "number" && totalFromServer > 0) {
      setLocalCommentCount(totalFromServer);
    } else if (fetched.length > 0) {
      setLocalCommentCount((prev) => Math.max(prev, fetched.length));
    }
    commentsFetchedRef.current = true;
    setCommentsError(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsQueryData]);

  // Auto-fetch when the section opens. Without this, the user clicks the
  // "X comments" button on a post card, the section expands, and they only
  // see the commentsPreview slice (3 items) — never the full thread — until
  // they click "Reply" or another interactive element. This effect kicks
  // off the full GET_POST_COMMENTS query as soon as the section is shown.
  useEffect(() => {
    if (open && !commentsFetchedRef.current && !commentsLoading) {
      doFetchComments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!commentsQueryError) return;
    commentsFetchedRef.current = false;
    setCommentsError(true);
  }, [commentsQueryError]);

  // External "open and focus input" trigger (used by the modal's stats-row button).
  useEffect(() => {
    if (!focusInputOnMount) return;
    setOpen(true);
    if (!commentsFetchedRef.current) doFetchComments();
    setReplyingTo(null);
    setTimeout(() => cardInputRef.current?.focus(), 50);
    if (scrollToBottomOnOpen) {
      setTimeout(() => {
        commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight, behavior: "smooth" });
      }, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusInputOnMount]);

  // External "focus the input again" trigger (used by the modal when the
  // user clicks the comment-count link while the section is already open).
  useEffect(() => {
    if (focusSignal === 0) return;
    setReplyingTo(null);
    setTimeout(() => {
      cardInputRef.current?.focus();
      commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal]);

  // Surface count changes to the parent for the stats row.
  useEffect(() => {
    onCountChange?.(localCommentCount);
  }, [localCommentCount, onCountChange]);

  function doFetchComments() {
    commentsFetchedRef.current = false;
    setCommentsError(false);
    fetchComments({ variables: { postId, limit: 20, offset: 0 } });
  }

  function openCommentBox() {
    setOpen(true);
    if (!commentsFetchedRef.current) doFetchComments();
    setReplyingTo(null);
    setTimeout(() => cardInputRef.current?.focus(), 50);
  }

  function startReply(parentId: string, parentName: string, visualParentId?: string, topLevelId?: string) {
    setOpen(true);
    if (!commentsFetchedRef.current) doFetchComments();
    setReplyingTo({ id: parentId, name: parentName, visualParentId, topLevelId });
    setTimeout(() => replyInputRef.current?.focus(), 50);
  }

  const { handleComment, handleReply, submittingComment, submittingReply } = useCommentComposer({
    postId,
    replyingTo,
    setReplyingTo,
    setComments: setLocalComments,
    setCommentCount: setLocalCommentCount,
  });

  const { handleLikeComment, handleEditComment, handleDeleteComment } = useCommentActions({
    comments: localComments,
    setComments: setLocalComments,
    setCommentCount: setLocalCommentCount,
  });

  // Always-on mode renders the section as the main content (used by the modal).
  if (mode === "always") {
    return (
      <>
        {composerPlacement === "top" && (
          <div className="px-4 py-3 border-b bg-card flex-shrink-0 space-y-2">
            {replyingTo && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                <span>
                  Replying to <span className="font-semibold text-foreground">{replyingTo.name}</span>
                </span>
                <button onClick={() => setReplyingTo(null)} className="hover:text-foreground">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            )}
            {replyingTo ? (
              <CommentInput
                user={user}
                displayName={myDisplayName}
                avatarUrl={myAvatarUrl}
                onSubmit={handleReply}
                inputRef={replyInputRef}
                autoFocus
                submitting={submittingReply}
                placeholder={`Reply to ${replyingTo.name}â€¦`}
                initialText={`@${replyingTo.name} `}
              />
            ) : (
              <CommentInput
                user={user}
                displayName={myDisplayName}
                avatarUrl={myAvatarUrl}
                onSubmit={handleComment}
                inputRef={cardInputRef}
                submitting={submittingComment}
                placeholder="Post your reply"
              />
            )}
          </div>
        )}
        <div
          ref={commentListRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{ scrollbarWidth: "none" }}
        >
          {commentsLoading && localComments.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {commentsError && (
            <div className="text-xs text-muted-foreground text-center py-2">
              Couldn't load comments.{" "}
              <button className="underline hover:text-foreground" onClick={doFetchComments}>Retry</button>
            </div>
          )}
          {!commentsLoading && !commentsError && localComments.length === 0 && commentsFetchedRef.current && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <MessageCircle className="w-8 h-8 opacity-20" strokeWidth={1.5} />
              <p className="text-xs">No comments yet. Be the first!</p>
            </div>
          )}
          {localComments.map((comment) => (
            <div key={comment.id} className="border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/25">
              <CommentItem
                comment={comment}
                currentUserId={user?.id}
                postId={postId}
                onDelete={handleDeleteComment}
                onReply={startReply}
                onLikeToggle={handleLikeComment}
                onEdit={handleEditComment}
                onOpenComment={onOpenComment}
                showNestedReplies={showNestedReplies}
              />
            </div>
          ))}
        </div>

        {/* Pinned input */}
        {composerPlacement === "bottom" && <div className="px-4 py-3 border-t bg-card flex-shrink-0 space-y-2">
          {replyingTo && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
              <span>
                Replying to <span className="font-semibold text-foreground">{replyingTo.name}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="hover:text-foreground">
                <XIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          {replyingTo ? (
            <CommentInput
              user={user}
              displayName={myDisplayName}
              avatarUrl={myAvatarUrl}
              onSubmit={handleReply}
              inputRef={replyInputRef}
              autoFocus
              submitting={submittingReply}
              placeholder={`Reply to ${replyingTo.name}…`}
              initialText={`@${replyingTo.name} `}
            />
          ) : (
            <CommentInput
              user={user}
              displayName={myDisplayName}
              avatarUrl={myAvatarUrl}
              onSubmit={handleComment}
              inputRef={cardInputRef}
              submitting={submittingComment}
              placeholder="Write a comment…"
            />
          )}
        </div>}
      </>
    );
  }

  // Collapsed / open mode — renders inside a collapsible container.
  if (!open) return null;

  return (
    <div className="border-t bg-background">
      {commentsLoading && localComments.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-2">Loading comments…</div>
      )}
      {commentsError && (
        <div className="text-xs text-muted-foreground text-center py-2">
          Couldn't load comments.{" "}
          <button className="underline hover:text-foreground" onClick={doFetchComments}>Retry</button>
        </div>
      )}
      {!commentsLoading && !commentsError && localComments.length === 0 && commentsFetchedRef.current && (
        <div className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</div>
      )}
      {localComments.map((comment) => (
        <div key={comment.id} className="border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/25">
          <CommentItem
            comment={comment}
            currentUserId={user?.id}
            postId={postId}
            onDelete={handleDeleteComment}
            onReply={startReply}
            onLikeToggle={handleLikeComment}
            onEdit={handleEditComment}
            onOpenComment={onOpenComment}
            showNestedReplies={showNestedReplies}
          />
        </div>
      ))}

      {replyingTo && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
          <span>Replying to <span className="font-semibold text-foreground">{replyingTo.name}</span></span>
          <button onClick={() => setReplyingTo(null)} className="hover:text-foreground ml-2">
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {replyingTo ? (
        <CommentInput
          user={user}
          displayName={myDisplayName}
          avatarUrl={myAvatarUrl}
          onSubmit={handleReply}
          inputRef={replyInputRef}
          autoFocus
          submitting={submittingReply}
          placeholder={`Reply to ${replyingTo.name}…`}
          initialText={`@${replyingTo.name} `}
        />
      ) : (
        <CommentInput
          user={user}
          displayName={myDisplayName}
          avatarUrl={myAvatarUrl}
          onSubmit={handleComment}
          inputRef={cardInputRef}
          submitting={submittingComment}
        />
      )}
    </div>
  );
}
