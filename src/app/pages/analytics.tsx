import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  Star
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

const engagementData = [
  { date: "Mar 29", views: 234, likes: 45, comments: 12 },
  { date: "Mar 30", views: 312, likes: 67, comments: 18 },
  { date: "Mar 31", views: 289, likes: 54, comments: 15 },
  { date: "Apr 1", views: 445, likes: 89, comments: 24 },
  { date: "Apr 2", views: 378, likes: 72, comments: 19 },
  { date: "Apr 3", views: 523, likes: 98, comments: 31 },
  { date: "Apr 4", views: 612, likes: 124, comments: 38 },
];

const projectStats = [
  { id: "lokalshop", name: "LokalShop", stars: 847, forks: 123, views: 2341 },
  { id: "freelancerhub", name: "FreelancerHub", stars: 654, forks: 67, views: 1823 },
  { id: "taskflow", name: "TaskFlow", stars: 234, forks: 45, views: 892 },
  { id: "portfolio", name: "Portfolio", stars: 89, forks: 12, views: 456 },
];

const pointsData = [
  { week: "Week 1", points: 420 },
  { week: "Week 2", points: 580 },
  { week: "Week 3", points: 720 },
  { week: "Week 4", points: 890 },
];

export function Analytics() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-semibold">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Track your performance and community engagement
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-blue-600" strokeWidth={2} />
                <Badge variant="secondary" className="text-xs rounded-md font-normal">
                  <TrendingUp className="w-3 h-3 mr-1" strokeWidth={2} />
                  +12%
                </Badge>
              </div>
              <p className="text-2xl font-semibold mb-1">2,793</p>
              <p className="text-xs text-muted-foreground">Profile Views</p>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-5 h-5 text-red-600" strokeWidth={2} />
                <Badge variant="secondary" className="text-xs rounded-md font-normal">
                  <TrendingUp className="w-3 h-3 mr-1" strokeWidth={2} />
                  +8%
                </Badge>
              </div>
              <p className="text-2xl font-semibold mb-1">549</p>
              <p className="text-xs text-muted-foreground">Total Likes</p>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <MessageCircle className="w-5 h-5 text-green-600" strokeWidth={2} />
                <Badge variant="secondary" className="text-xs rounded-md font-normal">
                  <TrendingUp className="w-3 h-3 mr-1" strokeWidth={2} />
                  +15%
                </Badge>
              </div>
              <p className="text-2xl font-semibold mb-1">157</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </CardContent>
          </Card>

          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-purple-600" strokeWidth={2} />
                <Badge variant="secondary" className="text-xs rounded-md font-normal">
                  <TrendingUp className="w-3 h-3 mr-1" strokeWidth={2} />
                  +24%
                </Badge>
              </div>
              <p className="text-2xl font-semibold mb-1">342</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Engagement Over Time */}
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                Engagement Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={engagementData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6600" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF6600" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#FF6600" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Points Progress */}
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                Points Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <RechartsBarChart data={pointsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 12 }} 
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="points" fill="#FF6600" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Project Performance */}
        <Card className="border">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
              Project Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={projectStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }} 
                  stroke="#6b7280"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="stars" fill="#FF6600" radius={[0, 4, 4, 0]} />
                <Bar dataKey="forks" fill="#6366f1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="views" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#FF6600]" />
                <span className="text-xs text-muted-foreground">Stars</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#6366f1]" />
                <span className="text-xs text-muted-foreground">Forks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#22c55e]" />
                <span className="text-xs text-muted-foreground">Views</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}