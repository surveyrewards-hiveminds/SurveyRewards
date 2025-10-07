import { Route, Routes } from "react-router-dom";
import Home from "./pages/public/Home";
import HomeV2 from "./pages/public/HomeV2";
import Contact from "./pages/public/Contact";
import Terms from "./pages/public/Terms";
import Register from "./pages/public/Register";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import MySurvey from "./pages/MySurvey";
import CreateSurvey from "./pages/CreateSurvey";
import SurveyList from "./pages/SurveyList";
import Profile from "./pages/Profile";
import SurveyManagement from "./pages/SurveyManagement";
import EditSurvey from "./pages/EditSurvey";
import CreditPayments from "./pages/CreditPayments";
import CreditTransactionsPage from "./pages/CreditTransactionsPage";
import NotificationsList from "./pages/NotificationsList";
import NotificationDetail from "./pages/NotificationDetail";
// import ProtectedRoute from "./components/auth/ProtectedRoute";
import VerificationPending from "./pages/public/VerificationPending";
import VerificationThankYou from "./pages/public/VerificationThankYou";
import VerifiedRoute from "./components/auth/VerifiedRoute";
import History from "./pages/History";
import AnswerSurvey from "./pages/AnswerSurvey";
import WithdrawPage from "./pages/WithdrawPage";
import SurveyPreview from "./pages/SurveyPreview";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      {/* <Route path="/" element={<Home />} /> */}
      <Route path="/" element={<HomeV2 />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<LoginPage />} />
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <VerifiedRoute>
            <Dashboard />
          </VerifiedRoute>
        }
      />
      <Route
        path="/answer"
        element={
          <VerifiedRoute>
            <SurveyList />
          </VerifiedRoute>
        }
      />
      <Route
        path="/my-surveys"
        element={
          <VerifiedRoute>
            <MySurvey />
          </VerifiedRoute>
        }
      />
      <Route
        path="/my-surveys/:surveyId"
        element={
          <VerifiedRoute>
            <SurveyManagement />
          </VerifiedRoute>
        }
      />
      <Route
        path="/survey/:id"
        element={
          <VerifiedRoute>
            <AnswerSurvey />
          </VerifiedRoute>
        }
      />
      <Route
        path="/my-surveys/:surveyId/edit"
        element={
          <VerifiedRoute>
            <EditSurvey />
          </VerifiedRoute>
        }
      />
      <Route
        path="/my-surveys/:surveyId/preview"
        element={
          <VerifiedRoute>
            <SurveyPreview />
          </VerifiedRoute>
        }
      />
      <Route
        path="/survey-preview/:surveyId"
        element={
          <VerifiedRoute>
            <SurveyPreview />
          </VerifiedRoute>
        }
      />
      <Route
        path="/create-survey"
        element={
          <VerifiedRoute>
            <CreateSurvey />
          </VerifiedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <VerifiedRoute>
            <Profile />
          </VerifiedRoute>
        }
      />
      <Route
        path="/credits"
        element={
          <VerifiedRoute>
            <CreditPayments />
          </VerifiedRoute>
        }
      />
      <Route
        path="/credits/transactions"
        element={
          <VerifiedRoute>
            <CreditTransactionsPage />
          </VerifiedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <VerifiedRoute>
            <History />
          </VerifiedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <VerifiedRoute>
            <NotificationsList />
          </VerifiedRoute>
        }
      />
      <Route
        path="/notifications/:notificationId"
        element={
          <VerifiedRoute>
            <NotificationDetail />
          </VerifiedRoute>
        }
      />
      <Route
        path="/withdraw"
        element={
          <VerifiedRoute>
            <WithdrawPage />
          </VerifiedRoute>
        }
      />
      ;
      <Route path="/verification-pending" element={<VerificationPending />} />
      <Route
        path="/verification-thank-you"
        element={<VerificationThankYou />}
      />
    </Routes>
  );
}
