import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import { GraduationCap, Loader2, Shield, Sparkles, User } from "lucide-react";

export default function LoginPage() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = location.pathname === "/signup";
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  useEffect(() => {
    // Check for existing guest session
    const guestId = localStorage.getItem("studypilot_guest_id");
    if (guestId && !user && !isPending) {
      navigate("/dashboard");
      return;
    }
    if (user && !isPending) {
      // Clear guest session if user logs in with Google
      localStorage.removeItem("studypilot_guest_id");
      navigate("/dashboard");
    }
  }, [user, isPending, navigate]);

  const continueAsGuest = () => {
    setIsGuestLoading(true);
    // Generate a unique guest ID
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("studypilot_guest_id", guestId);
    setTimeout(() => {
      navigate("/onboarding");
    }, 500);
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Floating background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Study<span className="gradient-text">Pilot</span>
            </span>
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              Your AI-powered
              <br />
              <span className="gradient-text">study companion</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Upload your marksheet, tell us about your learning style, and get
              a personalized study plan that adapts to your progress.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>Privacy First</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>AI Powered</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2025 StudyPilot. All rights reserved.
          </p>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <Link to="/" className="flex lg:hidden items-center gap-2 mb-8 justify-center">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Study<span className="gradient-text">Pilot</span>
              </span>
            </Link>

            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 border border-border">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {isSignup ? "Create your account" : "Welcome back"}
                </h2>
                <p className="text-muted-foreground">
                  {isSignup
                    ? "Start your personalized learning journey"
                    : "Continue your learning journey"}
                </p>
              </div>

              <Button
                onClick={redirectToLogin}
                className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-foreground border-2 border-border shadow-sm"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                onClick={continueAsGuest}
                disabled={isGuestLoading}
                variant="outline"
                className="w-full h-12 text-base font-medium"
              >
                {isGuestLoading ? (
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <User className="w-5 h-5 mr-3" />
                )}
                Continue as Guest
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-3">
                Guest data is stored locally on this device
              </p>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {isSignup ? (
                  <>
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary font-medium hover:underline">
                      Log in
                    </Link>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-primary font-medium hover:underline">
                      Sign up
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  By continuing, you agree to our{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
