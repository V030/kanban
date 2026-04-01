import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser } from "../../services/authService";
import "../styles/SideBar.css";

export default function SideBar () {
    const [currentUser, setCurrentUser] = useState(false);

    useEffect(() => {
      const user = getCurrentUser();
      setCurrentUser(user);
    }, []);
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
                <div className="avatar">J</div>
                <span>{currentUser?.email}</span>
                </div>
                <button className="logout">Logout</button>
            </div>
        </div>
    );
}

