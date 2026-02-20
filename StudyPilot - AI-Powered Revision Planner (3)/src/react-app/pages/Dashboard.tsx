import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Loader2,
  LogOut,
  Upload,
  Sparkles,
  ArrowRight,
  Calendar,
  Target,
  TrendingUp,
  ChevronRight,
  Trophy,
  BarChart3,
  Shield,
  BookOpen,
  BrainCircuit,
  CalendarDays,
} from "lucide-react";

interface SubjectMark {
  subject: string;
  marks: number;
  maxMarks: number;
}

export default function DashboardPage() {
  const { user, isPending, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [marks, setMarks] = useState<SubjectMark[]>([]);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Check for guest session
  useEffect(() => {
    const storedGuestId = localStorage.getItem("studypilot_guest_id");
    if (storedGuestId) {
      setGuestId(storedGuestId);
    }
  }, []);

  useEffect(() => {
    if (!user && !isPending && !guestId) {
      // Check again for guest ID before redirecting
      const storedGuestId = localStorage.getItem("studypilot_guest_id");
      if (!storedGuestId) {
        navigate("/login");
      } else {
        setGuestId(storedGuestId);
      }
    }
  }, [user, isPending, guestId, navigate]);

  useEffect(() => {
    if (user || guestId) {
      fetchProfile();
    }
  }, [user, guestId]);

  const fetchProfile = async () => {
    try {
      const currentGuestId = guestId || localStorage.getItem("studypilot_guest_id");
      const url = currentGuestId ? `/api/user/profile?guest_id=${currentGuestId}` : "/api/user/profile";
      const response = await fetch(url);
      const data = await response.json();
      if (data.marks && data.marks.length > 0) {
        setHasProfile(true);
        setMarks(data.marks);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (guestId) {
      localStorage.removeItem("studypilot_guest_id");
      setGuestId(null);
    } else {
      await logout();
    }
    navigate("/");
  };

  const isGuest = !!guestId && !user;
  const displayName = user?.google_user_data?.given_name || user?.google_user_data?.name || (isGuest ? "Guest" : "Student");

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Study<span className="gradient-text">Pilot</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user?.google_user_data?.picture ? (
                  <img
                    src={user.google_user_data.picture}
                    alt={user.google_user_data.name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">G</span>
                  </div>
                )}
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {user?.google_user_data?.name || user?.email || "Guest User"}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Floating background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {hasProfile ? (
          <>
            {/* Header for existing users */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-muted-foreground">
                Ready to continue your study journey?
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
              <button
                onClick={() => navigate("/planner")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Study Planner</h3>
                <p className="text-xs text-muted-foreground">
                  Manage your AI study schedule
                </p>
              </button>

              <button
                onClick={() => navigate("/performance")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Performance</h3>
                <p className="text-xs text-muted-foreground">
                  Track exam scores over time
                </p>
              </button>

              <button
                onClick={() => navigate("/analytics")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Analytics</h3>
                <p className="text-xs text-muted-foreground">
                  View study insights & charts
                </p>
              </button>

              <button
                onClick={() => navigate("/onboarding")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-accent" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Update Marks</h3>
                <p className="text-xs text-muted-foreground">
                  Upload new marksheet
                </p>
              </button>

              <button
                onClick={() => navigate("/syllabus")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-violet-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Syllabus</h3>
                <p className="text-xs text-muted-foreground">
                  Track your topics
                </p>
              </button>

              <button
                onClick={() => navigate("/quiz")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5 text-amber-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Quiz</h3>
                <p className="text-xs text-muted-foreground">
                  Test your knowledge
                </p>
              </button>

              <button
                onClick={() => navigate("/exams")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-rose-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Exam Schedule</h3>
                <p className="text-xs text-muted-foreground">
                  Add exam dates
                </p>
              </button>

              <button
                onClick={() => navigate("/privacy")}
                className="bg-white rounded-2xl p-5 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Privacy</h3>
                <p className="text-xs text-muted-foreground">
                  Security & data settings
                </p>
              </button>
            </div>

            {/* Subject Performance Overview */}
            <div className="bg-white rounded-2xl p-6 border border-border mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Your Subject Performance
                </h3>
                <Button variant="outline" size="sm" onClick={() => navigate("/planner")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {marks.map((mark, idx) => {
                  const percentage = (mark.marks / mark.maxMarks) * 100;
                  return (
                    <div key={idx} className="p-4 rounded-xl bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{mark.subject}</span>
                        <span
                          className={`font-semibold ${
                            percentage >= 60
                              ? "text-green-600"
                              : percentage >= 40
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {mark.marks}/{mark.maxMarks}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            percentage >= 60
                              ? "bg-green-500"
                              : percentage >= 40
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Study Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on your marks, focus more on your weaker subjects during your peak study hours.
                    The AI planner automatically allocates more time to subjects where you need improvement.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome, {displayName}! 👋
              </h1>
              <p className="text-muted-foreground">
                Let's set up your personalized study plan
              </p>
            </div>

            {/* Upload Marksheet Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-primary/5 border border-border mb-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    Upload Your Marksheet
                  </h2>
                  <p className="text-muted-foreground">
                    Upload an image of your marksheet and our AI will automatically extract
                    your subjects and marks to create a personalized study plan.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => navigate("/onboarding")}
                className="w-full gradient-primary text-white h-12 text-base font-medium shadow-lg shadow-primary/25"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <InfoCard
                step={1}
                title="Upload Marksheet"
                description="Upload an image and we'll extract your marks automatically"
              />
              <InfoCard
                step={2}
                title="Take Quiz"
                description="Answer questions about your learning style preferences"
              />
              <InfoCard
                step={3}
                title="Get Your Plan"
                description="Receive an AI-generated study schedule tailored to you"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function InfoCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-border">
      <div className="w-8 h-8 rounded-full gradient-primary text-white font-bold flex items-center justify-center text-sm mb-3">
        {step}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
