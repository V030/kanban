import './App.css';

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { GoogleOAuthProvider } from '@react-oauth/google';

import { isAuthenticated } from './services/authService';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import NotificationsStream from "./components/common/NotificationsStream";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import MainPage from "./pages/MainPage";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Friends from "./pages/Friends";
import Notifications from "./pages/Notifications";
import KanbanPage from "./pages/KanbanPage";
import TaskDetailsPage from "./pages/TaskDetailsPage";
import MyTasks from "./pages/MyTasks";
import Profile from "./pages/Profile";
import FeedbackPage from "./pages/FeedbackPage";
import Metrics from "./pages/Metrics";
import ErrorPage from "./pages/ErrorPage";
import ConnectionErrorPage from "./pages/ConnectionErrorPage";
import { ProtectedRoute } from './components/protected/ProtectedRoutes';
import { PublicRoute } from './components/public/PublicRoutes';

const NETWORK_ERROR_EVENT = "kanban:network-error";
const SESSION_EXPIRED_EVENT = "kanban:session-expired";

function NetworkErrorRedirector() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNetworkError = () => {
      navigate("/connection-error", { replace: true });
    };

    const handleSessionExpired = () => {
      navigate("/login", { replace: true });
    };

    window.addEventListener(NETWORK_ERROR_EVENT, handleNetworkError);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(NETWORK_ERROR_EVENT, handleNetworkError);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [navigate]);

  return null;
}

function App() {
  const auth = isAuthenticated();

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ToastProvider>
        <BrowserRouter>
          <ToastContainer />
          <NotificationsStream />
          <NetworkErrorRedirector />
          <Routes>
        {/* routes declaration */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage/>
              </PublicRoute>
            } />

            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage/>
              </PublicRoute>
            } />

            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            } />

            <Route path="/main-page" element={
              <ProtectedRoute>
                <MainPage/>
              </ProtectedRoute>
              
            }>

              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<KanbanPage />} />
              <Route path="projects/:projectId/kanban" element={<KanbanPage />} />
              <Route path="projects/:projectId/kanban/tasks/:taskId" element={<TaskDetailsPage />} />
              <Route path="projects/:projectId/tasks" element={<KanbanPage />} />
              <Route path="projects/:projectId/settings" element={<KanbanPage />} />
              <Route path="projects/:projectId/metrics" element={<Metrics />} />
              <Route path="friends" element={<Friends />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="feedback" element={<FeedbackPage />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="profile" element={<Profile />} />
            </Route>

        {/* auth routing logic upon startup */}
          <Route 
            path='/'
            element= {
              auth 
                ? <Navigate to="/main-page/dashboard" replace /> 
                : <Navigate to="/login" replace />
            }>
          </Route>

          {/* Catch-all route for 404/invalid paths */}
          <Route path="/connection-error" element={<ConnectionErrorPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
        </BrowserRouter>
      </ToastProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
