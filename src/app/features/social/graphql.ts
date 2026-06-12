import { gql } from "@apollo/client/core";

export const COMMENT_ON_POST = gql`
  mutation CommentOnPost($input: CommentInput!) {
    commentOnPost(input: $input) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      mentions repliesCount
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl }
    }
  }
`;

export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: ID!, $limit: Int, $offset: Int) {
    post(id: $postId) {
      id
      commentsCount
      comments(limit: $limit, offset: $offset) {
        id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
        editHistory { id previousContent editedAt }
        author { id name displayName username avatarUrl }
        replies {
          id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
          editHistory { id previousContent editedAt }
          author { id name displayName username avatarUrl }
        }
      }
    }
  }
`;

export const REPLY_TO_COMMENT = gql`
  mutation ReplyToComment($input: ReplyInput!) {
    replyToComment(input: $input) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      mentions
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl }
    }
  }
`;

export const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: ID!, $reaction: String) {
    likeComment(commentId: $commentId, reaction: $reaction) { id likesCount likedByMe myReaction }
  }
`;

export const LIKE_POST = gql`
  mutation LikePostShared($postId: ID!, $reaction: String) {
    likePost(postId: $postId, reaction: $reaction) { id likesCount likedByMe myReaction }
  }
`;

export const UNLIKE_POST = gql`
  mutation UnlikePostShared($postId: ID!) {
    unlikePost(postId: $postId) { id likesCount likedByMe myReaction }
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUserShared($userId: ID!) {
    followUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUserShared($userId: ID!) {
    unfollowUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

export const UNLIKE_COMMENT = gql`
  mutation UnlikeComment($commentId: ID!) {
    unlikeComment(commentId: $commentId) { id likesCount likedByMe myReaction }
  }
`;

export const EDIT_COMMENT = gql`
  mutation EditComment($commentId: ID!, $content: String!) {
    editComment(commentId: $commentId, content: $content) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      editHistory { id previousContent editedAt }
      author { id name username avatarUrl }
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: ID!) { deleteComment(commentId: $commentId) }
`;

export const GET_COMMENT_REPLIES = gql`
  query GetCommentReplies($commentId: ID!, $limit: Int, $offset: Int) {
    commentReplies(commentId: $commentId, limit: $limit, offset: $offset) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl }
    }
  }
`;

export const ROAST_REACT = gql`
  mutation RoastReactShared($postId: ID!) {
    roastReact(postId: $postId) { id roastReactionCount roastReactedByMe }
  }
`;

export const MY_ROAST_TOKENS = gql`
  query MyRoastTokensShared { myRoastTokens { used allowance remaining resetsAt } }
`;

export const ROAST_REACTORS = gql`
  query RoastReactorsShared($postId: ID!) { roastReactors(postId: $postId) { id name username avatarUrl } }
`;

/* ─── Post-level mutations (previously inline in PostCard / feed.tsx) ─── */

export const DELETE_POST = gql`
  mutation DeletePost($id: ID!) { deletePost(id: $id) }
`;

export const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterested($postId: ID!) {
    markNotInterestedInPost(postId: $postId)
  }
`;

export const PIN_POST = gql`
  mutation PinPost($postId: ID!) {
    pinPost(postId: $postId) { id isPinnedToFeed }
  }
`;

export const UNPIN_POST = gql`
  mutation UnpinPost($postId: ID!) {
    unpinPost(postId: $postId) { id isPinnedToFeed }
  }
`;

export const RECORD_POST_SHARE = gql`
  mutation RecordPostShareShared($postId: ID!) {
    recordPostShare(postId: $postId) { id sharesCount }
  }
`;

/* ─── Auth helper used by CommentSection (mirrors PostCard) ─── */

export const GET_ME_AVATAR = gql`
  query GetMeAvatarShared { me { id avatarUrl } }
`;

