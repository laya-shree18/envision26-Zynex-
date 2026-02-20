import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@getmocha/users-service/react";
import { Button } from "@/react-app/components/ui/button";
import {
  GraduationCap,
  Loader2,
  LogOut,
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  Key,
  Server,
  UserX,
  FileText,
  ShieldCheck,
  Database,
  Fingerprint,
} from "lucide-react";

interface DataSummary {
  profile: boolean;
  subjectsCount: number;
  studyPlansCount: number;
  examResultsCount: number;
  accountCreated: string;
}

export default function PrivacyPage() {
  const { user, isPending, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!user && !isPending) {
      navigate("/login");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchDataSummary();
    }
  }, [user]);

  const fetchDataSummary = async () => {
    try {
      const response = await fetch("/api/privacy/data-summary");
      const data = await response.json();
      setDataSummary(data);
    } catch (err) {
      console.error("Error fetching data summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/privacy/export-data");
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `studypilot-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting data:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await fetch("/api/privacy/delete-data", { method: "DELETE" });
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Error deleting account:", err);
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  Study<span className="gradient-text">Pilot</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user.google_user_data.picture && (
                  <img
                    src={user.google_user_data.picture}
                    alt={user.google_user_data.name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {user.google_user_data.name || user.email}
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
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Privacy & Security</h1>
              <p className="text-muted-foreground">Manage your data and security settings</p>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div className="bg-white rounded-2xl p-6 border border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Security Status
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SecurityBadge
              icon={Lock}
              title="Encrypted Connection"
              description="HTTPS secured"
              status="active"
            />
            <SecurityBadge
              icon={Fingerprint}
              title="OAuth 2.0"
              description="Google authentication"
              status="active"
            />
            <SecurityBadge
              icon={Server}
              title="Secure Storage"
              description="Encrypted at rest"
              status="active"
            />
            <SecurityBadge
              icon={Eye}
              title="Privacy First"
              description="No data sharing"
              status="active"
            />
          </div>
        </div>

        {/* Privacy Commitments */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Our Privacy Commitments
          </h2>
          <div className="space-y-3">
            <PrivacyItem text="Your marksheet images are processed once and never stored permanently" />
            <PrivacyItem text="Study data is used only to generate your personalized plans" />
            <PrivacyItem text="We never sell or share your data with third parties" />
            <PrivacyItem text="You can export or delete all your data at any time" />
            <PrivacyItem text="No tracking cookies or analytics beyond essential functionality" />
          </div>
        </div>

        {/* Your Data */}
        <div className="bg-white rounded-2xl p-6 border border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Your Stored Data
          </h2>
          {dataSummary && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <DataItem
                  label="Learning Profile"
                  value={dataSummary.profile ? "Set up" : "Not set"}
                  icon={dataSummary.profile ? CheckCircle2 : EyeOff}
                />
                <DataItem
                  label="Subjects Tracked"
                  value={`${dataSummary.subjectsCount} subjects`}
                  icon={CheckCircle2}
                />
                <DataItem
                  label="Study Sessions"
                  value={`${dataSummary.studyPlansCount} sessions`}
                  icon={CheckCircle2}
                />
                <DataItem
                  label="Exam Records"
                  value={`${dataSummary.examResultsCount} exams`}
                  icon={CheckCircle2}
                />
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Account created: {dataSummary.accountCreated ? new Date(dataSummary.accountCreated).toLocaleDateString() : "Unknown"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Data Actions */}
        <div className="bg-white rounded-2xl p-6 border border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            Data Control
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Export Your Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Download all your data as a JSON file
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Export"
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Delete All Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently remove all your data from StudyPilot
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-2xl p-6 border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Current Session
          </h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              {user.google_user_data.picture && (
                <img
                  src={user.google_user_data.picture}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  Signed in via Google
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Active
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete All Data?</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete your learning profile, all study plans, exam records,
              and subject data. You will be signed out automatically.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Everything
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityBadge({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  status: "active" | "warning";
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm text-foreground truncate">{title}</p>
          {status === "active" && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}

function PrivacyItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

function DataItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {value}
        <Icon className="w-4 h-4 text-emerald-600" />
      </span>
    </div>
  );
}
