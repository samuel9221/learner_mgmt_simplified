// ============================================================================
// APP COMPONENT
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/authStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Dashboard
import DashboardHome from './pages/dashboard/DashboardHome';
import ProfilePage from './pages/dashboard/ProfilePage';

// Academic Years
import AcademicYearsPage from './pages/academicYears/AcademicYearsPage';
import AcademicYearDetailPage from './pages/academicYears/AcademicYearDetailPage';

// Terms
import TermsPage from './pages/terms/TermsPage';

// Classes
import ClassesPage from './pages/classes/ClassesPage';
import StreamDetailPage from './pages/classes/StreamDetailPage';

// Subjects
import SubjectsPage from './pages/subjects/SubjectsPage';
import SubjectDetailPage from './pages/subjects/SubjectDetailPage';
import SubjectCombinationsPage from './pages/subjects/SubjectCombinationsPage';

// Learners
import LearnersPage from './pages/learners/LearnersPage';
import LearnerDetailPage from './pages/learners/LearnerDetailPage';
import AdmitLearnerPage from './pages/learners/AdmitLearnerPage';
import EditLearnerPage from './pages/learners/EditLearnerPage';

// Reports
import ReportsPage from './pages/reports/ReportsPage';

// Users
import UsersPage from './pages/users/UsersPage';

// Settings
import SettingsPage from './pages/settings/SettingsPage';
import GradingScale from './pages/settings/GradingScale';

// Exams
import ExamSessions from './pages/exams/ExamSessions';
import ExamEntry from './pages/exams/ExamEntry';

// Results
import FinalResults from './pages/results/FinalResults';
import Rankings from './pages/results/Rankings';

// Analysis
import Analysis from './pages/analysis/Analysis';

// ── Route Guards ──────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, hasRole } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && !hasRole(requiredRole)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff', borderRadius: '0.5rem', padding: '1rem' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <Routes>

        {/* ── Public routes ── */}
        <Route path="/login" element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute><AuthLayout><ForgotPasswordPage /></AuthLayout></PublicRoute>
        } />

        {/* ── Dashboard shell (all protected children render inside Outlet) ── */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardLayout /></ProtectedRoute>
        }>

          {/* Home */}
          <Route index element={<DashboardHome />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Academic Years — super_admin only */}
          <Route path="academic-years" element={
            <ProtectedRoute requiredRole="super_admin"><AcademicYearsPage /></ProtectedRoute>
          } />
          <Route path="academic-years/:id" element={
            <ProtectedRoute requiredRole="admin"><AcademicYearDetailPage /></ProtectedRoute>
          } />

          {/* Terms — admin+ */}
          <Route path="terms" element={
            <ProtectedRoute requiredRole="admin"><TermsPage /></ProtectedRoute>
          } />

          {/* Subjects — admin+ */}
          <Route path="subjects" element={
            <ProtectedRoute requiredRole="admin"><SubjectsPage /></ProtectedRoute>
          } />
          <Route path="subjects/combinations" element={
            <ProtectedRoute requiredRole="admin"><SubjectCombinationsPage /></ProtectedRoute>
          } />
          <Route path="subjects/:id" element={
            <ProtectedRoute requiredRole="admin"><SubjectDetailPage /></ProtectedRoute>
          } />

          {/* Classes — admin+ */}
          <Route path="classes" element={
            <ProtectedRoute requiredRole="admin"><ClassesPage /></ProtectedRoute>
          } />
          <Route path="classes/stream/:streamId" element={
            <ProtectedRoute requiredRole="admin"><StreamDetailPage /></ProtectedRoute>
          } />

          {/* Learners — all roles view, admin manages */}
          <Route path="learners" element={
            <ProtectedRoute><LearnersPage /></ProtectedRoute>
          } />
          <Route path="learners/admit" element={
            <ProtectedRoute requiredRole="admin"><AdmitLearnerPage /></ProtectedRoute>
          } />
          <Route path="learners/:id" element={
            <ProtectedRoute><LearnerDetailPage /></ProtectedRoute>
          } />
          <Route path="learners/:id/edit" element={
            <ProtectedRoute requiredRole="admin"><EditLearnerPage /></ProtectedRoute>
          } />

          {/* ── Exams — relative paths (no leading slash) ── */}
          <Route path="exams/sessions" element={
            <ProtectedRoute requiredRole="admin"><ExamSessions /></ProtectedRoute>
          } />
          <Route path="exams/entry" element={
            <ProtectedRoute requiredRole="teacher"><ExamEntry /></ProtectedRoute>
          } />

          {/* ── Results ── */}
          <Route path="results/final" element={
            <ProtectedRoute requiredRole="admin"><FinalResults /></ProtectedRoute>
          } />
          <Route path="results/rankings" element={
            <ProtectedRoute requiredRole="admin"><Rankings /></ProtectedRoute>
          } />

          {/* ── Analysis ── */}
          <Route 
            path="analysis" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Analysis />
                </ProtectedRoute>
          } />

          {/* Reports — all roles */}
          <Route path="reports" element={<ReportsPage />} />

          {/* Users — admin+ */}
          <Route path="users" element={
            <ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>
          } />

          {/* Settings — admin+ */}
          <Route path="settings" element={
            <ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>
          } />
          <Route path="settings/grading-scale" element={
            <ProtectedRoute requiredRole="admin"><GradingScale /></ProtectedRoute>
          } />

        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
