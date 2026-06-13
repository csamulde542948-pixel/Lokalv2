import { useState, useRef, useEffect } from "react";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Lock,
  Eye,
  Palette,
  Shield,
  Camera,
  Loader2,
  Sun,
  Moon,
  Check,
  LogOut,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { uploadPublicFile } from "../../lib/signed-storage-upload";
import { BACKEND_URL } from "../../lib/env";
import { getSessionCsrfToken } from "../../lib/auth-session-cookie";
import { avatarSrc, DEFAULT_COVER } from "../../lib/defaults";
import { toast } from "sonner";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_ME_SETTINGS = gql`
  query GetMeSettings {
    me {
      id
      name
      displayName
      username
      bio
      avatarUrl
      coverUrl
      website
      location
      company
      jobTitle
      githubUsername
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation SettingsUpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      displayName
      username
      bio
      avatarUrl
      coverUrl
      website
      location
      company
      jobTitle
      githubUsername
    }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const toggle = (val: "light" | "dark") => {
    setTheme(val);
    localStorage.setItem("theme", val);
    document.documentElement.classList.toggle("dark", val === "dark");
  };

  return { theme, toggle };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();

  // ── Data ──
  const { data, loading: meLoading } = useQuery(GET_ME_SETTINGS, { fetchPolicy: "network-only" });
  const me = data?.me;

  // ── Profile form state ──
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Password form state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ── Notification prefs (stored in localStorage for now) ──
  const [notifPostInteractions, setNotifPostInteractions] = useState(() =>
    localStorage.getItem("notif_post_interactions") !== "false"
  );
  const [notifFollowers, setNotifFollowers] = useState(() =>
    localStorage.getItem("notif_followers") !== "false"
  );
  const [notifProjectUpdates, setNotifProjectUpdates] = useState(() =>
    localStorage.getItem("notif_project_updates") !== "false"
  );
  const [notifEmail, setNotifEmail] = useState(() =>
    localStorage.getItem("notif_email") === "true"
  );

  // ── Danger zone dialogs ──
  const [showSignOutAll, setShowSignOutAll] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // ── Mutation ──
  const [updateProfile] = useMutation(UPDATE_PROFILE);

  // ── Seed form when data loads ──
  useEffect(() => {
    if (me) {
      setDisplayName(me.displayName ?? me.name ?? "");
      setBio(me.bio ?? "");
      setWebsite(me.website ?? "");
      setLocation(me.location ?? "");
      setCompany(me.company ?? "");
      setJobTitle(me.jobTitle ?? "");
      setGithubUsername(me.githubUsername ?? "");
    }
  }, [me]);

  // ── Avatar pick ──
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image too large. Max 2 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── Cover pick ──
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max 5 MB.");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  // ── Save profile ──
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    const toastId = toast.loading("Saving profile…");
    try {
      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;

      // Upload avatar to Supabase Storage if a new one was picked
      if (avatarFile && user) {
        toast.loading("Uploading avatar…", { id: toastId });
        const ext = avatarFile.name.split(".").pop();
        const path = `avatars/${user.id}.${ext}`;
        const publicUrl = await uploadPublicFile({
          bucket: "avatars",
          path,
          file: avatarFile,
          upsert: true,
        });
        avatarUrl = `${publicUrl}?t=${Date.now()}`;
      }

      // Upload cover to Supabase Storage if a new one was picked
      if (coverFile && user) {
        toast.loading("Uploading cover photo…", { id: toastId });
        const ext = coverFile.name.split(".").pop();
        const path = `covers/${user.id}.${ext}`;
        const publicUrl = await uploadPublicFile({
          bucket: "covers",
          path,
          file: coverFile,
          upsert: true,
        });
        coverUrl = `${publicUrl}?t=${Date.now()}`;
      }

      toast.loading("Saving changes…", { id: toastId });
      await updateProfile({
        variables: {
          input: {
            name: displayName || undefined,
            bio: bio || undefined,
            website: website || undefined,
            location: location || undefined,
            company: company || undefined,
            jobTitle: jobTitle || undefined,
            githubUsername: githubUsername || undefined,
            ...(avatarUrl ? { avatarUrl } : {}),
            ...(coverUrl ? { coverUrl } : {}),
          },
        },
      });

      toast.success("Profile saved!", { id: toastId });
      setAvatarFile(null);
      setCoverFile(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save profile.", { id: toastId });
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Save password ──
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/auth/update-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getSessionCsrfToken() ?? "",
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Failed to update password.");
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── Save notification prefs ──
  const saveNotifPref = (key: string, val: boolean) => {
    localStorage.setItem(key, String(val));
    toast.success("Preference saved.");
  };

  // ── Sign out all sessions ──
  const handleSignOutAll = async () => {
    await signOut();
    navigate("/login");
  };

  // ── Delete account ──
  const handleDeleteAccount = async () => {
    // Only client-side sign out — actual deletion would need a backend admin API
    toast.error("Account deletion requires contacting support. You've been signed out.");
    await signOut();
    navigate("/login");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" strokeWidth={2} />
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
            <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
              <User className="w-3.5 h-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
              <Bell className="w-3.5 h-3.5" /> Notifs
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
              <Lock className="w-3.5 h-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
              <Palette className="w-3.5 h-3.5" /> Theme
            </TabsTrigger>
          </TabsList>

          {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
          <TabsContent value="profile">
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-5 h-5 text-muted-foreground" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {meLoading ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-20 h-20 rounded-full" />
                      <Skeleton className="h-9 w-32" />
                    </div>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
                  </div>
                ) : (
                  <>
                    {/* Cover Photo */}
                    <div className="space-y-2">
                      <Label>Cover Photo</Label>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border group">
                        <img
                          src={coverPreview ?? me?.coverUrl ?? DEFAULT_COVER}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => coverInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium"
                        >
                          <Camera className="w-4 h-4" />
                          Change Cover Photo
                        </button>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="hidden"
                          onChange={handleCoverChange}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                          <ImageIcon className="w-4 h-4 mr-2" />
                          {coverPreview ? "Change Cover" : "Upload Cover"}
                        </Button>
                        <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WebP · Max 5 MB</p>
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        <Avatar className="w-20 h-20 border-2 border-border">
                          <AvatarImage src={avatarPreview ?? avatarSrc(me?.avatarUrl)} />
                          <AvatarFallback>{(me?.displayName ?? me?.name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Camera className="w-5 h-5 text-white" />
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif,image/webp"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </div>
                      <div>
                        <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()}>
                          Change Avatar
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG, GIF or WebP · Max 2 MB</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Name + Username (username read-only) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="Your name"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={`@${me?.username ?? ""}`}
                          readOnly
                          className="h-9 opacity-60 cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">Contact support to change username.</p>
                      </div>
                    </div>

                    {/* Email (read-only — managed by Supabase Auth) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email ?? ""}
                        readOnly
                        className="h-9 opacity-60 cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">Email is managed by your auth provider.</p>
                    </div>

                    {/* Bio */}
                    <div className="space-y-1.5">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        placeholder="Tell people a bit about yourself…"
                        className="resize-none h-20"
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
                    </div>

                    <Separator />

                    {/* Extra profile fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="jobTitle">Job Title</Label>
                        <Input id="jobTitle" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Full-stack Developer" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="company">Company</Label>
                        <Input id="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lagos, Nigeria" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" className="h-9" />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="github">GitHub Username</Label>
                        <Input id="github" value={githubUsername} onChange={e => setGithubUsername(e.target.value)} placeholder="e.g. octocat" className="h-9" />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button onClick={handleSaveProfile} disabled={profileSaving} className="gap-2">
                        {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Changes
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── NOTIFICATIONS TAB ────────────────────────────────────────── */}
          <TabsContent value="notifications">
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {[
                  {
                    label: "Post Interactions",
                    desc: "Get notified when someone likes or comments on your posts",
                    value: notifPostInteractions,
                    onChange: (v: boolean) => { setNotifPostInteractions(v); saveNotifPref("notif_post_interactions", v); },
                  },
                  {
                    label: "New Followers",
                    desc: "Receive notifications when someone follows you",
                    value: notifFollowers,
                    onChange: (v: boolean) => { setNotifFollowers(v); saveNotifPref("notif_followers", v); },
                  },
                  {
                    label: "Project Updates",
                    desc: "Get updates about projects you're following",
                    value: notifProjectUpdates,
                    onChange: (v: boolean) => { setNotifProjectUpdates(v); saveNotifPref("notif_project_updates", v); },
                  },
                  {
                    label: "Email Notifications",
                    desc: "Receive email summaries of your notifications",
                    value: notifEmail,
                    onChange: (v: boolean) => { setNotifEmail(v); saveNotifPref("notif_email", v); },
                  },
                ].map((item, i, arr) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch
                        checked={item.value}
                        onCheckedChange={item.onChange}
                      />
                    </div>
                    {i < arr.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY TAB ─────────────────────────────────────────────── */}
          <TabsContent value="security" className="space-y-4">
            {/* Change Password */}
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="h-9"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={passwordSaving} variant="outline" className="gap-2">
                    {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sessions */}
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-5 h-5 text-muted-foreground" />
                  Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Sign out of all devices</p>
                    <p className="text-xs text-muted-foreground">
                      Revoke all active sessions and sign out everywhere
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowSignOutAll(true)}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out All
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border border-destructive/40">
              <CardHeader className="pb-3 border-b border-destructive/40">
                <CardTitle className="flex items-center gap-2 text-base text-destructive">
                  <Shield className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Delete Account</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
                    onClick={() => setShowDeleteAccount(true)}
                  >
                    <Shield className="w-4 h-4" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── APPEARANCE TAB ───────────────────────────────────────────── */}
          <TabsContent value="appearance">
            <Card className="border">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="w-5 h-5 text-muted-foreground" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <p className="font-medium text-sm mb-3">Theme</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Light */}
                    <button
                      onClick={() => toggleTheme("light")}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        theme === "light"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="w-full h-16 rounded-md bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#FF6600]" />
                      </div>
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Sun className="w-3.5 h-3.5" /> Light
                      </span>
                      {theme === "light" && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </button>
                    {/* Dark */}
                    <button
                      onClick={() => toggleTheme("dark")}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        theme === "dark"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                    >
                      <div className="w-full h-16 rounded-md bg-[#1E1E1E] border border-[#3E3E42] flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#FF6600]" />
                      </div>
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Moon className="w-3.5 h-3.5" /> Dark
                      </span>
                      {theme === "dark" && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Sign Out All Dialog ─────────────────────────────────────────── */}
      <Dialog open={showSignOutAll} onOpenChange={setShowSignOutAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out of all devices?</DialogTitle>
            <DialogDescription>
              This will invalidate all active sessions. You'll be signed out here too.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutAll(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSignOutAll}>Sign Out Everywhere</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Dialog ───────────────────────────────────────── */}
      <Dialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This action is irreversible. All your posts, projects, and data will be permanently deleted.
              Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="h-9"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
