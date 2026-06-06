// ============================================================================
// APP COMPONENT
// Main application component with routing and layout
// ============================================================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './context/authStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages - Authentication
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Pages - Dashboard
import DashboardHome from './pages/dashboard/DashboardHome';
import ProfilePage from './pages/dashboard/ProfilePage';

// Pages - Academic Years
import AcademicYearsPage from './pages/academicYears/AcademicYearsPage';
import AcademicYearDetailPage from './pages/academicYears/AcademicYearDetailPage';

// Pages - Terms
import TermsPage from './pages/terms/TermsPage';

// Pages - Classes
import ClassesPage from './pages/classes/ClassesPage';

// stream detail page
import StreamDetailPage from './pages/classes/StreamDetailPage';

// Pages - Subjects
import SubjectsPage from './pages/subjects/SubjectsPage';

// Pages - Learners
import LearnersPage from './pages/learners/LearnersPage';
import LearnerDetailPage from './pages/learners/LearnerDetailPage';

// Pages - Reports
import ReportsPage from './pages/reports/ReportsPage';

// Pages - Users (Admin)
import UsersPage from './pages/users/UsersPage';

// Pages - Settings
import SettingsPage from './pages/settings/SettingsPage';

//pages - subject details pages
import SubjectDetailPage from './pages/subjects/SubjectDetailPage';

// Pages - Subject Combinations
import SubjectCombinationsPage from './pages/subjects/SubjectCombinationsPage';

// Import new feature pages
import GradingScale  from "./pages/settings/GradingScale";
import ExamEntry     from "./pages/exams/ExamEntry";
import ExamSessions  from "./pages/exams/ExamSessions";   // build next
import FinalResults  from "./pages/results/FinalResults"; // build next
import Rankings      from "./pages/results/Rankings";     // build next
import Analysis      from "./pages/analysis/Analysis";    // build next

import AdmitLearnerPage from './pages/learners/AdmitLearnerPage';

import EditLearnerPage from './pages/learners/EditLearnerPage';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, hasRole } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '0.5rem',
            padding: '1rem',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard Home */}
          <Route index element={<DashboardHome />} />
          
          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />
          
          {/* Academic Years - Super Admin Only */}
          <Route
            path="academic-years"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AcademicYearsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="academic-years/:id"
            element={
              <ProtectedRoute requiredRole="super_admin">
                <AcademicYearDetailPage />
              </ProtectedRoute>
            }
          />
          
          {/* Terms - Admin & Super Admin */}
          <Route
            path="terms"
            element={
              <ProtectedRoute requiredRole="admin">
                <TermsPage />
              </ProtectedRoute>
            }
          />
          
          {/* Subjects - Admin only added */}
          <Route 
            path="subjects" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SubjectsPage />
              </ProtectedRoute>
            } 
          />
          {/* Subject Combinations - Admin only */}
          <Route 
            path="subjects/combinations" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SubjectCombinationsPage />
              </ProtectedRoute>
            } 
          />
          {/* Subject - Admin only */}
          <Route 
            path="subjects/:id" 
            element={
              <ProtectedRoute requiredRole="admin">
                <SubjectDetailPage />
              </ProtectedRoute>
            } 
          />
          {/*routes for new features - Admin & Super Admin */}
          <Route 
            path="/settings/grading-scale" 
            element={<GradingScale />} 
          />
          <Route 
            path="/exams/entry"            
            element={<ExamEntry />} 
          />
          <Route 
            path="/exams/sessions"         
            element={<ExamSessions />} 
          />
          <Route 
            path="/results/final"          
            element={<FinalResults />} 
          />
          <Route 
            path="/results/rankings"       
            element={<Rankings />} />
          <Route 
            path="/analysis"               
            element={<Analysis />} 
          />
          {/*routes for new features - Admin & Super Admin end here */}
          
          {/* Classes - Admin & Super Admin */}
          <Route
            path="classes"
            element={
              <ProtectedRoute requiredRole="admin">
                <ClassesPage />
              </ProtectedRoute>
            }
          />
          {/* Classes - Admin only */}
          <Route 
            path="classes" 
            element={
              <ProtectedRoute requiredRole="admin">
                <ClassesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="classes/stream/:streamId" 
            element={
              <ProtectedRoute requiredRole="admin">
                <StreamDetailPage />
              </ProtectedRoute>
            } 
          />
                    
          {/* Learners - All Roles */}
          <Route path="learners" element={<LearnersPage />} />
          <Route path="learners/:id" element={<LearnerDetailPage />} />
          
          {/* Learners - All roles can view, Admin can manage */}
          <Route 
            path="learners" 
            element={
              <ProtectedRoute>
                <LearnersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="learners/admit" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdmitLearnerPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="learners/:id" 
            element={
              <ProtectedRoute>
                <LearnerDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="learners/:id/edit" 
            element={
              <ProtectedRoute requiredRole="admin">
                <EditLearnerPage />
              </ProtectedRoute>
            } 
          />          
          {/* Reports - All Roles */}
          <Route path="reports" element={<ReportsPage />} />
          
          {/* Users - Admin & Super Admin */}
          <Route
            path="users"
            element={
              <ProtectedRoute requiredRole="admin">
                <UsersPage />
              </ProtectedRoute>
            }
          />
          
          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />
        {/* 404 - Redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
