import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import { Search, Send, MoreHorizontal, Video, Phone, Info, Archive, VolumeX, Trash2, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

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

interface ChatMessage {
  id: string;
  content: string;
  sender: "me" | "them";
  timestamp: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: {
      name: "Angela Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      username: "@angelat",
    },
    lastMessage: "Hey! I saw your profile and would love to collaborate on a project together.",
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
    lastMessage: "Thanks for the feedback on my portfolio!",
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
    lastMessage: "See you at the meetup this weekend!",
    timestamp: "1d",
    unread: false,
  },
  {
    id: "4",
    sender: {
      name: "Juan dela Cruz",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      username: "@juandc",
    },
    lastMessage: "Can you help me with this React issue?",
    timestamp: "2d",
    unread: false,
  },
  {
    id: "5",
    sender: {
      name: "Miguel Fernandez",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      username: "@miguelf",
    },
    lastMessage: "Your Rust tips were really helpful, thanks!",
    timestamp: "3d",
    unread: false,
  },
];

const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    content: "Hey! I saw your profile and would love to collaborate on a project together.",
    sender: "them",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    content: "That sounds great! What kind of project do you have in mind?",
    sender: "me",
    timestamp: "10:32 AM",
  },
  {
    id: "3",
    content: "I'm thinking of building a developer community platform. I noticed you have experience with React and Node.js.",
    sender: "them",
    timestamp: "10:35 AM",
  },
  {
    id: "4",
    content: "Yes! I'd love to help. When can we discuss this further?",
    sender: "me",
    timestamp: "10:36 AM",
  },
  {
    id: "5",
    content: "How about tomorrow at 3 PM? We can do a video call.",
    sender: "them",
    timestamp: "10:38 AM",
  },
  {
    id: "6",
    content: "Perfect! Looking forward to it 🚀",
    sender: "me",
    timestamp: "10:40 AM",
  },
];

export function Messages() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<Message | null>(mockMessages[0]);
  const [messageText, setMessageText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatMessages);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageText,
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages([...chatMessages, newMessage]);
    setMessageText("");
  };

  const filteredMessages = mockMessages.filter((message) =>
    message.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] border-t">
      {/* Sidebar - Conversations List */}
      <div className="w-80 border-r bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Messages</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Archive className="w-4 h-4 mr-2" />
                  Archived Messages
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="w-4 h-4 mr-2" />
                  Message Requests
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border rounded-full h-10"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`p-4 cursor-pointer transition-colors border-l-4 ${
                selectedChat?.id === message.id
                  ? "bg-muted border-l-primary"
                  : "border-l-transparent hover:bg-muted/50"
              }`}
              onClick={() => setSelectedChat(message)}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-border">
                    <AvatarImage src={message.sender.avatar} />
                    <AvatarFallback>{message.sender.name[0]}</AvatarFallback>
                  </Avatar>
                  {message.unread && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm truncate ${message.unread ? "font-bold" : "font-semibold"}`}>
                      {message.sender.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate flex-1 ${message.unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
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
      </div>

      {/* Main Chat Area */}
      {selectedChat ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-border">
                <AvatarImage src={selectedChat.sender.avatar} />
                <AvatarFallback>{selectedChat.sender.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-base">{selectedChat.sender.name}</h3>
                <p className="text-xs text-muted-foreground">Active now</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary">
                <Phone className="w-5 h-5" strokeWidth={2} />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary">
                <Video className="w-5 h-5" strokeWidth={2} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Info className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Search className="w-4 h-4 mr-2" />
                    Search in Conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <VolumeX className="w-4 h-4 mr-2" />
                    Mute Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Chat
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto bg-muted/20">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Date separator */}
              <div className="flex items-center justify-center">
                <span className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full border">
                  Today
                </span>
              </div>

              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-end gap-2 max-w-[70%]">
                    {message.sender === "them" && (
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarImage src={selectedChat.sender.avatar} />
                        <AvatarFallback>{selectedChat.sender.name[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.sender === "me"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border"
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed">{message.content}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 px-2">
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-card">
            <div className="max-w-4xl mx-auto flex items-end gap-3">
              <div className="flex-1 flex items-center gap-2 bg-muted rounded-3xl px-4 py-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border-0 bg-transparent h-9 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <Button
                size="icon"
                className="h-10 w-10 rounded-full flex-shrink-0"
                disabled={!messageText.trim()}
                onClick={handleSendMessage}
              >
                <Send className="w-5 h-5" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-12 h-12 text-primary" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
            <p className="text-muted-foreground">
              Select a conversation to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
