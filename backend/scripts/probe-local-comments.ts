const endpoint = process.env.GRAPHQL_URL ?? "http://localhost:4000/graphql";

async function gql(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: response.status };
  }
}

async function main() {
  const schema = await gql(`{
    __type(name: "PostComment") {
      fields { name }
    }
  }`);

  console.log("schema:", JSON.stringify(schema, null, 2));

  const feed = await gql(`query {
    feed(limit: 20) {
      posts {
        id
        commentsCount
        comments(limit: 5) {
          id
          content
          parentId
          repliesCount
        }
      }
    }
  }`);

  console.log("comments:", JSON.stringify(feed, null, 2));

  const candidate = feed.data?.feed?.posts
    ?.flatMap((post: any) => post.comments ?? [])
    ?.find((comment: any) => comment.id);

  if (!candidate) return;

  const focused = await gql(`query GetCommentPage($id: ID!) {
    comment(id: $id) {
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
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl isVerified }
      parent {
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
        editHistory { id previousContent editedAt }
        author { id name displayName username avatarUrl isVerified }
      }
      post {
        id
        content
        imageUrl
        imageUrls
        projectName
        postType
        tags { id name }
        likesCount
        commentsCount
        sharesCount
        likedByMe
        myReaction
        createdAt
        author { id name displayName username avatarUrl isVerified }
      }
      replies(limit: 30, offset: 0) {
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
        editHistory { id previousContent editedAt }
        author { id name displayName username avatarUrl isVerified }
      }
    }
  }`, { id: candidate.id });

  console.log("focused:", JSON.stringify({ id: candidate.id, focused }, null, 2));

  const commentWithReplies = feed.data?.feed?.posts
    ?.flatMap((post: any) => post.comments ?? [])
    ?.find((comment: any) => (comment.repliesCount ?? 0) > 0);

  if (!commentWithReplies) return;

  const replies = await gql(`query GetCommentReplies($commentId: ID!) {
    commentReplies(commentId: $commentId, limit: 5, offset: 0) {
      id
      content
      parentId
      repliesCount
    }
  }`, { commentId: commentWithReplies.id });

  const nestedCandidate = replies.data?.commentReplies?.[0];
  if (!nestedCandidate) return;

  const focusedNested = await gql(`query GetNestedComment($id: ID!) {
    comment(id: $id) {
      id
      content
      parentId
      parent { id content parentId repliesCount author { id name username avatarUrl isVerified } }
      post { id content postType commentsCount author { id name username avatarUrl isVerified } }
      replies(limit: 5, offset: 0) { id content parentId repliesCount author { id name username avatarUrl isVerified } }
      author { id name username avatarUrl isVerified }
      likesCount
      likedByMe
      myReaction
      mentions
      isEdited
      repliesCount
      createdAt
      editHistory { id previousContent editedAt }
    }
  }`, { id: nestedCandidate.id });

  console.log("focusedNested:", JSON.stringify({ id: nestedCandidate.id, focusedNested }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
