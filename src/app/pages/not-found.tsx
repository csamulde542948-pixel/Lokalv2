import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Home, ArrowLeft, Search, AlertTriangle } from "lucide-react";

export function NotFound() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex-1 border-x">
        <div className="max-w-[680px] mx-auto px-4 py-16 space-y-8">
          {/* 404 Icon and Message */}
          <div className="flex flex-col items-center justify-center space-y-6 text-center">
            {/* Warning Icon */}
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-primary" strokeWidth={2} />
            </div>

            {/* 404 Display */}
            <div className="text-[120px] font-bold text-primary/20 leading-none -my-4">
              404
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Page Not Found</h1>
              <p className="text-muted-foreground max-w-md">
                Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">
                  <Home className="w-4 h-4" strokeWidth={2} />
                  Go to Home
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2" onClick={handleGoBack}>
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                Go Back
              </Button>
            </div>
          </div>

          {/* Helpful Links Card */}
          <Card className="border">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Search className="w-5 h-5 text-primary mt-0.5" strokeWidth={2} />
                <div>
                  <h2 className="font-semibold mb-1">Looking for something?</h2>
                  <p className="text-sm text-muted-foreground">
                    Here are some helpful links to get you back on track:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link 
                  to="/projects" 
                  className="p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">Projects</div>
                  <div className="text-xs text-muted-foreground">Browse all projects</div>
                </Link>
                <Link 
                  to="/leaderboard" 
                  className="p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">Leaderboard</div>
                  <div className="text-xs text-muted-foreground">Top developers & projects</div>
                </Link>
                <Link 
                  to="/launchpad" 
                  className="p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">Launchpad</div>
                  <div className="text-xs text-muted-foreground">Launch your project</div>
                </Link>
                <Link 
                  to="/events" 
                  className="p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">Events</div>
                  <div className="text-xs text-muted-foreground">Community events</div>
                </Link>
                <Link 
                  to="/jobs" 
                  className="p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">Jobs</div>
                  <div className="text-xs text-muted-foreground">Find opportunities</div>
                </Link>
                <Link 
                  to="/profile" 
                  className="p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="font-medium text-sm">Profile</div>
                  <div className="text-xs text-muted-foreground">Your profile page</div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Support Message */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Still having trouble? Contact us at{" "}
              <a 
                href="mailto:support@lokalhost.club" 
                className="text-primary hover:underline"
              >
                support@lokalhost.club
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}