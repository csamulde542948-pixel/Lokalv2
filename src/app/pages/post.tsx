import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { Button } from "../components/ui/button";
import { CommentModal } from "../features/social/components/CommentModal";
import { CommentSection } from "../features/social/components/CommentSection";
import { TimelinePost, type TimelinePostData } from "../features/social/components/TimelinePost";

const GET_POST_PAGE = gql`
  query GetPostPage($id: ID!) {
    post(id: $id) {
      id
      content
      imageUrl
      imageUrls
      projectName
      postType
      tags {
        id
        name
      }
      likesCount
      commentsCount
      sharesCount
      likedByMe
      myReaction
      createdAt
      author {
        id
        name
        displayName
        username
        avatarUrl
        isVerified
      }
    }
  }
`;

interface PostPageData {
  post: TimelinePostData | null;
}

export function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const { data, loading, error, refetch } = useQuery<PostPageData>(GET_POST_PAGE, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  });

  const post = data?.post ?? null;
  const authorName = post?.author.displayName ?? post?.author.name ?? post?.author.username ?? "Post";

  useEffect(() => {
    if (!post) return;
    setCommentCount(post.commentsCount ?? 0);
  }, [post?.id, post?.commentsCount]);

  return (
    <div className="min-h-screen bg-background">
      <LeftSidebar className="hidden xl:block fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-hidden border-r" />

      <main className="min-h-screen lg:mr-80 xl:ml-64">
        <div className="mx-auto min-h-screen max-w-[640px] border-x bg-background">
          <header className="sticky top-16 z-20 flex h-14 items-center gap-5 border-b bg-background/90 px-4 backdrop-blur">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold leading-5">Post</h1>
              {post && <p className="text-xs text-muted-foreground">{commentCount} replies</p>}
            </div>
          </header>

          {loading && (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error && !loading && (
            <div className="border-b px-4 py-8 text-center">
              <p className="text-sm font-medium text-destructive">Could not load this post.</p>
              <Button className="mt-3 rounded-full" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && !post && (
            <div className="px-8 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Post not found</h2>
              <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
            </div>
          )}

          {post && (
            <>
              <TimelinePost
                post={{ ...post, commentsCount: commentCount }}
                detail
                onOpenComments={() => setCommentModalOpen(true)}
              />

              <CommentSection
                postId={post.id}
                initialCount={commentCount}
                initialComments={[]}
                mode="always"
                composerPlacement="top"
                onOpenComment={(commentId) => navigate(`/comment/${commentId}`)}
                showNestedReplies={false}
                onCountChange={setCommentCount}
              />
            </>
          )}
        </div>
      </main>

      <RightSidebar
        category="home"
        className="hidden lg:block fixed top-16 right-0 h-[calc(100vh-4rem)] overflow-hidden border-l"
      />

      {post && commentModalOpen && (
        <CommentModal
          postId={post.id}
          authorName={authorName}
          content={post.content}
          initialCount={commentCount}
          onClose={() => setCommentModalOpen(false)}
          onCountChange={setCommentCount}
        />
      )}
    </div>
  );
}
