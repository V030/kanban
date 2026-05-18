import './App.css';

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import Metrics from "./pages/Metrics";
import { ProtectedRoute } from './components/protected/ProtectedRoutes';
import { PublicRoute } from './components/public/PublicRoutes';

function App() {
  const auth = isAuthenticated();

  return (
    <ToastProvider>
      <BrowserRouter>
        <ToastContainer />
        <NotificationsStream />
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
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="kanban/task/:taskId" element={<TaskDetailsPage />} />
            <Route path="friends" element={<Friends />} />
            <Route path="notifications" element={<Notifications />} />
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
      </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
