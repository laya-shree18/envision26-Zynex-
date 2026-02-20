import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Loader2,
  ArrowLeft,
  TrendingUp,
  Target,
  Clock,
  Flame,
  Calendar,
  CheckCircle2,
  BookOpen,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Area,
  AreaChart,
} from "recharts";

interface OverviewStats {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  totalStudyMinutes: number;
  completedStudyMinutes: number;
  streak: number;
  thisWeekCompleted: number;
  thisWeekMinutes: number;
}

interface SubjectPerformance {
  subject: string;
  marks: number;
  maxMarks: number;
  percentage: number;
  totalSessions: number;
  completedSessions: number;
  studyCompletionRate: number;
  totalMinutes: number;
  completedMinutes: number;
}

interface DailyTrend {
  date: string;
  total: number;
  completed: number;
  minutes: number;
  completedMinutes: number;
  completionRate: number;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#f97316", "#eab308"];

export default function AnalyticsPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>([]);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();
      setOverview(data.overview);
      setSubjectPerformance(data.subjectPerformance || []);
      setDailyTrends(data.dailyTrends || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prepare chart data
  const subjectMarksData = subjectPerformance.map((s) => ({
    name: s.subject.length > 12 ? s.subject.substring(0, 12) + "..." : s.subject,
    fullName: s.subject,
    marks: s.percentage,
    studyProgress: s.studyCompletionRate,
  }));

  const studyTimeData = subjectPerformance.map((s, i) => ({
    name: s.subject,
    value: s.completedMinutes,
    color: COLORS[i % COLORS.length],
  }));

  const trendData = dailyTrends.map((d) => ({
    ...d,
    date: formatDate(d.date),
  }));

  const radarData = subjectPerformance.map((s) => ({
    subject: s.subject.length > 10 ? s.subject.substring(0, 10) + "..." : s.subject,
    marks: s.percentage,
    effort: s.studyCompletionRate,
  }));

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-1">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your study progress and performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Completion Rate"
            value={`${overview?.completionRate || 0}%`}
            sublabel={`${overview?.completedSessions || 0}/${overview?.totalSessions || 0} sessions`}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Study Time"
            value={formatMinutes(overview?.completedStudyMinutes || 0)}
            sublabel="Total completed"
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="Current Streak"
            value={`${overview?.streak || 0}`}
            sublabel="days"
            color="text-orange-600"
            bgColor="bg-orange-100"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="This Week"
            value={`${overview?.thisWeekCompleted || 0}`}
            sublabel={`sessions (${formatMinutes(overview?.thisWeekMinutes || 0)})`}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
        </div>

        {subjectPerformance.length > 0 ? (
          <>
            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Subject Performance Bar Chart */}
              <div className="bg-white rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Subject Performance
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectMarksData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80} 
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border border-border">
                                <p className="font-medium text-foreground">{data.fullName}</p>
                                <p className="text-sm text-primary">Marks: {data.marks}%</p>
                                <p className="text-sm text-accent">Study Progress: {data.studyProgress}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="marks" fill="#6366f1" radius={[0, 4, 4, 0]} name="Marks %" />
                      <Bar dataKey="studyProgress" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Study %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Marks %</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-accent" />
                    <span className="text-muted-foreground">Study Progress %</span>
                  </div>
                </div>
              </div>

              {/* Study Time Distribution Pie Chart */}
              <div className="bg-white rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Study Time Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={studyTimeData.filter((d) => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {studyTimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border border-border">
                                <p className="font-medium text-foreground">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatMinutes(data.value)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {studyTimeData.slice(0, 6).map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground truncate max-w-[80px]">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Daily Completion Trend */}
              <div className="bg-white rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Daily Study Trend
                </h3>
                {trendData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 rounded-lg shadow-lg border border-border">
                                  <p className="font-medium text-foreground">{data.date}</p>
                                  <p className="text-sm text-primary">Completed: {data.completed}/{data.total}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Time: {formatMinutes(data.completedMinutes)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="completedMinutes"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fill="url(#colorCompleted)"
                          name="Minutes Studied"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No study data yet
                  </div>
                )}
              </div>

              {/* Performance Radar */}
              <div className="bg-white rounded-2xl p-6 border border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Marks vs Effort
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Marks %"
                        dataKey="marks"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.4}
                      />
                      <Radar
                        name="Effort %"
                        dataKey="effort"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.4}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Marks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-accent" />
                    <span className="text-muted-foreground">Study Effort</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Details Table */}
            <div className="bg-white rounded-2xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Subject Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Subject</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Marks</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Sessions</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Time Spent</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectPerformance.map((subject, idx) => (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{subject.subject}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-sm font-medium ${
                              subject.percentage >= 60
                                ? "bg-green-100 text-green-700"
                                : subject.percentage >= 40
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {subject.marks}/{subject.maxMarks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground">
                          {subject.completedSessions}/{subject.totalSessions}
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground">
                          {formatMinutes(subject.completedMinutes)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${subject.studyCompletionRate}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-10">
                              {subject.studyCompletionRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white rounded-3xl border border-border">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Analytics Data Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Complete the onboarding and generate a study plan to see your analytics and track your progress.
            </p>
            <Button
              onClick={() => navigate("/planner")}
              className="gradient-primary text-white shadow-lg shadow-primary/25"
            >
              Go to Study Planner
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border">
      <div className={`w-10 h-10 rounded-xl ${bgColor} ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
    </div>
  );
}
