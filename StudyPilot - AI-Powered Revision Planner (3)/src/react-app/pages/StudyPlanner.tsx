import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  Target,
  Brain,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Zap,
  RefreshCw,
  CalendarClock,
  X,
  Trash2,
  RotateCcw,
} from "lucide-react";

interface StudySession {
  id: number;
  plan_date: string;
  subject: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  priority: string;
  is_completed: number;
  notes: string;
}

interface SubjectAllocation {
  subject: string;
  percentage: number;
  weaknessScore: number;
  minutesPerDay: number;
  priority: string;
  marks: number;
  maxMarks: number;
}

interface StudyPlan {
  plan: {
    date: string;
    sessions: {
      subject: string;
      startTime: string;
      endTime: string;
      duration: number;
      priority: string;
      focusTip: string;
    }[];
  }[];
  summary: {
    totalHours: number;
    focusAreas: string[];
    recommendation: string;
  };
}

export default function StudyPlannerPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [missedSessions, setMissedSessions] = useState<StudySession[]>([]);
  const [allocations, setAllocations] = useState<SubjectAllocation[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [daysToGenerate, setDaysToGenerate] = useState(7);
  const [hoursPerDay, setHoursPerDay] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [showMissedPanel, setShowMissedPanel] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<StudySession | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchExistingPlan();
      fetchMissedSessions();
    }
  }, [user]);

  const fetchExistingPlan = async () => {
    try {
      const response = await fetch(`/api/study-plan?date=${selectedDate}`);
      const data = await response.json();
      if (data.plans && data.plans.length > 0) {
        setSessions(data.plans);
      }
    } catch (err) {
      console.error("Error fetching plan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMissedSessions = async () => {
    try {
      const response = await fetch("/api/study-plan/missed");
      const data = await response.json();
      setMissedSessions(data.sessions || []);
    } catch (err) {
      console.error("Error fetching missed sessions:", err);
    }
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/study-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: selectedDate,
          days: daysToGenerate,
          hoursPerDay,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate plan");
      }

      setStudyPlan(data.plan);
      setAllocations(data.subjectAllocations || []);
      await fetchExistingPlan();
    } catch (err) {
      console.error("Error generating plan:", err);
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSessionComplete = async (sessionId: number, completed: boolean) => {
    try {
      await fetch(`/api/study-plan/${sessionId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, is_completed: completed ? 1 : 0 } : s
        )
      );
    } catch (err) {
      console.error("Error updating session:", err);
    }
  };

  const navigateDate = (direction: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + direction);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const handleReschedule = async (sessionId: number, newDate: string) => {
    setIsRescheduling(true);
    try {
      const session = missedSessions.find((s) => s.id === sessionId);
      await fetch(`/api/study-plan/${sessionId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newDate,
          newStartTime: session?.start_time,
          newEndTime: session?.end_time,
        }),
      });
      await fetchExistingPlan();
      await fetchMissedSessions();
      setRescheduleSession(null);
    } catch (err) {
      console.error("Error rescheduling:", err);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleRescheduleAll = async () => {
    setIsRescheduling(true);
    try {
      await fetch("/api/study-plan/reschedule-missed", { method: "POST" });
      await fetchExistingPlan();
      await fetchMissedSessions();
      setShowMissedPanel(false);
    } catch (err) {
      console.error("Error rescheduling all:", err);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await fetch(`/api/study-plan/${sessionId}`, { method: "DELETE" });
      setMissedSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc: Record<string, StudySession[]>, session) => {
    if (!acc[session.plan_date]) {
      acc[session.plan_date] = [];
    }
    acc[session.plan_date].push(session);
    return acc;
  }, {});

  const todaySessions = sessionsByDate[selectedDate] || [];
  const completedToday = todaySessions.filter((s) => s.is_completed).length;
  const totalToday = todaySessions.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
    
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Floating background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Study<span className="gradient-text">Pilot</span>
              </span>
            </div>

            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">AI Study Planner</h1>
            <p className="text-muted-foreground">
              Personalized schedule based on your performance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={daysToGenerate}
              onChange={(e) => setDaysToGenerate(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <select
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
            >
              <option value={2}>2 hrs/day</option>
              <option value={3}>3 hrs/day</option>
              <option value={4}>4 hrs/day</option>
              <option value={6}>6 hrs/day</option>
              <option value={8}>8 hrs/day</option>
            </select>
            <Button
              onClick={generatePlan}
              disabled={isGenerating}
              className="gradient-primary text-white shadow-lg shadow-primary/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : sessions.length > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-destructive/10 rounded-xl text-destructive">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Missed Sessions Alert */}
        {missedSessions.length > 0 && (
          <div className="flex items-center justify-between p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  {missedSessions.length} missed session{missedSessions.length > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-amber-600">
                  Reschedule to stay on track with your study plan
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMissedPanel(true)}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                View All
              </Button>
              <Button
                size="sm"
                onClick={handleRescheduleAll}
                disabled={isRescheduling}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isRescheduling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reschedule All
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Missed Sessions Panel */}
        {showMissedPanel && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowMissedPanel(false)}
            />
            <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right">
              <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Missed Sessions</h2>
                <button
                  onClick={() => setShowMissedPanel(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {missedSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-muted/50 rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground">{session.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.plan_date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          • {session.start_time} - {session.end_time}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          session.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : session.priority === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {session.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRescheduleSession(session);
                          setRescheduleDate(new Date().toISOString().split("T")[0]);
                        }}
                        className="flex-1"
                      >
                        <CalendarClock className="w-4 h-4 mr-1" />
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {missedSessions.length > 1 && (
                  <Button
                    onClick={handleRescheduleAll}
                    disabled={isRescheduling}
                    className="w-full gradient-primary text-white mt-4"
                  >
                    {isRescheduling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Reschedule All to Upcoming Days
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {rescheduleSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setRescheduleSession(null)}
            />
            <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Reschedule Session
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {rescheduleSession.subject} ({rescheduleSession.duration_minutes} min)
              </p>

              <label className="block text-sm font-medium text-foreground mb-2">
                New Date
              </label>
              <input
                type="date"
                value={rescheduleDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white mb-4"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRescheduleSession(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReschedule(rescheduleSession.id, rescheduleDate)}
                  disabled={isRescheduling || !rescheduleDate}
                  className="flex-1 gradient-primary text-white"
                >
                  {isRescheduling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Reschedule"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Subject Allocations */}
        {allocations.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-border mb-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Time Allocation (Based on Your Marks)
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocations.map((alloc) => (
                <div
                  key={alloc.subject}
                  className="p-4 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{alloc.subject}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        alloc.priority === "high"
                          ? "bg-red-100 text-red-700"
                          : alloc.priority === "medium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {alloc.priority} priority
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Score: {alloc.marks}/{alloc.maxMarks} ({alloc.percentage.toFixed(0)}%)
                    </span>
                    <span className="font-medium text-primary">
                      ~{alloc.minutesPerDay} min/day
                    </span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        alloc.percentage < 40
                          ? "bg-red-500"
                          : alloc.percentage < 60
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${alloc.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Summary */}
        {studyPlan?.summary && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 border border-primary/20 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">AI Recommendation</h3>
                <p className="text-muted-foreground">{studyPlan.summary.recommendation}</p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1 text-primary">
                    <Clock className="w-4 h-4" />
                    {studyPlan.summary.totalHours} total hours
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <Target className="w-4 h-4" />
                    Focus: {studyPlan.summary.focusAreas?.join(", ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {sessions.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Daily Schedule */}
            <div className="lg:col-span-2">
              {/* Date Navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">{formatDate(selectedDate)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress */}
              {totalToday > 0 && (
                <div className="bg-white rounded-xl p-4 border border-border mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Today's Progress</span>
                    <span className="font-medium text-foreground">
                      {completedToday}/{totalToday} sessions
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary transition-all duration-500"
                      style={{ width: `${(completedToday / totalToday) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sessions */}
              <div className="space-y-3">
                {todaySessions.length > 0 ? (
                  todaySessions.map((session) => (
                    <div
                      key={session.id}
                      className={`bg-white rounded-xl p-4 border transition-all ${
                        session.is_completed
                          ? "border-green-200 bg-green-50/50"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleSessionComplete(session.id, !session.is_completed)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                            session.is_completed
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {session.is_completed && <Check className="w-4 h-4" />}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`font-semibold ${
                                session.is_completed
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {session.subject}
                            </h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${
                                session.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : session.priority === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {session.priority}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {session.start_time} - {session.end_time}
                            </span>
                            <span>{session.duration_minutes} min</span>
                          </div>

                          {session.notes && (
                            <div className="flex items-start gap-2 p-2 bg-primary/5 rounded-lg text-sm">
                              <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">{session.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-border">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No sessions scheduled for this day</p>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Overview */}
            <div className="bg-white rounded-2xl p-6 border border-border h-fit">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Weekly Overview
              </h3>
              <div className="space-y-3">
                {Object.entries(sessionsByDate)
                  .slice(0, 7)
                  .map(([date, daySessions]) => {
                    const completed = daySessions.filter((s) => s.is_completed).length;
                    const total = daySessions.length;
                    const isToday = date === new Date().toISOString().split("T")[0];

                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          selectedDate === date
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                            {formatDate(date)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {completed}/{total}
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }}
                          />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-3xl border border-border">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Study Plan Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Generate a personalized study plan based on your marks. The AI will allocate more time
              to subjects where you need improvement.
            </p>
            <Button
              onClick={generatePlan}
              disabled={isGenerating}
              size="lg"
              className="gradient-primary text-white shadow-lg shadow-primary/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My Study Plan
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
