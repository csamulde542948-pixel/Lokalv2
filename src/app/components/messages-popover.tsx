import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Search, Send, MoreHorizontal, Video, Phone, X, ExternalLink, Archive, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNavigate } from "react-router";

interface Message {
  id: string;
  sender: {
    name: string;
    avatar: string;
    username: string;
  };
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: {
      name: "Angela Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      username: "@angelat",
    },
    lastMessage: "Hey! I saw your profile and would love to collaborate...",
    timestamp: "10m",
    unread: true,
  },
  {
    id: "2",
    sender: {
      name: "Carlos Reyes",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      username: "@carlosr",
    },
    lastMessage: "Thanks for the feedback!",
    timestamp: "2h",
    unread: true,
  },
  {
    id: "3",
    sender: {
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      username: "@mariasantos",
    },
    lastMessage: "See you at the meetup!",
    timestamp: "1d",
    unread: false,
  },
];

interface MessagesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessagesPopover({ isOpen, onClose }: MessagesPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [messageText, setMessageText] = useState("");
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />

      {/* Messages Panel */}
      <div className="fixed bottom-0 right-20 z-50 w-80 h-[32rem] bg-card border rounded-t-lg shadow-2xl flex flex-col">
        {selectedChat ? (
          // Chat View
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setSelectedChat(null)}
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </Button>
                <Avatar className="w-8 h-8 border-2 border-border">
                  <AvatarImage src={selectedChat.sender.avatar} />
                  <AvatarFallback>{selectedChat.sender.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{selectedChat.sender.name}</h3>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary">
                  <Phone className="w-4 h-4" strokeWidth={2} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary">
                  <Video className="w-4 h-4" strokeWidth={2} />
                </Button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                  <p className="text-sm">{selectedChat.lastMessage}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2 max-w-[70%]">
                  <p className="text-sm">That sounds great! Let's do it.</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2 max-w-[70%]">
                  <p className="text-sm">Perfect! I'll send you the details.</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border rounded-full h-9 px-4"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && messageText.trim()) {
                      setMessageText("");
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full flex-shrink-0"
                  disabled={!messageText.trim()}
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Conversations List
          <>
            {/* Header */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-base">Messages</h2>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          navigate("/messages");
                          onClose();
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive className="w-4 h-4 mr-2" />
                        Archived Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Message Requests
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border rounded-full h-8 text-sm"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {mockMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setSelectedChat(message)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-border">
                        <AvatarImage src={message.sender.avatar} />
                        <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                      </Avatar>
                      {message.unread && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`text-sm truncate ${message.unread ? "font-semibold" : "font-medium"}`}>
                          {message.sender.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs truncate flex-1 ${message.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {message.lastMessage}
                        </p>
                        {message.unread && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}