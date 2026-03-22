import { Navigate } from "react-router-dom";
import { isAuthenticated, getCurrentUser } from "../../services/authService";

export function PublicRoute({ children, requiredRole }) {
    if (isAuthenticated()) {
        return <Navigate to="/main-page" replace />;
    }

    if (requiredRole) {
        const user = getCurrentUser();
        if (user) {
            return <Navigate to="/main-page" replace />;
        }
    }
    return children;
}