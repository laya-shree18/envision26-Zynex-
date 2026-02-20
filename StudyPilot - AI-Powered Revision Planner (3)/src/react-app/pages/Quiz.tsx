import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

interface SyllabusTopic {
  id: number;
  subject: string;
  topic: string;
  chapter: string | null;
  priority: string;
  is_completed: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

type QuizState = "select" | "loading" | "quiz" | "results";

export default function QuizPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTopicId = searchParams.get("topic");
  
  const [state, setState] = useState<QuizState>("select");
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<SyllabusTopic | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchTopics();
    }
  }, [user]);

  useEffect(() => {
    if (preselectedTopicId && topics.length > 0) {
      const topic = topics.find(t => t.id === parseInt(preselectedTopicId));
      if (topic) {
        setSelectedTopic(topic);
      }
    }
  }, [preselectedTopicId, topics]);

  const fetchTopics = async () => {
    try {
      const response = await fetch("/api/syllabus");
      const data = await response.json();
      // Filter to show incomplete topics only
      const incompleteTopics = (data.topics || []).filter((t: SyllabusTopic) => !t.is_completed);
      setTopics(incompleteTopics);
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  const startQuiz = async () => {
    if (!selectedTopic) return;
    
    setState("loading");
    
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedTopic.subject,
          topic: selectedTopic.topic,
          chapter: selectedTopic.chapter,
        }),
      });
      
      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setSelectedAnswers(new Array(data.questions.length).fill(null));
        setCurrentQuestionIndex(0);
        setShowAnswer(false);
        setState("quiz");
      } else {
        alert("Failed to generate quiz questions. Please try again.");
        setState("select");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
      alert("Failed to generate quiz. Please try again.");
      setState("select");
    }
  };

  const selectAnswer = (optionIndex: number) => {
    if (showAnswer) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const checkAnswer = () => {
    setShowAnswer(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      calculateResults();
    }
  };

  const calculateResults = async () => {
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctIndex) {
        correctCount++;
      }
    });
    
    setScore(correctCount);
    const percentage = (correctCount / questions.length) * 100;
    const hasPassed = percentage >= 70; // 70% to pass
    setPassed(hasPassed);
    setState("results");
    
    if (hasPassed && selectedTopic) {
      // Mark the topic as complete
      setIsMarkingComplete(true);
      try {
        await fetch(`/api/syllabus/${selectedTopic.id}/toggle`, {
          method: "PATCH",
        });
        
        // Fire confetti!
        fireConfetti();
      } catch (err) {
        console.error("Error marking complete:", err);
      } finally {
        setIsMarkingComplete(false);
      }
    }
  };

  const fireConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#f472b6"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#f472b6"],
      });
    }, 250);
  };

  const resetQuiz = () => {
    setSelectedTopic(null);
    setQuestions([]);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
    setScore(0);
    setPassed(false);
    setState("select");
    // Refresh topics to update completion status
    fetchTopics();
  };

  if (isPending || isLoadingTopics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Knowledge Quiz</h1>
              </div>
            </div>
            {state === "quiz" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {currentQuestionIndex + 1}
                </span>
                <span>/</span>
                <span>{questions.length}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Select Topic State */}
        {state === "select" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Test Your Knowledge</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Select a topic to quiz yourself. Score 70% or higher to mark the topic as complete!
              </p>
            </div>

            {topics.length === 0 ? (
              <div className="bg-white rounded-2xl border border-border p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-7 h-7 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">All Topics Complete!</h3>
                <p className="text-muted-foreground mb-6">
                  You've mastered all your syllabus topics. Amazing work!
                </p>
                <Button onClick={() => navigate("/syllabus")}>
                  View Syllabus
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {topics.length} topic{topics.length !== 1 ? "s" : ""} remaining
                </p>
                {topics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(selectedTopic?.id === topic.id ? null : topic)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedTopic?.id === topic.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-white hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{topic.topic}</p>
                        <p className="text-sm text-muted-foreground">
                          {topic.subject}
                          {topic.chapter && ` • ${topic.chapter}`}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedTopic?.id === topic.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {selectedTopic?.id === topic.id && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                
                <Button
                  onClick={startQuiz}
                  disabled={!selectedTopic}
                  className="w-full mt-6"
                  size="lg"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Start Quiz
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {state === "loading" && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Brain className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Generating Quiz Questions...
            </h3>
            <p className="text-muted-foreground">
              AI is creating personalized questions for {selectedTopic?.topic}
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-6" />
          </div>
        )}

        {/* Quiz State */}
        {state === "quiz" && currentQuestion && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {currentQuestionIndex + 1}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-foreground leading-relaxed">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswers[currentQuestionIndex] === index;
                  const isCorrect = index === currentQuestion.correctIndex;
                  const showCorrect = showAnswer && isCorrect;
                  const showWrong = showAnswer && isSelected && !isCorrect;

                  return (
                    <button
                      key={index}
                      onClick={() => selectAnswer(index)}
                      disabled={showAnswer}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        showCorrect
                          ? "border-green-500 bg-green-50"
                          : showWrong
                          ? "border-red-500 bg-red-50"
                          : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-white hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-medium ${
                            showCorrect
                              ? "text-green-700"
                              : showWrong
                              ? "text-red-700"
                              : "text-foreground"
                          }`}
                        >
                          {option}
                        </span>
                        {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {showWrong && <XCircle className="w-5 h-5 text-red-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                {!showAnswer ? (
                  <Button
                    onClick={checkAnswer}
                    disabled={selectedAnswers[currentQuestionIndex] === null}
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button onClick={nextQuestion}>
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>
                        Next Question
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      "See Results"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results State */}
        {state === "results" && (
          <div className="text-center py-8">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                passed ? "bg-green-100" : "bg-amber-100"
              }`}
            >
              {passed ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : (
                <BookOpen className="w-10 h-10 text-amber-600" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {passed ? "Congratulations! 🎉" : "Keep Practicing!"}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {passed
                ? `You scored ${score}/${questions.length} (${Math.round((score / questions.length) * 100)}%) and mastered "${selectedTopic?.topic}"!`
                : `You scored ${score}/${questions.length} (${Math.round((score / questions.length) * 100)}%). You need 70% to mark this topic complete.`}
            </p>

            {passed && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 inline-block">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    {isMarkingComplete ? "Marking as complete..." : "Topic marked as complete!"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              {!passed && (
                <Button variant="outline" onClick={startQuiz}>
                  Try Again
                </Button>
              )}
              <Button onClick={resetQuiz}>
                {passed ? "Quiz Another Topic" : "Choose Different Topic"}
              </Button>
            </div>

            {/* Score Breakdown */}
            <div className="mt-8 bg-white rounded-2xl border border-border p-6 max-w-md mx-auto">
              <h3 className="font-semibold text-foreground mb-4">Score Breakdown</h3>
              <div className="space-y-2">
                {questions.map((q, i) => {
                  const isCorrect = selectedAnswers[i] === q.correctIndex;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Question {i + 1}</span>
                      <span
                        className={`font-medium ${
                          isCorrect ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
