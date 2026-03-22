import { Navigate } from "react-router-dom";
import { isAuthenticated, getCurrentUser } from "../../services/authService";

export function ProtectedRoute({ children, requiredRole }) {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole) {
        const user = getCurrentUser();
        if (!user || user.role !== requiredRole) {
            return <Navigate to="/main-page" replace />;
        }
    }
    return children;
}