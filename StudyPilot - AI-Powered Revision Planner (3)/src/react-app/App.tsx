import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import HomePage from "@/react-app/pages/Home";
import LoginPage from "@/react-app/pages/Login";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import DashboardPage from "@/react-app/pages/Dashboard";
import OnboardingPage from "@/react-app/pages/Onboarding";
import OnboardingQuizPage from "@/react-app/pages/OnboardingQuiz";
import StudyPlannerPage from "@/react-app/pages/StudyPlanner";
import AnalyticsPage from "@/react-app/pages/Analytics";
import PerformancePage from "@/react-app/pages/Performance";
import PrivacyPage from "@/react-app/pages/Privacy";
import OnboardingSyllabusPage from "@/react-app/pages/OnboardingSyllabus";
import SyllabusPage from "@/react-app/pages/Syllabus";
import QuizPage from "@/react-app/pages/Quiz";
import ExamSchedulePage from "@/react-app/pages/ExamSchedule";
import RobotChatbot from "@/react-app/components/RobotChatbot";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <RobotChatbot />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/quiz" element={<OnboardingQuizPage />} />
          <Route path="/onboarding/syllabus" element={<OnboardingSyllabusPage />} />
          <Route path="/planner" element={<StudyPlannerPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/syllabus" element={<SyllabusPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/exams" element={<ExamSchedulePage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
