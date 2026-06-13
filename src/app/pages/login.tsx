import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Github, ShieldAlert, Wallet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { BrandLogo } from "../components/brand-logo";
import { TurnstileCaptcha } from "../components/turnstile-captcha";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { isValidEmail, preLoginCheck, recordLoginAttempt } from "../../lib/auth-security";

export function Login() {
  const { signInWithEmail, signInWithGoogle, signInWithGithub, signInWithWeb3 } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const fromLocation = (location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null)?.from;
  const fromPath = `${fromLocation?.pathname ?? "/"}${fromLocation?.search ?? ""}${fromLocation?.hash ?? ""}`;

  const saveOAuthRedirect = () => {
    if (fromPath && fromPath !== "/") {
      sessionStorage.setItem("lokal:auth_redirect", fromPath);
    }
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [web3Loading, setWeb3Loading] = useState(false);
  const [providerHint, setProviderHint] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const hasCaptchaToken = !!captchaToken;

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      toast.error(decodeURIComponent(err));
    }
  }, [searchParams]);

  useEffect(() => {
    setProviderHint(null);
    setIsLocked(false);
  }, [email]);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaResetSignal((current) => current + 1);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email above first, then click Forgot password.");
      return;
    }

    if (!captchaToken) {
      toast.error("Please complete the security check first.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
      captchaToken,
    });

    resetCaptcha();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Password reset email sent! Check your inbox.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    const check = await preLoginCheck(email);

    if (check.isLocked) {
      setIsLocked(true);
      setLockoutMinutes(check.lockoutMinutesRemaining);
      toast.error(
        `Account is temporarily locked. Try again in ${check.lockoutMinutesRemaining} minute(s).`
      );
      setLoading(false);
      return;
    }

    if (check.providerHint) {
      setProviderHint(check.providerHint);
      toast.error(check.providerHint);
      setLoading(false);
      return;
    }

    if (!captchaToken) {
      toast.error("Please complete the security check first.");
      setLoading(false);
      return;
    }

    const { error } = await signInWithEmail(email, password, captchaToken);

    resetCaptcha();
    setLoading(false);

    if (error) {
      toast.error("Invalid email or password.");
      return;
    }

    recordLoginAttempt(email, true, "email").catch(() => {});

    navigate(fromPath);
  };

  const handleGoogleLogin = async () => {
    if (!captchaToken) {
      toast.error("Please complete the security check first.");
      return;
    }
    saveOAuthRedirect();
    const { error } = await signInWithGoogle(captchaToken);
    if (error) {
      resetCaptcha();
    }
    if (error) {
      toast.error(error.message);
    }
  };

  const handleGithubLogin = async () => {
    if (!captchaToken) {
      toast.error("Please complete the security check first.");
      return;
    }
    saveOAuthRedirect();
    const { error } = await signInWithGithub(captchaToken);
    if (error) {
      resetCaptcha();
    }
    if (error) {
      toast.error(error.message);
    }
  };

  const handleWeb3Login = async () => {
    if (!captchaToken) {
      toast.error("Please complete the security check first.");
      return;
    }
    saveOAuthRedirect();
    setWeb3Loading(true);
    const { error } = await signInWithWeb3(captchaToken);
    setWeb3Loading(false);
    resetCaptcha();
    if (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/30 to-primary/5">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        <div className="hidden md:block space-y-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
          </div>
          <p className="text-base font-semibold tracking-widest uppercase mt-1">
            <span className="text-primary">Connect.</span>
            {" "}
            <span className="text-foreground">Build.</span>
            {" "}
            <span style={{ color: "#ff6600" }}>Ship.</span>
          </p>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Join the community of indie developers in the Philippines. Share your projects,
              collaborate with fellow builders, and grow together.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">Showcase your projects</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">Connect with developers</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">Join events and hackathons</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-sm text-muted-foreground">Climb the leaderboard</p>
              </div>
            </div>
          </div>
        </div>

        <Card className="border shadow-xl">
          <CardHeader className="space-y-1">
            <div className="md:hidden flex items-center justify-center gap-2 mb-4">
              <BrandLogo />
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Log in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLocked ? (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Account temporarily locked</p>
                  <p className="text-xs mt-0.5">
                    Too many failed login attempts. Try again in {lockoutMinutes} minute(s),
                    or use an OAuth provider below.
                  </p>
                </div>
              </div>
            ) : null}

            {providerHint && !isLocked ? (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{providerHint}</p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handleGoogleLogin}
                disabled={!hasCaptchaToken}
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
                onClick={handleGithubLogin}
                disabled={!hasCaptchaToken}
              >
                <Github className="w-5 h-5" strokeWidth={2} />
                Continue with GitHub
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handleWeb3Login}
                disabled={web3Loading || !hasCaptchaToken}
              >
                <Wallet className="w-5 h-5" strokeWidth={2} />
                {web3Loading ? "Connecting wallet..." : "Continue with Web3 Wallet"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="........"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <TurnstileCaptcha
                onVerify={setCaptchaToken}
                resetSignal={captchaResetSignal}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {hasCaptchaToken ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Security check complete. You can continue.</span>
                  </>
                ) : (
                  <span>Complete the security check to enable sign in.</span>
                )}
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading || isLocked || !hasCaptchaToken}>
                {loading ? "Logging in..." : isLocked ? "Account locked" : "Log in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Separator />
            <p className="max-w-sm text-center text-xs leading-5 text-muted-foreground">
              By continuing, you agree to lokalhost.club's{" "}
              <Link to="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
