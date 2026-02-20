import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  FileText,
  X,
  Sparkles,
  BookOpen,
  AlertCircle,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface SyllabusTopic {
  subject: string;
  chapter: string | null;
  topic: string;
  priority: "high" | "medium" | "low";
}

export default function OnboardingSyllabusPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedTopics, setExtractedTopics] = useState<SyllabusTopic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [newTopic, setNewTopic] = useState({ subject: "", chapter: "", topic: "" });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
    // Get subjects from localStorage (from marks extraction)
    const storedMarks = localStorage.getItem("studypilot_marks");
    if (storedMarks) {
      try {
        const marks = JSON.parse(storedMarks);
        const subjectNames = marks.map((m: { subject: string }) => m.subject);
        setSubjects(subjectNames);
      } catch (e) {
        console.error("Failed to parse marks:", e);
      }
    }
  }, [user, isPending, navigate]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const extractTopics = async () => {
    if (!file) return;

    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("subjects", JSON.stringify(subjects));

      const response = await fetch("/api/extract-syllabus", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract topics");
      }

      if (data.topics && data.topics.length > 0) {
        setExtractedTopics(data.topics);
        // Expand all subjects by default
        const allSubjects = new Set<string>(data.topics.map((t: SyllabusTopic) => t.subject));
        setExpandedSubjects(allSubjects);
      } else {
        setError("No topics found in the document. Try a clearer image or add topics manually.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process document");
    } finally {
      setIsExtracting(false);
    }
  };

  const removeTopic = (index: number) => {
    setExtractedTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTopicPriority = (index: number, priority: "high" | "medium" | "low") => {
    setExtractedTopics((prev) =>
      prev.map((t, i) => (i === index ? { ...t, priority } : t))
    );
  };

  const addManualTopic = () => {
    if (!newTopic.subject.trim() || !newTopic.topic.trim()) return;
    
    setExtractedTopics((prev) => [
      ...prev,
      {
        subject: newTopic.subject.trim(),
        chapter: newTopic.chapter.trim() || null,
        topic: newTopic.topic.trim(),
        priority: "medium",
      },
    ]);
    setNewTopic({ subject: "", chapter: "", topic: "" });
    setShowAddForm(false);
    
    // Expand the subject
    setExpandedSubjects((prev) => new Set([...prev, newTopic.subject.trim()]));
  };

  const toggleSubject = (subject: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  const saveAndContinue = async () => {
    setIsSaving(true);
    try {
      // Save syllabus topics
      if (extractedTopics.length > 0) {
        await fetch("/api/syllabus/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topics: extractedTopics }),
        });
      }

      // Get preferences from localStorage
      const storedPreferences = localStorage.getItem("studypilot_preferences");
      const preferences = storedPreferences ? JSON.parse(storedPreferences) : {};
      
      // Get marks from localStorage
      const storedMarks = localStorage.getItem("studypilot_marks");
      const marks = storedMarks ? JSON.parse(storedMarks) : [];

      // Complete onboarding
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks, preferences }),
      });

      // Clear localStorage
      localStorage.removeItem("studypilot_marks");
      localStorage.removeItem("studypilot_preferences");

      // Navigate to planner
      navigate("/planner");
    } catch (error) {
      console.error("Error saving syllabus:", error);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const skipSyllabus = async () => {
    setIsSaving(true);
    try {
      const storedPreferences = localStorage.getItem("studypilot_preferences");
      const preferences = storedPreferences ? JSON.parse(storedPreferences) : {};
      const storedMarks = localStorage.getItem("studypilot_marks");
      const marks = storedMarks ? JSON.parse(storedMarks) : [];

      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks, preferences }),
      });

      localStorage.removeItem("studypilot_marks");
      localStorage.removeItem("studypilot_preferences");

      navigate("/planner");
    } catch (error) {
      console.error("Error:", error);
      navigate("/planner");
    } finally {
      setIsSaving(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group topics by subject
  const topicsBySubject = extractedTopics.reduce((acc, topic) => {
    if (!acc[topic.subject]) {
      acc[topic.subject] = [];
    }
    acc[topic.subject].push(topic);
    return acc;
  }, {} as Record<string, SyllabusTopic[]>);

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

            <Button variant="ghost" onClick={() => navigate("/onboarding/quiz")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepIndicator number={1} label="Upload" completed={true} />
          <div className="w-12 h-0.5 bg-primary" />
          <StepIndicator number={2} label="Quiz" completed={true} />
          <div className="w-12 h-0.5 bg-primary" />
          <StepIndicator number={3} label="Syllabus" active={true} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator number={4} label="Plan" />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            Syllabus Upload (Optional)
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Upload Your Syllabus
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Help us understand what topics you need to cover. Upload your syllabus and we'll extract the topics automatically.
          </p>
        </div>

        {extractedTopics.length === 0 ? (
          <div className="space-y-6">
            {/* Upload area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/50 bg-white"
              }`}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                    <Button
                      onClick={extractTopics}
                      disabled={isExtracting}
                      className="gradient-primary text-white"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Topics
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-medium text-foreground mb-1">
                    Drop your syllabus here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports images (PNG, JPG) and PDF files
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Skip option */}
            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Don't have a syllabus handy? You can skip this step and add topics later.
              </p>
              <Button variant="ghost" onClick={skipSyllabus} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Skip for now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Topics review */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Extracted Topics</h3>
                  <p className="text-sm text-muted-foreground">
                    {extractedTopics.length} topics found across {Object.keys(topicsBySubject).length} subjects
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Topic
                </Button>
              </div>

              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {Object.entries(topicsBySubject).map(([subject, topics]) => (
                  <div key={subject}>
                    <button
                      onClick={() => toggleSubject(subject)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground">{subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {topics.length} topics
                          </p>
                        </div>
                      </div>
                      {expandedSubjects.has(subject) ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                    
                    {expandedSubjects.has(subject) && (
                      <div className="bg-muted/30 divide-y divide-border/50">
                        {topics.map((topic, idx) => {
                          const globalIndex = extractedTopics.findIndex(
                            (t) =>
                              t.subject === topic.subject &&
                              t.topic === topic.topic &&
                              t.chapter === topic.chapter
                          );
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between px-4 py-3 pl-16"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {topic.topic}
                                </p>
                                {topic.chapter && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {topic.chapter}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <select
                                  value={topic.priority}
                                  onChange={(e) =>
                                    updateTopicPriority(
                                      globalIndex,
                                      e.target.value as "high" | "medium" | "low"
                                    )
                                  }
                                  className={`text-xs px-2 py-1 rounded-md border-0 cursor-pointer ${
                                    topic.priority === "high"
                                      ? "bg-red-100 text-red-700"
                                      : topic.priority === "medium"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-green-100 text-green-700"
                                  }`}
                                >
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                                <button
                                  onClick={() => removeTopic(globalIndex)}
                                  className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add topic form */}
            {showAddForm && (
              <div className="bg-white rounded-2xl border border-border p-4 space-y-4">
                <h4 className="font-medium text-foreground">Add New Topic</h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={newTopic.subject}
                      onChange={(e) =>
                        setNewTopic((prev) => ({ ...prev, subject: e.target.value }))
                      }
                      placeholder="e.g., Mathematics"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      list="subject-suggestions"
                    />
                    <datalist id="subject-suggestions">
                      {subjects.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Chapter
                    </label>
                    <input
                      type="text"
                      value={newTopic.chapter}
                      onChange={(e) =>
                        setNewTopic((prev) => ({ ...prev, chapter: e.target.value }))
                      }
                      placeholder="e.g., Chapter 1"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Topic *
                    </label>
                    <input
                      type="text"
                      value={newTopic.topic}
                      onChange={(e) =>
                        setNewTopic((prev) => ({ ...prev, topic: e.target.value }))
                      }
                      placeholder="e.g., Linear Equations"
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={addManualTopic}
                    disabled={!newTopic.subject.trim() || !newTopic.topic.trim()}
                  >
                    Add Topic
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setExtractedTopics([]);
                  setFile(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Start Over
              </Button>
              <Button
                onClick={saveAndContinue}
                disabled={isSaving}
                className="gradient-primary text-white shadow-lg shadow-primary/25"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Planner
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active = false,
  completed = false,
}: {
  number: number;
  label: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
          completed
            ? "gradient-primary text-white"
            : active
            ? "bg-primary/10 text-primary border-2 border-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? <Check className="w-5 h-5" /> : number}
      </div>
      <span
        className={`text-xs font-medium ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
