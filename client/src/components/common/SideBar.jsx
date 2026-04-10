import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser, logout } from "../../services/authService";
import "../styles/SideBar.css";

export default function SideBar () {
    const [currentUser, setCurrentUser] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
      const user = getCurrentUser();
      setCurrentUser(user);
    }, []);

        function handleLogout() {
                logout();
                navigate("/login");
        }
    return (
        <div className="sidebar">
            <div className="sidebar-top">
                <h2 className="logo">TaskFlow</h2>
            </div>

            {/* main navigation */}
            <div className="sidebar-section">
                {/* <button className="nav-btn"> Dashboard</button>
                <button className="nav-btn"> Projects</button>
                <button className="nav-btn"> My Tasks</button>
                <button className="nav-btn"> Settings</button> */}
                <NavLink 
                    to="/main-page/dashboard" 
                    end 
                    className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}
                >
                    Dashboard
                </NavLink>

                <NavLink 
                    to="/main-page/projects" 
                    className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}
                >
                    Projects
                </NavLink>

                <NavLink 
                    to="/main-page/friends" 
                    className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}
                >
                    Friends
                </NavLink>

                {/* Assuming this maps to MyTasks in the future */}
                <NavLink 
                    to="/main-page/my-tasks" 
                    className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}
                >
                    My Tasks
                </NavLink>

                <NavLink 
                    to="/main-page/profile" 
                    className={({ isActive }) => isActive ? "nav-btn active" : "nav-btn"}
                >
                    Settings
                </NavLink>
            </div>

            {/* bottom */}
            <div className="sidebar-bottom">
                        <div className="user">
                                <div className="avatar">{(currentUser?.first_name || "").charAt(0).toUpperCase() || "J"}</div>
                                <div className="meta">
                                    <div className="name">{currentUser ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() : "Guest"}</div>
                                    <div className="email">{currentUser?.email}</div>
                                </div>
                        </div>
                        <button className="logout" onClick={handleLogout}>Logout</button>
            </div>
        </div>
    );
}

