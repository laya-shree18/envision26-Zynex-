import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Upload,
  Loader2,
  Check,
  X,
  Pencil,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  FileImage,
} from "lucide-react";

interface SubjectMark {
  subject: string;
  marks: number;
  maxMarks: number;
}

export default function OnboardingPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"upload" | "review" | "processing">("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedMarks, setExtractedMarks] = useState<SubjectMark[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  }, []);

  const extractMarks = async () => {
    if (!imageFile) return;

    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);

      const response = await fetch("/api/extract-marks", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract marks");
      }

      if (data.marks && data.marks.length > 0) {
        setExtractedMarks(data.marks);
        setStep("review");
      } else {
        setError("No marks found in the image. Please try a clearer photo of your marksheet.");
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setError(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      setIsExtracting(false);
    }
  };

  const updateMark = (index: number, field: keyof SubjectMark, value: string | number) => {
    setExtractedMarks((prev) =>
      prev.map((mark, i) =>
        i === index
          ? { ...mark, [field]: field === "subject" ? value : Number(value) }
          : mark
      )
    );
  };

  const removeMark = (index: number) => {
    setExtractedMarks((prev) => prev.filter((_, i) => i !== index));
  };

  const addMark = () => {
    setExtractedMarks((prev) => [...prev, { subject: "New Subject", marks: 0, maxMarks: 100 }]);
    setEditingIndex(extractedMarks.length);
  };

  const proceedToQuiz = () => {
    // Store marks in localStorage for now (will use database later)
    localStorage.setItem("studypilot_marks", JSON.stringify(extractedMarks));
    navigate("/onboarding/quiz");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              Back
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <StepIndicator number={1} label="Upload" active={step === "upload"} completed={step !== "upload"} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator number={2} label="Review" active={step === "review"} completed={false} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator number={3} label="Quiz" active={false} completed={false} />
        </div>

        {step === "upload" && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Upload Your Marksheet
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Take a clear photo of your marksheet or report card. Our AI will automatically
                extract your subjects and marks.
              </p>
            </div>

            {/* Upload area */}
            <div
              className={`relative bg-white rounded-3xl p-8 border-2 border-dashed transition-all ${
                imagePreview
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] max-h-96 mx-auto rounded-xl overflow-hidden bg-muted">
                    <img
                      src={imagePreview}
                      alt="Marksheet preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                    <Button
                      onClick={extractMarks}
                      disabled={isExtracting}
                      className="gradient-primary text-white shadow-lg shadow-primary/25"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Marks
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <FileImage className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-2">
                      Drop your marksheet here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse
                    </p>
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                  </div>
                </label>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-xl text-destructive">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-white rounded-2xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-3">Tips for best results</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Use good lighting and avoid shadows
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Make sure all subjects and marks are visible
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Hold the camera steady for a clear image
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Review Your Marks
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                We've extracted the following information. Please review and make any corrections.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-border shadow-xl shadow-primary/5">
              <div className="space-y-3">
                {extractedMarks.map((mark, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 group"
                  >
                    {editingIndex === index ? (
                      <>
                        <input
                          type="text"
                          value={mark.subject}
                          onChange={(e) => updateMark(index, "subject", e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-foreground"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={mark.marks}
                            onChange={(e) => updateMark(index, "marks", e.target.value)}
                            className="w-20 px-3 py-2 rounded-lg border border-border bg-white text-foreground text-center"
                          />
                          <span className="text-muted-foreground">/</span>
                          <input
                            type="number"
                            value={mark.maxMarks}
                            onChange={(e) => updateMark(index, "maxMarks", e.target.value)}
                            className="w-20 px-3 py-2 rounded-lg border border-border bg-white text-foreground text-center"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingIndex(null)}
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{mark.subject}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              mark.marks / mark.maxMarks >= 0.6
                                ? "text-green-600"
                                : mark.marks / mark.maxMarks >= 0.4
                                ? "text-amber-600"
                                : "text-red-600"
                            }`}
                          >
                            {mark.marks}
                          </span>
                          <span className="text-muted-foreground">/ {mark.maxMarks}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingIndex(index)}
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMark(index)}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="outline" className="w-full mt-4" onClick={addMark}>
                + Add Subject
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={proceedToQuiz}
                className="gradient-primary text-white shadow-lg shadow-primary/25"
              >
                Continue to Quiz
                <ArrowRight className="w-4 h-4 ml-2" />
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