/**
 * Phase 0: per-user, per-post impression tracker.
 *
 * Fired from two places:
 *   1. PostModal — every time the user opens the modal for a post.
 *      Captures the highest-intent signal we have (the user actively
 *      chose to see the full content).
 *   2. PostViewTracker (in feed.tsx) — the dwell time is captured by
 *      `RECORD_POST_VIEW` which already writes to user_post_impressions
 *      on the backend. This mutation is the explicit "intent" signal.
 */
export const RECORD_POST_IMPRESSION = gql`
  mutation RecordPostImpression(
    $postId: ID!
    $source: String
    $dwellMs: Int
    $engaged: Boolean
    $position: Int
    $sessionId: String
  ) {
    recordPostImpression(
      postId: $postId
      source: $source
      dwellMs: $dwellMs
      engaged: $engaged
      position: $position
      sessionId: $sessionId
    )
  }
`;

/**
 * Full `me` query — includes every field the UI needs to render the current
 * user as an author (display name, username, avatar, etc.). Used by the
 * `useMeProfile` hook to prime the Apollo cache with the complete Profile
 * shape so optimistic comments / new posts have real data to display
 * (instead of falling back to "you" / "@you" / no avatar).
 */
export const GET_ME_PROFILE = gql`
  query GetMeProfile {
    me {
      id
      name
      username
      displayName
      avatarUrl
    }
  }
`;

/* ─── Fragments ───────────────────────────────────────────────────────────── */

/**
 * Reusable field sets, bundled into a single `gql` document.
 *
 * Why one document? The server's `graphql-depth-limit` validator reads
 * fragment definitions from the request's `definitions` array. When a
 * fragment is composed from other fragments by name, every transitive
 * definition must be in the same request. Bundling them here and
 * interpolating `${ALL_FRAGMENTS}` into every query that uses a spread
 * guarantees the closure is present.
 *
 * Unused-fragment stripping: the Apollo Client v4 default doesn't strip
 * fragment definitions the operation never reaches — the server's
 * `NoUnusedFragments` validator would reject such requests. A custom
 * `documentTransform` in `src/lib/apollo.ts` runs `separateOperations` on
 * every document, so any unused fragments are removed before the request
 * goes out. That makes it safe to bundle everything into one document and
 * interpolate it from every query.
 *
 * Type notes: the backend's types are `Profile` (not `User`) for post
 * authors and `PostCommentEdit` (not `CommentEdit`) for the comment edit
 * history.
 *
 * Fragments:
 *   • `RankFields`            — Rank
 *   • `AuthorFields`          — Profile
 *   • `TagFields`             — Tag
 *   • `CommentPreviewFields`  — PostComment (preview subset for cards)
 *   • `OriginalPostFields`    — Post (lightweight nested post for shares)
 *   • `PostCardFields`        — Post (full card shape; reused by the modal too)
 */
export const ALL_FRAGMENTS = gql`
  fragment RankFields on Rank {
    id
    name
    description
    minXp
    maxXp
    iconName
    color
    bgColor
    borderColor
  }

  fragment AuthorFields on Profile {
    id
    name
    displayName
    username
    avatarUrl
    isVerified
    isFollowedByMe
    rank { ...RankFields }
  }

  fragment TagFields on Tag {
    id
    name
  }

  fragment CommentPreviewFields on PostComment {
    id
    content
    likesCount
    likedByMe
    myReaction
    parentId
    mentions
    isEdited
    repliesCount
    createdAt
    author { ...AuthorFields }
  }

  fragment OriginalPostFields on Post {
    id
    content
    imageUrl
    imageUrls
    videoUrl
    projectName
    postType
    tags { ...TagFields }
    createdAt
    author { ...AuthorFields }
    roastReactedByMe
    roastReactionCount
  }

  fragment PostCardFields on Post {
    id
    content
    imageUrl
    imageUrls
    videoUrl
    projectName
    likesCount
    commentsCount
    sharesCount
    likedByMe
    myReaction
    postType
    createdAt
    roastReactedByMe
    roastReactionCount
    isPinnedToFeed
    author { ...AuthorFields }
    tags { ...TagFields }
    originalPost { ...OriginalPostFields }
    commentsPreview(limit: 3) { ...CommentPreviewFields }
  }
`;
