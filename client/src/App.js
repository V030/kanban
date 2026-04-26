import './App.css';

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { isAuthenticated } from './services/authService';

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Friends from "./pages/Friends";
import KanbanPage from "./pages/KanbanPage";
import MyTasks from "./pages/MyTasks";
import Profile from "./pages/Profile";
import { ProtectedRoute } from './components/protected/ProtectedRoutes';
import { PublicRoute } from './components/public/PublicRoutes';


function App() {
  const auth = isAuthenticated();

  return (
    <BrowserRouter>
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

          <Route path="/main-page" element={
            <ProtectedRoute>
              <MainPage/>
            </ProtectedRoute>
            
          }>
          
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="friends" element={<Friends />} />
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
  );
}

export default App;
