import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

interface SyllabusTopic {
  id: number;
  subject: string;
  topic: string;
  chapter: string | null;
  priority: string;
  is_completed: number;
}

export default function SyllabusPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTopic, setNewTopic] = useState({ subject: "", topic: "", chapter: "", priority: "medium" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchSyllabus();
    }
  }, [user]);

  const fetchSyllabus = async () => {
    try {
      const response = await fetch("/api/syllabus");
      const data = await response.json();
      setTopics(data.topics || []);
      const subjects = new Set<string>(data.topics?.map((t: SyllabusTopic) => t.subject) || []);
      setExpandedSubjects(subjects);
    } catch (err) {
      console.error("Error fetching syllabus:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  const toggleComplete = async (topicId: number, currentStatus: number) => {
    try {
      await fetch(`/api/syllabus/${topicId}/toggle`, {
        method: "PATCH",
      });
      setTopics(prev =>
        prev.map(t =>
          t.id === topicId ? { ...t, is_completed: currentStatus ? 0 : 1 } : t
        )
      );
    } catch (err) {
      console.error("Error toggling topic:", err);
    }
  };

  const deleteTopic = async (topicId: number) => {
    try {
      await fetch(`/api/syllabus/${topicId}`, {
        method: "DELETE",
      });
      setTopics(prev => prev.filter(t => t.id !== topicId));
    } catch (err) {
      console.error("Error deleting topic:", err);
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.subject.trim() || !newTopic.topic.trim()) return;
    
    setIsSaving(true);
    try {
      const response = await fetch("/api/syllabus/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTopic),
      });
      const data = await response.json();
      if (data.topic) {
        setTopics(prev => [...prev, data.topic]);
        setExpandedSubjects(prev => new Set([...prev, newTopic.subject]));
      }
      setNewTopic({ subject: "", topic: "", chapter: "", priority: "medium" });
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding topic:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const groupedTopics = topics.reduce((acc, topic) => {
    if (!acc[topic.subject]) {
      acc[topic.subject] = [];
    }
    acc[topic.subject].push(topic);
    return acc;
  }, {} as Record<string, SyllabusTopic[]>);

  const subjects = Object.keys(groupedTopics).sort();
  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.is_completed).length;
  const completionPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const priorityColors = {
    high: "text-red-600 bg-red-50",
    medium: "text-amber-600 bg-amber-50",
    low: "text-green-600 bg-green-50",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-foreground">My Syllabus</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/onboarding/syllabus")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Topic
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalTopics}</p>
                <p className="text-sm text-muted-foreground">Total Topics</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedTopics}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completionPercent}%</p>
                <p className="text-sm text-muted-foreground">Progress</p>
              </div>
            </div>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Syllabus Content */}
        {topics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Syllabus Topics Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your syllabus to have AI extract topics, or manually add topics to track your study progress.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => navigate("/onboarding/syllabus")}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Syllabus
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {subjects.map(subject => {
              const subjectTopics = groupedTopics[subject];
              const completed = subjectTopics.filter(t => t.is_completed).length;
              const isExpanded = expandedSubjects.has(subject);

              return (
                <div key={subject} className="bg-white rounded-2xl border border-border overflow-hidden">
                  <button
                    onClick={() => toggleSubject(subject)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold text-foreground">{subject}</h3>
                      <span className="text-sm text-muted-foreground">
                        {completed}/{subjectTopics.length} completed
                      </span>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(completed / subjectTopics.length) * 100}%` }}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border divide-y divide-border">
                      {subjectTopics.map(topic => (
                        <div
                          key={topic.id}
                          className={`px-5 py-3 flex items-center justify-between group ${
                            topic.is_completed ? "bg-green-50/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleComplete(topic.id, topic.is_completed)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                topic.is_completed
                                  ? "bg-green-500 border-green-500"
                                  : "border-muted-foreground/30 hover:border-primary"
                              }`}
                            >
                              {topic.is_completed ? (
                                <Check className="w-3 h-3 text-white" />
                              ) : null}
                            </button>
                            <div>
                              <p
                                className={`font-medium ${
                                  topic.is_completed
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {topic.topic}
                              </p>
                              {topic.chapter && (
                                <p className="text-xs text-muted-foreground">
                                  Chapter: {topic.chapter}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                priorityColors[topic.priority as keyof typeof priorityColors] ||
                                priorityColors.medium
                              }`}
                            >
                              {topic.priority}
                            </span>
                            <button
                              onClick={() => deleteTopic(topic.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Topic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add New Topic</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
                <input
                  type="text"
                  value={newTopic.subject}
                  onChange={e => setNewTopic(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Mathematics"
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Topic</label>
                <input
                  type="text"
                  value={newTopic.topic}
                  onChange={e => setNewTopic(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., Quadratic Equations"
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Chapter (optional)
                </label>
                <input
                  type="text"
                  value={newTopic.chapter}
                  onChange={e => setNewTopic(prev => ({ ...prev, chapter: e.target.value }))}
                  placeholder="e.g., Chapter 4"
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Priority</label>
                <select
                  value={newTopic.priority}
                  onChange={e => setNewTopic(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTopic} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Topic
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
