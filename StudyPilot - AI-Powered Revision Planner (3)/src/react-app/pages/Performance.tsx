import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Calendar,
  Trophy,
  Target,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
  Award,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SubjectMark {
  subject: string;
  marks: number;
  maxMarks: number;
}

interface ExamHistory {
  examName: string;
  date: string;
  marks: number;
  maxMarks: number;
  percentage: number;
}

interface SubjectTrend {
  subject: string;
  history: ExamHistory[];
  initialMarks: number;
  initialMaxMarks: number;
  latestMarks: number;
  latestMaxMarks: number;
  improvement: number;
}

export default function PerformancePage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [trends, setTrends] = useState<SubjectTrend[]>([]);
  const [_subjects, setSubjects] = useState<SubjectMark[]>([]);
  const [showAddExam, setShowAddExam] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New exam form state
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [examResults, setExamResults] = useState<SubjectMark[]>([]);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [trendsRes, profileRes] = await Promise.all([
        fetch("/api/performance/trends"),
        fetch("/api/user/profile"),
      ]);

      const trendsData = await trendsRes.json();
      const profileData = await profileRes.json();

      setTrends(trendsData.trends || []);
      setSubjects(profileData.marks || []);

      // Initialize exam results with current subjects
      if (profileData.marks?.length) {
        setExamResults(
          profileData.marks.map((m: SubjectMark) => ({
            subject: m.subject,
            marks: m.marks,
            maxMarks: m.maxMarks,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitExam = async () => {
    if (!examName.trim() || !examDate) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/exam-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examName: examName.trim(),
          examDate,
          results: examResults,
        }),
      });

      if (response.ok) {
        setShowAddExam(false);
        setExamName("");
        await fetchData();
      }
    } catch (error) {
      console.error("Error submitting exam:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateExamResult = (subject: string, marks: number) => {
    setExamResults((prev) =>
      prev.map((r) => (r.subject === subject ? { ...r, marks: Math.max(0, Math.min(marks, r.maxMarks)) } : r))
    );
  };

  const getImprovementIcon = (improvement: number) => {
    if (improvement > 0) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (improvement < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getImprovementColor = (improvement: number) => {
    if (improvement > 0) return "text-emerald-600";
    if (improvement < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const totalImprovement = trends.reduce((sum, t) => sum + t.improvement, 0);
  const avgImprovement = trends.length > 0 ? Math.round(totalImprovement / trends.length) : 0;
  const mostImproved = trends.length > 0 ? [...trends].sort((a, b) => b.improvement - a.improvement)[0] : null;

  // Prepare chart data
  const chartData = trends.length > 0
    ? trends[0].history.map((_, index) => {
        const dataPoint: Record<string, any> = { exam: trends[0].history[index]?.examName || `Exam ${index + 1}` };
        trends.forEach((trend) => {
          if (trend.history[index]) {
            dataPoint[trend.subject] = trend.history[index].percentage;
          }
        });
        return dataPoint;
      })
    : [];

  const chartColors = [
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  ];

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-white/60 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Performance Tracking</h1>
              <p className="text-muted-foreground">Track your progress across exams</p>
            </div>
          </div>
          <Button onClick={() => setShowAddExam(true)} className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Log Exam Results
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-muted-foreground text-sm">Subjects Tracked</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{trends.length}</p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-muted-foreground text-sm">Average Improvement</span>
            </div>
            <p className={`text-3xl font-bold ${getImprovementColor(avgImprovement)}`}>
              {avgImprovement > 0 ? "+" : ""}
              {avgImprovement}%
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-muted-foreground text-sm">Most Improved</span>
            </div>
            <p className="text-xl font-bold text-foreground truncate">
              {mostImproved?.subject || "—"}
            </p>
            {mostImproved && (
              <p className={`text-sm ${getImprovementColor(mostImproved.improvement)}`}>
                {mostImproved.improvement > 0 ? "+" : ""}
                {mostImproved.improvement}%
              </p>
            )}
          </div>
        </div>

        {/* Progress Chart */}
        {chartData.length > 1 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Progress Over Time</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="exam" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend />
                  {trends.map((trend, index) => (
                    <Line
                      key={trend.subject}
                      type="monotone"
                      dataKey={trend.subject}
                      stroke={chartColors[index % chartColors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Subject Performance</h2>
          
          {trends.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No exam data yet</h3>
              <p className="text-muted-foreground mb-4">
                Log your first exam results to start tracking your progress
              </p>
              <Button onClick={() => setShowAddExam(true)} className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Log First Exam
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {trends.map((trend) => (
                <div
                  key={trend.subject}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSubject(expandedSubject === trend.subject ? null : trend.subject)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-white/40 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {trend.subject.charAt(0)}
                        </span>
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-foreground">{trend.subject}</h3>
                        <p className="text-sm text-muted-foreground">
                          {trend.history.length} exam{trend.history.length !== 1 ? "s" : ""} recorded
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-foreground">
                            {Math.round((trend.latestMarks / trend.latestMaxMarks) * 100)}%
                          </span>
                          <div className="flex items-center gap-1">
                            {getImprovementIcon(trend.improvement)}
                            <span className={`text-sm font-medium ${getImprovementColor(trend.improvement)}`}>
                              {trend.improvement > 0 ? "+" : ""}
                              {trend.improvement}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Latest: {trend.latestMarks}/{trend.latestMaxMarks}
                        </p>
                      </div>
                      {expandedSubject === trend.subject ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedSubject === trend.subject && (
                    <div className="border-t border-border/50 p-4 bg-white/30">
                      <div className="space-y-3">
                        {trend.history.map((exam, index) => (
                          <div
                            key={`${exam.examName}-${index}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                                {index === 0 ? (
                                  <Sparkles className="w-4 h-4 text-primary" />
                                ) : (
                                  <span className="text-xs font-medium text-primary">{index}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">{exam.examName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(exam.date).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">{exam.percentage}%</p>
                              <p className="text-xs text-muted-foreground">
                                {exam.marks}/{exam.maxMarks}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Exam Modal */}
        {showAddExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAddExam(false)}
            />
            <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Log Exam Results</h2>
                  <p className="text-sm text-muted-foreground">Record your latest exam scores</p>
                </div>
                <button
                  onClick={() => setShowAddExam(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Exam Name
                    </label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      placeholder="e.g., Mid-term Exam, Unit Test 3"
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      <Award className="w-4 h-4 inline mr-1" />
                      Subject Scores
                    </label>
                    <div className="space-y-3">
                      {examResults.map((result) => (
                        <div
                          key={result.subject}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                        >
                          <span className="font-medium text-foreground">{result.subject}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={result.marks}
                              onChange={(e) =>
                                updateExamResult(result.subject, parseInt(e.target.value) || 0)
                              }
                              min={0}
                              max={result.maxMarks}
                              className="w-20 px-3 py-1.5 rounded-lg border border-border bg-white text-center focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                            <span className="text-muted-foreground">/ {result.maxMarks}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-border p-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddExam(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitExam}
                  disabled={isSubmitting || !examName.trim()}
                  className="flex-1 gradient-primary text-white"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Results"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
