import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Users, Search, UserPlus, UserCheck } from "lucide-react";
import { useState } from "react";

const mockFriends = [
  {
    id: "1",
    name: "Angela Torres",
    username: "@angelat",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    mutualFriends: 12,
    status: "friends",
  },
  {
    id: "2",
    name: "Carlos Reyes",
    username: "@carlosr",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    mutualFriends: 8,
    status: "friends",
  },
  {
    id: "3",
    name: "Maria Santos",
    username: "@mariasantos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    mutualFriends: 15,
    status: "friends",
  },
  {
    id: "4",
    name: "Juan dela Cruz",
    username: "@juandc",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    mutualFriends: 6,
    status: "friends",
  },
  {
    id: "5",
    name: "Miguel Fernandez",
    username: "@miguelf",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    mutualFriends: 9,
    status: "friends",
  },
  {
    id: "6",
    name: "Sofia Reyes",
    username: "@sofiar",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
    mutualFriends: 11,
    status: "friends",
  },
];

const mockSuggestions = [
  {
    id: "7",
    name: "Diego Martinez",
    username: "@diegom",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    mutualFriends: 4,
    status: "suggested",
  },
  {
    id: "8",
    name: "Isabella Cruz",
    username: "@isabellac",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    mutualFriends: 7,
    status: "suggested",
  },
];

export function Friends() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-primary" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-semibold">Friends</h1>
              <p className="text-sm text-muted-foreground">
                Connect with fellow developers in the community
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <Input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border rounded-md h-10"
            />
          </div>
        </div>

        {/* Friend Suggestions */}
        <Card className="border mb-6">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span>Friend Suggestions</span>
              <Badge variant="secondary" className="text-xs rounded-md font-normal">
                {mockSuggestions.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mockSuggestions.map((person, index) => (
              <div key={person.id}>
                <div className="p-4 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-border flex-shrink-0">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback>{person.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{person.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {person.username} · {person.mutualFriends} mutual friends
                      </p>
                    </div>
                    <Button size="sm" className="gap-2 h-8">
                      <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
                      Add Friend
                    </Button>
                  </div>
                </div>
                {index < mockSuggestions.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Friends List */}
        <Card className="border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <span>All Friends</span>
              <Badge variant="secondary" className="text-xs rounded-md font-normal">
                {mockFriends.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
              {mockFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-4 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-border flex-shrink-0">
                      <AvatarImage src={friend.avatar} />
                      <AvatarFallback>{friend.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{friend.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {friend.mutualFriends} mutual friends
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
