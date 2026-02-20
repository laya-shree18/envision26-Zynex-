import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Eye,
  Ear,
  BookOpen,
  Hand,
  Clock,
  Coffee,
  Target,
  Trophy,
  TrendingUp,
  Volume2,
  VolumeX,
  Music,
  Zap,
  Brain,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  options: {
    value: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
  }[];
}

const quizQuestions: QuizQuestion[] = [
  {
    id: "learning_style",
    question: "How do you learn best?",
    description: "Understanding your primary learning style helps us tailor content presentation",
    options: [
      {
        value: "visual",
        label: "Visual",
        description: "Diagrams, charts, videos",
        icon: <Eye className="w-6 h-6" />,
      },
      {
        value: "auditory",
        label: "Auditory",
        description: "Lectures, discussions, podcasts",
        icon: <Ear className="w-6 h-6" />,
      },
      {
        value: "reading",
        label: "Reading/Writing",
        description: "Notes, textbooks, articles",
        icon: <BookOpen className="w-6 h-6" />,
      },
      {
        value: "kinesthetic",
        label: "Hands-on",
        description: "Practice problems, experiments",
        icon: <Hand className="w-6 h-6" />,
      },
    ],
  },
  {
    id: "study_time",
    question: "When are you most productive?",
    description: "We'll schedule your most challenging subjects during your peak hours",
    options: [
      {
        value: "morning",
        label: "Early Morning",
        description: "5 AM - 9 AM",
        icon: <Sunrise className="w-6 h-6" />,
      },
      {
        value: "midday",
        label: "Midday",
        description: "9 AM - 2 PM",
        icon: <Sun className="w-6 h-6" />,
      },
      {
        value: "afternoon",
        label: "Afternoon",
        description: "2 PM - 6 PM",
        icon: <Sunset className="w-6 h-6" />,
      },
      {
        value: "evening",
        label: "Evening/Night",
        description: "6 PM - 12 AM",
        icon: <Moon className="w-6 h-6" />,
      },
    ],
  },
  {
    id: "session_length",
    question: "How long can you focus in one sitting?",
    description: "This helps us plan optimal study sessions with appropriate breaks",
    options: [
      {
        value: "short",
        label: "15-25 minutes",
        description: "Pomodoro-style sprints",
        icon: <Zap className="w-6 h-6" />,
      },
      {
        value: "medium",
        label: "30-45 minutes",
        description: "Balanced sessions",
        icon: <Clock className="w-6 h-6" />,
      },
      {
        value: "long",
        label: "60-90 minutes",
        description: "Deep work blocks",
        icon: <Brain className="w-6 h-6" />,
      },
      {
        value: "extended",
        label: "2+ hours",
        description: "Marathon study sessions",
        icon: <Coffee className="w-6 h-6" />,
      },
    ],
  },
  {
    id: "environment",
    question: "What's your ideal study environment?",
    description: "We'll include environment tips in your study plan",
    options: [
      {
        value: "silent",
        label: "Complete Silence",
        description: "No distractions at all",
        icon: <VolumeX className="w-6 h-6" />,
      },
      {
        value: "music",
        label: "Background Music",
        description: "Lo-fi, classical, instrumental",
        icon: <Music className="w-6 h-6" />,
      },
      {
        value: "ambient",
        label: "Ambient Noise",
        description: "Coffee shop, nature sounds",
        icon: <Volume2 className="w-6 h-6" />,
      },
      {
        value: "flexible",
        label: "Varies by Task",
        description: "Depends on what I'm studying",
        icon: <Brain className="w-6 h-6" />,
      },
    ],
  },
  {
    id: "motivation",
    question: "What motivates you most?",
    description: "We'll incorporate motivational elements into your plan",
    options: [
      {
        value: "deadlines",
        label: "Deadlines",
        description: "Clear targets and due dates",
        icon: <Target className="w-6 h-6" />,
      },
      {
        value: "progress",
        label: "Seeing Progress",
        description: "Tracking improvement over time",
        icon: <TrendingUp className="w-6 h-6" />,
      },
      {
        value: "rewards",
        label: "Rewards",
        description: "Treating myself after milestones",
        icon: <Trophy className="w-6 h-6" />,
      },
      {
        value: "mastery",
        label: "Mastery",
        description: "Deep understanding of topics",
        icon: <GraduationCap className="w-6 h-6" />,
      },
    ],
  },
];

export default function OnboardingQuizPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Save answers and proceed
      localStorage.setItem("studypilot_preferences", JSON.stringify(answers));
      setIsComplete(true);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const proceedToSyllabus = () => {
    // Save preferences to localStorage for later
    localStorage.setItem("studypilot_preferences", JSON.stringify(answers));
    // Navigate to syllabus upload
    navigate("/onboarding/syllabus");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const question = quizQuestions[currentQuestion];
  const currentAnswer = answers[question?.id];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

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

            <Button variant="ghost" onClick={() => navigate("/onboarding")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepIndicator number={1} label="Upload" active={false} completed={true} />
          <div className="w-12 h-0.5 bg-primary" />
          <StepIndicator number={2} label="Quiz" active={!isComplete} completed={isComplete} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator number={3} label="Syllabus" active={false} completed={false} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator number={4} label="Plan" active={false} completed={false} />
        </div>

        {!isComplete ? (
          <div className="space-y-8">
            {/* Progress bar */}
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full gradient-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Question */}
            <div className="text-center">
              <p className="text-sm text-primary font-medium mb-2">
                Question {currentQuestion + 1} of {quizQuestions.length}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {question.question}
              </h1>
              {question.description && (
                <p className="text-muted-foreground">{question.description}</p>
              )}
            </div>

            {/* Options */}
            <div className="grid sm:grid-cols-2 gap-4">
              {question.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(question.id, option.value)}
                  className={`group relative p-6 rounded-2xl border-2 transition-all text-left ${
                    currentAnswer === option.value
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border bg-white hover:border-primary/50 hover:shadow-md"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                      currentAnswer === option.value
                        ? "gradient-primary text-white"
                        : "bg-primary/10 text-primary group-hover:bg-primary/20"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{option.label}</h3>
                  {option.description && (
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  )}
                  {currentAnswer === option.value && (
                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={nextQuestion}
                disabled={!currentAnswer}
                className="gradient-primary text-white shadow-lg shadow-primary/25"
              >
                {currentQuestion === quizQuestions.length - 1 ? "Finish" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-8">
            {/* Completion animation */}
            <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mx-auto shadow-xl shadow-primary/25 animate-bounce">
              <Check className="w-12 h-12 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Learning Profile Complete!
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                We've learned how you study best. Let's create your personalized 
                study plan based on your marks and learning preferences.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl p-6 border border-border text-left max-w-md mx-auto">
              <h3 className="font-semibold text-foreground mb-4">Your Learning Profile</h3>
              <div className="space-y-3">
                {Object.entries(answers).map(([key, value]) => {
                  const question = quizQuestions.find((q) => q.id === key);
                  const option = question?.options.find((o) => o.value === value);
                  if (!question || !option) return null;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {option.icon}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {question.question.replace("?", "")}
                        </p>
                        <p className="font-medium text-foreground">{option.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={proceedToSyllabus}
              size="lg"
              className="gradient-primary text-white shadow-lg shadow-primary/25"
            >
              Upload Syllabus
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
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
