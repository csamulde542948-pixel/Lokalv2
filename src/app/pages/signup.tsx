import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Github, Eye, EyeOff, Wallet } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";
import { useAuth } from "../../contexts/AuthContext";
import { PasswordStrength } from "../components/password-strength";
import {
  validatePassword,
  isValidEmail,
  isValidUsername,
} from "../../lib/auth-security";

export function Signup() {
  const { signUpWithEmail, signInWithGoogle, signInWithGithub, signInWithWeb3 } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  // Save redirect target for OAuth flows (they break the state chain via /auth/callback)
  const saveOAuthRedirect = () => {
    if (fromPath) sessionStorage.setItem("lokal:auth_redirect", fromPath);
  };
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [web3Loading, setWeb3Loading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Client-side validation ──
    if (!isValidEmail(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!isValidUsername(formData.username)) {
      toast.error("Username must be 3–30 characters, letters, numbers, and underscores only.");
      return;
    }

    if (formData.fullName.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }

    const pwValidation = validatePassword(formData.password);
    if (!pwValidation.isValid) {
      toast.error(`Password requirements: ${pwValidation.errors.join(", ")}`);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    if (!agreeToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(formData.email, formData.password, {
      full_name: formData.fullName.trim(),
      username: formData.username.trim().toLowerCase(),
    });
    setLoading(false);
    if (error) {
      // Handle common Supabase errors with friendly messages
      if (error.message.includes("already registered")) {
        toast.error("An account with this email already exists. Try logging in instead.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(
      "Account created! Check your email to confirm your address before logging in."
    );
    navigate("/login", { state: fromPath ? { from: { pathname: fromPath } } : undefined });
  };

  const handleGoogleSignup = async () => {
    saveOAuthRedirect();
    const { error } = await signInWithGoogle();
    if (error) toast.error(error.message);
  };

  const handleGithubSignup = async () => {
    saveOAuthRedirect();
    const { error } = await signInWithGithub();
    if (error) toast.error(error.message);
  };

  const handleWeb3Signup = async () => {
    saveOAuthRedirect();
    setWeb3Loading(true);
    const { error } = await signInWithWeb3();
    setWeb3Loading(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden md:block space-y-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
          </div>
          <p className="text-base font-semibold tracking-widest uppercase mt-1">
            <span className="text-primary">Connect.</span>
            {" "}<span className="text-foreground">Build.</span>
            {" "}<span style={{ color: "#ff6600" }}>Ship.</span>
          </p>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Join the fastest-growing community of indie developers in the Philippines. 
              Start building, collaborating, and shipping amazing projects today.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <p className="text-sm text-muted-foreground">100% free to join</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <p className="text-sm text-muted-foreground">Showcase unlimited projects</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <p className="text-sm text-muted-foreground">Get feedback from the community</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <p className="text-sm text-muted-foreground">Access exclusive events</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <Card className="border shadow-xl">
          <CardHeader className="space-y-1">
            <div className="md:hidden flex items-center justify-center gap-2 mb-4">
              <BrandLogo />
            </div>
            <CardTitle className="text-2xl">Create an account</CardTitle>
            <CardDescription>
              Join the community and start building
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Social Signup Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handleGoogleSignup}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handleGithubSignup}
              >
                <Github className="w-5 h-5" strokeWidth={2} />
                Continue with GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handleWeb3Signup}
                disabled={web3Loading}
              >
                <Wallet className="w-5 h-5" strokeWidth={2} />
                {web3Loading ? "Connecting wallet…" : "Continue with Web3 Wallet"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign up with email
                </span>
              </div>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Juan dela Cruz"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="juandc"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  required
                  maxLength={30}
                  className="h-11"
                />
                {formData.username && !isValidUsername(formData.username) && (
                  <p className="text-xs text-destructive">3–30 characters, letters, numbers, and underscores only.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={2} />
                    )}
                  </Button>
                </div>
                <PasswordStrength password={formData.password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-11 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-11 w-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Eye className="w-4 h-4" strokeWidth={2} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Separator />
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}