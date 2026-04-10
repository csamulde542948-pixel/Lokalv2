import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserMinus,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { avatarSrc } from "../../lib/defaults";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_FOLLOWERS_DATA = gql`
  query GetFollowersPageData {
    myFollowers {
      id name username avatarUrl xp isFollowedByMe
      rank { name color }
    }
    myFollowing {
      id name username avatarUrl xp isFollowedByMe
      rank { name color }
    }
    suggestedUsers(limit: 10) {
      id name username avatarUrl xp isFollowedByMe
      rank { name color }
    }
  }
`;

const FOLLOW_USER = gql`
  mutation FollowUser($userId: ID!) {
    followUser(userId: $userId) {
      id isFollowedByMe followersCount
    }
  }
`;

const UNFOLLOW_USER = gql`
  mutation UnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) {
      id isFollowedByMe followersCount
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowProfile {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  xp: number;
  isFollowedByMe: boolean;
  rank: { name: string; color: string } | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserCardSkeleton() {
  return (
    <div className="p-4 flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Users className="w-10 h-10 text-muted-foreground/40" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface UserCardProps {
  profile: FollowProfile;
  onFollow: (id: string) => void;
  onUnfollow: (id: string) => void;
  onMessage: (id: string, name: string, avatar: string | null) => void;
  loadingId: string | null;
  isMe: boolean;
}

function UserCard({ profile, onFollow, onUnfollow, onMessage, loadingId, isMe }: UserCardProps) {
  const navigate = useNavigate();
  const loading = loadingId === profile.id;

  return (
    <div className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Avatar — click to view profile */}
        <button
          className="flex-shrink-0"
          onClick={() => navigate(`/profile/${profile.username ?? profile.id}`)}
        >
          <Avatar className="w-12 h-12 border-2 border-border">
            <AvatarImage src={avatarSrc(profile.avatarUrl)} />
            <AvatarFallback>{profile.name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>

        {/* Info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => navigate(`/profile/${profile.username ?? profile.id}`)}
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{profile.name}</h3>
            {profile.rank && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1.5 font-normal"
                style={{ color: profile.rank.color, borderColor: profile.rank.color + "40" }}
              >
                {profile.rank.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {profile.username ? `@${profile.username}` : profile.id.slice(0, 8)}
            {profile.xp > 0 && (
              <span className="ml-1.5 text-primary/70 font-medium">{profile.xp.toLocaleString()} XP</span>
            )}
          </p>
        </div>

        {/* Actions — only show if not viewing yourself */}
        {!isMe && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Message */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title={`Message ${profile.name}`}
              onClick={() => onMessage(profile.id, profile.name, profile.avatarUrl)}
            >
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} />
            </Button>

            {/* Follow / Unfollow */}
            {profile.isFollowedByMe ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={loading}
                onClick={() => onUnfollow(profile.id)}
              >
                <UserCheck className="w-3.5 h-3.5" strokeWidth={2} />
                Following
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={loading}
                onClick={() => onFollow(profile.id)}
              >
                <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
                Follow
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Followers() {
  const { user } = useAuth();
  const { startDM } = useChat();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"followers" | "following" | "suggested">("followers");

  const { data, loading, refetch } = useQuery<{
    myFollowers: FollowProfile[];
    myFollowing: FollowProfile[];
    suggestedUsers: FollowProfile[];
  }>(GET_FOLLOWERS_DATA, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const [followUser] = useMutation(FOLLOW_USER, {
    onCompleted: () => refetch(),
  });
  const [unfollowUser] = useMutation(UNFOLLOW_USER, {
    onCompleted: () => refetch(),
  });

  const handleFollow = async (userId: string) => {
    setLoadingId(userId);
    try {
      await followUser({ variables: { userId } });
    } finally {
      setLoadingId(null);
    }
  };

  const handleUnfollow = async (userId: string) => {
    setLoadingId(userId);
    try {
      await unfollowUser({ variables: { userId } });
    } finally {
      setLoadingId(null);
    }
  };

  const handleMessage = async (userId: string, name: string, avatar: string | null) => {
    const channel = await startDM(userId, name, avatar ?? undefined);
    if (channel) navigate("/messages");
  };

  const q = searchQuery.toLowerCase().trim();

  const followers = useMemo(() => {
    const list = data?.myFollowers ?? [];
    return q
      ? list.filter((p) => p.name.toLowerCase().includes(q) || (p.username ?? "").toLowerCase().includes(q))
      : list;
  }, [data?.myFollowers, q]);

  const following = useMemo(() => {
    const list = data?.myFollowing ?? [];
    return q
      ? list.filter((p) => p.name.toLowerCase().includes(q) || (p.username ?? "").toLowerCase().includes(q))
      : list;
  }, [data?.myFollowing, q]);

  const suggested = useMemo(() => {
    const list = data?.suggestedUsers ?? [];
    return q
      ? list.filter((p) => p.name.toLowerCase().includes(q) || (p.username ?? "").toLowerCase().includes(q))
      : list;
  }, [data?.suggestedUsers, q]);

  const EMPTY_MSGS: Record<string, string> = {
    followers: "No one is following you yet.",
    following: "You're not following anyone yet.",
    suggested: "No suggestions right now — check back later.",
  };

  const renderList = (list: FollowProfile[], tabKey: string) => {
    if (loading && !data) {
      return Array.from({ length: 4 }).map((_, i) => <UserCardSkeleton key={i} />);
    }
    if (list.length === 0) {
      return <EmptyState message={EMPTY_MSGS[tabKey] ?? "Nothing here yet."} />;
    }
    return list.map((p, i) => (
      <div key={p.id}>
        <UserCard
          profile={p}
          onFollow={handleFollow}
          onUnfollow={handleUnfollow}
          onMessage={handleMessage}
          loadingId={loadingId}
          isMe={p.id === user?.id}
        />
        {i < list.length - 1 && <Separator />}
      </div>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-primary" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-semibold">Followers</h1>
              <p className="text-sm text-muted-foreground">
                Manage who you follow and who follows you
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <Input
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full mb-4 grid grid-cols-3">
            <TabsTrigger value="followers" className="gap-2">
              <UserCheck className="w-4 h-4" strokeWidth={2} />
              Followers
              {!loading && data && (
                <Badge variant="secondary" className="text-xs h-4 px-1.5 font-normal ml-0.5">
                  {data.myFollowers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <UserPlus className="w-4 h-4" strokeWidth={2} />
              Following
              {!loading && data && (
                <Badge variant="secondary" className="text-xs h-4 px-1.5 font-normal ml-0.5">
                  {data.myFollowing.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggested" className="gap-2">
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              Suggested
            </TabsTrigger>
          </TabsList>

          <Card className="border">
            <TabsContent value="followers" className="mt-0">
              <CardHeader className="pb-3 border-b py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserMinus className="w-4 h-4" strokeWidth={2} />
                  People following you
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderList(followers, "followers")}
              </CardContent>
            </TabsContent>

            <TabsContent value="following" className="mt-0">
              <CardHeader className="pb-3 border-b py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4" strokeWidth={2} />
                  People you follow
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderList(following, "following")}
              </CardContent>
            </TabsContent>

            <TabsContent value="suggested" className="mt-0">
              <CardHeader className="pb-3 border-b py-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" strokeWidth={2} />
                  Developers you might know
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {renderList(suggested, "suggested")}
              </CardContent>
            </TabsContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}
