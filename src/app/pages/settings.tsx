import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  Settings as SettingsIcon, 
  User,
  Bell,
  Lock,
  Eye,
  Globe,
  Palette,
  Shield
} from "lucide-react";

export function Settings() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-semibold">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-4 border-border">
                  <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop" />
                  <AvatarFallback>YN</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Button variant="outline" size="sm">Change Avatar</Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG or GIF. Max size of 2MB.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    defaultValue="Your Name"
                    className="border rounded-md h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    defaultValue="@yourname"
                    className="border rounded-md h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue="you@example.com"
                  className="border rounded-md h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input
                  id="bio"
                  defaultValue="Full-stack developer passionate about building products"
                  className="border rounded-md h-9"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Post Interactions</p>
                  <p className="text-xs text-muted-foreground">
                    Get notified when someone likes or comments on your posts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">New Followers</p>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications when someone follows you
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Project Updates</p>
                  <p className="text-xs text-muted-foreground">
                    Get updates about projects you're following
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    Receive email summaries of your notifications
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Eye className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Profile Visibility</p>
                  <p className="text-xs text-muted-foreground">
                    Make your profile visible to everyone
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Show Activity Status</p>
                  <p className="text-xs text-muted-foreground">
                    Let others see when you're active
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Show Email</p>
                  <p className="text-xs text-muted-foreground">
                    Display your email on your public profile
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={2} />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Change Password</p>
                  <p className="text-xs text-muted-foreground">
                    Update your password to keep your account secure
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enable
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">
                    Manage devices where you're logged in
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border border-red-200">
            <CardHeader className="pb-3 border-b border-red-200">
              <CardTitle className="flex items-center gap-2 text-base text-red-600">
                <Shield className="w-5 h-5" strokeWidth={2} />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Deactivate Account</p>
                  <p className="text-xs text-muted-foreground">
                    Temporarily disable your account
                  </p>
                </div>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                  Deactivate
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">Delete Account</p>
                  <p className="text-xs text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
