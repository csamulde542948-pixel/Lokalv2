import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { PostCard } from "../components/post-card";
import { RoastedProjectCard, FeedPost } from "../components/roasted-project-card";
import { CreatePost } from "../components/create-post";
import {
  MapPin, Link2, Calendar, Code2, Camera,
  Edit, UserPlus, UserCheck, MoreHorizontal, Star, Users, Image as ImageIcon, Loader2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { avatarSrc, DEFAULT_COVER } from "../../lib/defaults";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      username
      displayName
      avatarUrl
      bio
      location
      website
      xp
      followersCount
      followingCount
      postsCount
      projectsCount
      rank { name color }
    }
  }
`;

const GET_USER_POSTS = gql`
  query GetUserPosts($userId: ID!, $limit: Int, $offset: Int) {
    userPosts(userId: $userId, limit: $limit, offset: $offset) {
      posts {
        id content imageUrl imageUrls projectName postType
        likesCount commentsCount sharesCount likedByMe myReaction createdAt
        author { id name displayName username avatarUrl }
        tags { id name }
        commentsPreview(limit: 3) {
          id content likesCount likedByMe myReaction parentId createdAt isEdited mentions
          author { id name displayName username avatarUrl }
          replies {
            id content likesCount likedByMe myReaction parentId createdAt isEdited mentions
            author { id name displayName username avatarUrl }
            replies {
              id content likesCount likedByMe myReaction parentId createdAt isEdited mentions
              author { id name displayName username avatarUrl }
            }
          }
        }
        originalPost {
          id content imageUrl imageUrls projectName postType
          tags { id name }
          createdAt
          author { id name displayName username avatarUrl }
        }
      }
      hasMore
    }
  }
`;

const GET_USER_PROJECTS = gql`
  query GetUserProjectsProfile($userId: ID!) {
    userProjects(userId: $userId) {
      id name tagline starsCount
      tags { name }
    }
  }
`;

const GET_PROFILE_BY_USERNAME = gql`
  query GetProfileByUsername($username: String!) {
    profile(username: $username) {
      id name username displayName avatarUrl bio location website xp
      followersCount followingCount postsCount projectsCount
      isFollowedByMe
      rank { name color }
    }
  }
`;

const FOLLOW_USER = gql`
  mutation ProfileFollowUser($userId: ID!) {
    followUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

const UNFOLLOW_USER = gql`
  mutation ProfileUnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

const UPDATE_PROFILE = gql`
  mutation ProfileUpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) { id avatarUrl coverUrl }
  }
`;

const LIKE_POST = gql`
  mutation ProfileLikePost($postId: ID!, $reaction: String) {
    likePost(postId: $postId, reaction: $reaction) { id likesCount likedByMe myReaction }
  }
