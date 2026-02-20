import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  GraduationCap,
  Loader2,
  ArrowLeft,
  Calendar,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Sparkles,
} from "lucide-react";

interface ExamEntry {
  id: number;
  subject: string;
  exam_date: string;
  exam_name: string | null;
  notes: string | null;
}

interface SubjectMark {
  subject: string;
  marks: number;
  maxMarks: number;
}

export default function ExamSchedulePage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [subjects, setSubjects] = useState<SubjectMark[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [newSubject, setNewSubject] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newExamName, setNewExamName] = useState("");

  useEffect(() => {
    if (!user && !isPending) {
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
      const [examsRes, profileRes] = await Promise.all([
        fetch("/api/exam-schedule"),
        fetch("/api/user/profile"),
      ]);
      const examsData = await examsRes.json();
      const profileData = await profileRes.json();

      setExams(examsData.exams || []);
      setSubjects(profileData.marks || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addExam = async () => {
    if (!newSubject || !newDate) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/exam-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject,
          examDate: newDate,
          examName: newExamName || null,
        }),
      });

      const data = await response.json();
      if (data.exam) {
        setExams((prev) => [...prev, data.exam].sort((a, b) => 
          new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        ));
        setIsAdding(false);
        setNewSubject("");
        setNewDate("");
        setNewExamName("");
      }
    } catch (err) {
      console.error("Error adding exam:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteExam = async (id: number) => {
    try {
      await fetch(`/api/exam-schedule/${id}`, { method: "DELETE" });
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Error deleting exam:", err);
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const examDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    examDate.setHours(0, 0, 0, 0);
    return Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyStyle = (daysUntil: number) => {
    if (daysUntil <= 3) return "bg-red-100 border-red-200 text-red-700";
    if (daysUntil <= 7) return "bg-amber-100 border-amber-200 text-amber-700";
    if (daysUntil <= 14) return "bg-yellow-100 border-yellow-200 text-yellow-700";
    return "bg-green-100 border-green-200 text-green-700";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingExams = exams.filter((e) => getDaysUntil(e.exam_date) >= 0);
  const pastExams = exams.filter((e) => getDaysUntil(e.exam_date) < 0);

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-primary" />
              Exam Schedule
            </h1>
            <p className="text-muted-foreground">
              Add your exam dates to get a smarter study plan
            </p>
          </div>

          <Button
            onClick={() => setIsAdding(true)}
            className="gradient-primary text-white shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exam Date
          </Button>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-5 border border-primary/20 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">How it works</h3>
              <p className="text-muted-foreground text-sm">
                When you add exam dates, the AI planner will automatically prioritize those subjects 
                as their exams approach. Subjects with exams in the next 7 days get significantly more 
                study time allocation.
              </p>
            </div>
          </div>
        </div>

        {/* Add Exam Form */}
        {isAdding && (
          <div className="bg-white rounded-2xl p-6 border border-border mb-6 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Add New Exam
            </h3>
            
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Subject *
                </label>
                <select
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s.subject} value={s.subject}>
                      {s.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Exam Date *
                </label>
                <Input
                  type="date"
                  value={newDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNewDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Exam Name (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Mid-term, Final"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewSubject("");
                  setNewDate("");
                  setNewExamName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={addExam}
                disabled={!newSubject || !newDate || isSaving}
                className="gradient-primary text-white"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add Exam"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 ? (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Upcoming Exams ({upcomingExams.length})
            </h2>
            
            <div className="space-y-3">
              {upcomingExams.map((exam) => {
                const daysUntil = getDaysUntil(exam.exam_date);
                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-xl p-4 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {exam.subject}
                            {exam.exam_name && (
                              <span className="font-normal text-muted-foreground ml-2">
                                — {exam.exam_name}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(exam.exam_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getUrgencyStyle(
                            daysUntil
                          )}`}
                        >
                          {daysUntil === 0
                            ? "Today!"
                            : daysUntil === 1
                            ? "Tomorrow"
                            : `${daysUntil} days`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExam(exam.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CalendarDays className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Exams Scheduled</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Add your upcoming exam dates so the AI planner can create an optimized study 
              schedule that prioritizes subjects as their exams approach.
            </p>
            <Button
              onClick={() => setIsAdding(true)}
              className="gradient-primary text-white shadow-lg shadow-primary/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Exam
            </Button>
          </div>
        )}

        {/* Past Exams */}
        {pastExams.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Past Exams ({pastExams.length})
            </h2>
            
            <div className="space-y-2 opacity-60">
              {pastExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-muted/50 rounded-xl p-4 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground line-through">
                        {exam.subject}
                        {exam.exam_name && ` — ${exam.exam_name}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(exam.exam_date)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExam(exam.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action to generate plan */}
        {upcomingExams.length > 0 && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => navigate("/planner")}
              size="lg"
              className="gradient-primary text-white shadow-lg shadow-primary/25"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Study Plan Based on Exams
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