`;

const UNLIKE_POST = gql`
  mutation ProfileUnlikePost($postId: ID!) {
    unlikePost(postId: $postId) { id likesCount likedByMe myReaction }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function adaptComment(c: any): any {
  return {
    id: c.id,
    content: c.content,
    likesCount: c.likesCount ?? 0,
    likedByMe: c.likedByMe ?? false,
    myReaction: c.myReaction ?? null,
    parentId: c.parentId ?? null,
    mentions: c.mentions ?? [],
    isEdited: c.isEdited ?? false,
    editHistory: (c.editHistory ?? []).map((e: any) => ({
      id: e.id, previousContent: e.previousContent, editedAt: e.editedAt,
    })),
    createdAt: c.createdAt,
    replies: (c.replies ?? []).map(adaptComment),
    author: {
      id: c.author?.id,
      name: c.author?.displayName ?? c.author?.username ?? c.author?.name ?? "Unknown",
      username: `@${c.author?.username ?? "?"}`,
      avatarUrl: c.author?.avatarUrl,
    },
  };
}

function adaptPost(p: any) {
  return {
    id: p.id,
    author: {
      id: p.author?.id,
      name: p.author?.displayName ?? p.author?.username ?? p.author?.name ?? "Unknown",
      username: `@${p.author?.username ?? "?"}`,
      avatar: avatarSrc(p.author?.avatarUrl),
    },
    content: p.content,
    image: p.imageUrl ?? undefined,
    images: p.imageUrls ?? (p.imageUrl ? [p.imageUrl] : []),
    likes: p.likesCount ?? 0,
    comments: p.commentsCount ?? 0,
    shares: p.sharesCount ?? 0,
    timestamp: timeAgo(p.createdAt),
    projectName: p.projectName ?? undefined,
    likedByMe: p.likedByMe ?? false,
    myReaction: p.myReaction ?? null,
    postType: (p.postType ?? "post") as "post" | "roast",
    tags: p.tags ?? [],
    initialComments: (p.commentsPreview ?? []).map(adaptComment),
    originalPost: p.originalPost
      ? {
          id: p.originalPost.id,
          content: p.originalPost.content,
          imageUrl: p.originalPost.imageUrl,
          imageUrls: p.originalPost.imageUrls ?? [],
          projectName: p.originalPost.projectName ?? undefined,
          postType: (p.originalPost.postType ?? "post") as "post" | "roast",
          tags: p.originalPost.tags ?? [],
          createdAt: p.originalPost.createdAt,
          author: {
            id: p.originalPost.author?.id,
            name: p.originalPost.author?.displayName ?? p.originalPost.author?.username ?? p.originalPost.author?.name ?? "Unknown",
            username: p.originalPost.author?.username ?? "",
            avatarUrl: p.originalPost.author?.avatarUrl,
          },
        }
      : null,
  };
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function PostSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = "posts" | "about" | "projects";

export function Profile() {
  const { user } = useAuth();
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const isOtherUser = !!username;
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  // Own profile
  const { data: meData, loading: meLoading } = useQuery(GET_ME, {
    skip: !user || isOtherUser,
    fetchPolicy: "cache-and-network",
  });

  // Other user's profile
  const { data: profileData, loading: profileLoading, refetch: refetchProfile } = useQuery(GET_PROFILE_BY_USERNAME, {
    skip: !isOtherUser,
    variables: { username },
    fetchPolicy: "cache-and-network",
  });

  const profile = isOtherUser ? profileData?.profile : meData?.me;
  const loading = isOtherUser ? profileLoading : meLoading;

  // Follow state — optimistic UI
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);
  const [optimisticFollowers, setOptimisticFollowers] = useState<number | null>(null);
  const isFollowing = optimisticFollowing ?? (profile?.isFollowedByMe ?? false);
  const followersCount = optimisticFollowers ?? (profile?.followersCount ?? 0);

  // Photo upload state (own profile only)
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading]   = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl]   = useState<string | null>(null);
  const [localCoverUrl, setLocalCoverUrl]     = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef  = useRef<HTMLInputElement>(null);

  const [updateProfile] = useMutation(UPDATE_PROFILE);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image too large. Max 2 MB."); return; }
    setAvatarUploading(true);
    const toastId = toast.loading("Uploading photo…");
    try {
      const ext  = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        if (upErr.message?.toLowerCase().includes("bucket")) {
          throw new Error("Storage bucket 'avatars' not found. Run migration 15 in the Supabase SQL editor.");
        }
        throw upErr;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      toast.loading("Saving profile…", { id: toastId });
      await updateProfile({ variables: { input: { avatarUrl } } });
      setLocalAvatarUrl(avatarUrl);
      toast.success("Profile photo updated!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed.", { id: toastId });
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large. Max 5 MB."); return; }
    setCoverUploading(true);
    const toastId = toast.loading("Uploading cover photo…");
    try {
      const ext  = file.name.split(".").pop();
      const path = `covers/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("covers").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) {
        if (upErr.message?.toLowerCase().includes("bucket")) {
          throw new Error("Storage bucket 'covers' not found. Run migration 15 in the Supabase SQL editor.");
        }
        throw upErr;
      }
      const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
      const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      toast.loading("Saving cover…", { id: toastId });
      await updateProfile({ variables: { input: { coverUrl } } });
      setLocalCoverUrl(coverUrl);
      toast.success("Cover photo updated!", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed.", { id: toastId });
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);
  const isOwnProfile = !!user && !!profile?.id && user.id === profile.id;

  async function handleFollowToggle() {
    if (!profile?.id) return;
    const nowFollowing = !isFollowing;
    setOptimisticFollowing(nowFollowing);
    setOptimisticFollowers(followersCount + (nowFollowing ? 1 : -1));
    try {
      if (nowFollowing) {
        await followUser({ variables: { userId: profile.id } });
      } else {
        await unfollowUser({ variables: { userId: profile.id } });
      }
      await refetchProfile();
      setOptimisticFollowing(null);
      setOptimisticFollowers(null);
    } catch {
      // revert on error
      setOptimisticFollowing(!nowFollowing);
      setOptimisticFollowers(followersCount + (nowFollowing ? -1 : 1));
    }
  }

  // Posts
  const { data: postsData, loading: postsLoading, refetch: refetchPosts } = useQuery(GET_USER_POSTS, {
    skip: !profile?.id,
    variables: { userId: profile?.id, limit: 20 },
    fetchPolicy: "cache-and-network",
  });

  // Projects — works for own AND other user profiles
  const { data: projectsData, loading: projectsLoading } = useQuery(GET_USER_PROJECTS, {
    skip: !profile?.id,
    variables: { userId: profile?.id },
    fetchPolicy: "cache-and-network",
  });

  const posts = postsData?.userPosts?.posts ?? [];
  const projects = projectsData?.userProjects ?? [];

  // Like handlers
  const [likePost] = useMutation(LIKE_POST);
  const [unlikePost] = useMutation(UNLIKE_POST);
  const handleLike = useCallback(
    async (postId: string, wantsLike: boolean, reaction?: string) => {
      try {
        if (wantsLike) {
          await likePost({ variables: { postId, reaction: reaction ?? "like" } });
        } else {
          await unlikePost({ variables: { postId } });
        }
        refetchPosts();
      } catch (e) {
        console.error("Like error", e);
      }
    },
    [likePost, unlikePost, refetchPosts]
  );

  const displayName = profile?.displayName ?? profile?.name ?? user?.email ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Photo — standalone element, NOT wrapping the info bar */}
      <div className="h-56 sm:h-72 bg-gradient-to-br from-primary/20 via-muted to-primary/10 relative overflow-hidden">
        <img
          src={localCoverUrl || profile?.coverUrl || DEFAULT_COVER}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        {!isOtherUser && (
          <>
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 gap-2 bg-card/95 hover:bg-card"
              onClick={() => coverFileRef.current?.click()}
              disabled={coverUploading}
            >
              {coverUploading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Camera className="w-4 h-4" strokeWidth={2} />}
              {coverUploading ? "Uploading…" : "Edit Cover Photo"}
            </Button>
            <input
              ref={coverFileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleCoverUpload}
            />
          </>
        )}
      </div>

      {/* Profile Info Bar — BELOW the cover, avatar overlaps bottom edge via negative margin */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          {loading ? (
            <div className="py-4 flex items-center gap-4">
              <Skeleton className="w-24 h-24 rounded-full -mt-12 flex-shrink-0 border-4 border-card" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3">
                {/* Avatar + name */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                  <div className="relative -mt-14 sm:-mt-16 flex-shrink-0">
                    <Avatar className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-card ring-2 ring-background">
                      <AvatarImage src={avatarSrc(localAvatarUrl || profile?.avatarUrl)} />
                      <AvatarFallback className="text-2xl font-bold">
                        {displayName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {!isOtherUser && (
                      <>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute bottom-1 right-1 h-7 w-7 rounded-full bg-muted hover:bg-muted/80"
                          onClick={() => avatarFileRef.current?.click()}
                          disabled={avatarUploading}
                        >
                          {avatarUploading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Camera className="w-3.5 h-3.5" strokeWidth={2} />}
                        </Button>
                        <input
                          ref={avatarFileRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </>
                    )}
                  </div>
                  <div className="text-center sm:text-left pb-2">
                    <h1 className="text-2xl font-bold leading-tight">{displayName}</h1>
                    <p className="text-sm text-muted-foreground">@{profile?.username ?? "—"}</p>
                    {profile?.rank && (
                      <Badge
                        className="mt-1 text-xs"
                        style={{
                          backgroundColor: profile.rank.color + "22",
                          color: profile.rank.color,
                          borderColor: profile.rank.color + "55",
                        }}
                        variant="outline"
                      >
                        {profile.rank.name}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pb-2 justify-center sm:justify-start flex-shrink-0">
                  {isOtherUser && !isOwnProfile ? (
                    <>
                      <Button
                        size="sm"
                        variant={isFollowing ? "secondary" : "default"}
                        className="gap-2"
                        onClick={handleFollowToggle}
                      >
                        {isFollowing ? (
                          <><UserCheck className="w-4 h-4" strokeWidth={2} />Following</>
                        ) : (
                          <><UserPlus className="w-4 h-4" strokeWidth={2} />Follow</>
                        )}
                      </Button>
                      <Button size="sm" variant="secondary">
                        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" className="gap-2">
                        <Edit className="w-4 h-4" strokeWidth={2} />
                        Edit Profile
                      </Button>
                      <Button size="sm" variant="secondary">
                        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-5 pb-3 text-sm text-muted-foreground flex-wrap justify-center sm:justify-start">
                <button
                  className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                  onClick={() => setActiveTab("posts")}
                >
                  <span className="font-semibold text-foreground">{profile?.postsCount ?? 0}</span> posts
                </button>
                <button
                  className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                  onClick={() => isOwnProfile ? navigate("/followers") : setActiveTab("about")}
                >
                  <span className="font-semibold text-foreground">{followersCount}</span> followers
                </button>
                <button
                  className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                  onClick={() => isOwnProfile ? navigate("/followers") : setActiveTab("about")}
                >
                  <span className="font-semibold text-foreground">{profile?.followingCount ?? 0}</span> following
                </button>
                <button
                  className="hover:text-foreground transition-colors hover:underline underline-offset-2"
                  onClick={() => setActiveTab("projects")}
                >
                  <span className="font-semibold text-foreground">{projects.length}</span> projects
                </button>
                {profile?.xp != null && (
                  <span>
                    <span className="font-semibold text-foreground">{profile.xp.toLocaleString()}</span> XP
                  </span>
                )}
              </div>
            </>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {(["posts", "about", "projects"] as Tab[]).map((tab) => (
              <Button
                key={tab}
                variant="ghost"
                size="sm"
                className={`rounded-none border-b-2 rounded-t-md capitalize ${
                  activeTab === tab
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Intro Card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Intro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                ) : (
                  <>
                    {profile?.bio && (
                      <p className="text-sm text-muted-foreground text-center">{profile.bio}</p>
                    )}
                    {!isOtherUser && (
                      <Button variant="secondary" size="sm" className="w-full">
                        Edit Bio
                      </Button>
                    )}
                    <Separator />
                    <div className="space-y-3 text-sm">
                      {profile?.location && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <MapPin className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                          <span>
                            Lives in{" "}
                            <span className="text-foreground font-medium">{profile.location}</span>
                          </span>
                        </div>
                      )}
                      {profile?.website && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Link2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                          <a
                            href={profile.website}
                            className="text-primary hover:underline truncate"
                          >
                            {profile.website}
                          </a>
                        </div>
                      )}
                      {profile?.xp != null && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Star className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                          <span>
                            <span className="text-foreground font-medium">
                              {profile.xp.toLocaleString()}
                            </span>{" "}
                            XP
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                        <span>Member of lokalhost.club</span>
                      </div>
                    </div>
                    {!isOtherUser && (
                      <Button variant="secondary" size="sm" className="w-full">
                        Edit Details
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Projects sidebar card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    Projects
                  </CardTitle>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary text-xs"
                    onClick={() => setActiveTab("projects")}
                  >
                    See all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {projectsLoading ? (
                  [...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))
                ) : projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No projects yet</p>
                ) : (
                  projects.slice(0, 5).map((project: any) => (
                    <div key={project.id} className="flex items-start gap-3 group cursor-pointer">
                      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Code2 className="w-6 h-6 text-primary" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                          {project.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {project.tagline}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="w-3 h-3" strokeWidth={2} />
                            {project.starsCount}
                          </span>
                          {(project.tags ?? []).slice(0, 2).map((t: any) => (
                            <Badge
                              key={t.name}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === "posts" && (
              <>
                {!isOtherUser && <CreatePost />}
                {postsLoading ? (
                  [...Array(2)].map((_, i) => <PostSkeleton key={i} />)
                ) : posts.length === 0 ? (
                  <Card className="border">
                    <CardContent className="py-10 text-center">
                      <ImageIcon
                        className="w-10 h-10 mx-auto mb-3 text-muted-foreground"
                        strokeWidth={1.5}
                      />
                      <p className="text-sm text-muted-foreground">No posts yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post: any) => {
                      const adapted = adaptPost(post);
                      if (adapted.postType === "roast") {
                        return (
                          <RoastedProjectCard
                            key={post.id}
                            post={adapted as FeedPost}
                            onLike={handleLike}
                          />
                        );
                      }
                      return (
                        <PostCard
                          key={post.id}
                          post={adapted}
                          onLike={handleLike}
                          onDelete={() => refetchPosts()}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === "about" && (
              <Card className="border">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-semibold mb-3">Overview</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {profile?.bio ?? "No bio yet. Edit your profile to add one!"}
                        </p>
                      </div>
                      {profile?.location && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-3">Location</h3>
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" strokeWidth={2} />
                              <span className="text-sm font-medium">{profile.location}</span>
                            </div>
                          </div>
                        </>
                      )}
                      {profile?.website && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-semibold mb-3">Contact Info</h3>
                            <div className="flex items-start gap-3">
                              <Link2 className="w-5 h-5 text-muted-foreground mt-0.5" strokeWidth={2} />
                              <div>
                                <p className="text-sm font-medium">Website</p>
                                <a
                                  href={profile.website}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {profile.website}
                                </a>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Rank &amp; XP</h3>
                        <div className="flex items-center gap-3">
                          <Star className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                          <span className="text-sm">
                            <span className="font-medium">
                              {profile?.xp?.toLocaleString() ?? 0}
                            </span>{" "}
                            XP
                            {profile?.rank && (
                              <>
                                {" "}
                                ·{" "}
                                <span
                                  className="font-medium"
                                  style={{ color: profile.rank.color }}
                                >
                                  {profile.rank.name}
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "projects" && (
              <Card className="border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Projects</CardTitle>
                    <div className="text-sm text-muted-foreground">{projects.length} projects</div>
                  </div>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <div className="grid grid-cols-1 gap-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                          <Skeleton className="w-12 h-12 rounded-md flex-shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : projects.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No projects yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {projects.map((project: any) => (
                        <div
                          key={project.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Code2 className="w-6 h-6 text-primary" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold truncate">{project.name}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {project.tagline}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="w-3 h-3" strokeWidth={2} />
                                {project.starsCount}
                              </span>
                              {(project.tags ?? []).slice(0, 2).map((t: any) => (
                                <Badge
                                  key={t.name}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-4"
                                >
                                  {t.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

