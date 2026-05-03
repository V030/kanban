import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getCurrentUser, logout } from "../../services/authService";
import "../styles/SideBar.css";

function DashboardIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="2" />
            <rect x="13" y="3" width="8" height="5" rx="2" />
            <rect x="13" y="10" width="8" height="11" rx="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
    );
}

function ProjectsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 7.5C3 6.67 3.67 6 4.5 6h6.6c.4 0 .78.16 1.06.44l1.4 1.4c.28.28.66.44 1.06.44h4.88c.83 0 1.5.67 1.5 1.5v7.72c0 .83-.67 1.5-1.5 1.5H4.5A1.5 1.5 0 0 1 3 17.5z" />
        </svg>
    );
}

function BoardIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 5h16" />
            <path d="M4 12h16" />
            <path d="M4 19h16" />
            <circle cx="7" cy="5" r="1" fill="currentColor" />
            <circle cx="7" cy="12" r="1" fill="currentColor" />
            <circle cx="7" cy="19" r="1" fill="currentColor" />
        </svg>
    );
}

function TeamIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="8" cy="9" r="3" />
            <path d="M2.5 18c.6-2.4 2.58-4 5.5-4 2.93 0 4.9 1.6 5.5 4" />
            <circle cx="17" cy="8" r="2" />
            <path d="M14.4 17c.45-1.45 1.57-2.5 3.55-2.95" />
        </svg>
    );
}

function TasksIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 7h11" />
            <path d="M9 12h11" />
            <path d="M9 17h11" />
            <path d="m4 7 1.5 1.5L7.5 6.5" />
            <path d="m4 12 1.5 1.5L7.5 11.5" />
            <path d="m4 17 1.5 1.5L7.5 16.5" />
        </svg>
    );
}

function SettingsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m12 3.5 1.8 1.1 2.2-.4.8 2 2 1-.5 2.2 1.2 1.7-1.2 1.7.5 2.2-2 1-.8 2-2.2-.4L12 20.5l-1.8-1.1-2.2.4-.8-2-2-1 .5-2.2-1.2-1.7 1.2-1.7-.5-2.2 2-1 .8-2 2.2.4z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

const navItems = [
    { to: "/main-page/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { to: "/main-page/projects", label: "Projects", icon: <ProjectsIcon /> },
    { to: "/main-page/kanban", label: "Boards", icon: <BoardIcon /> },
    { to: "/main-page/friends", label: "Connections", icon: <TeamIcon /> },
    { to: "/main-page/my-tasks", label: "My Tasks", icon: <TasksIcon /> },
    { to: "/main-page/profile", label: "Settings", icon: <SettingsIcon /> },
];

function getUserFullName(user) {
    if (!user) return "";
    const first = user.first_name || user.firstName || "";
    const last = user.last_name || user.lastName || "";
    const fullName = `${first} ${last}`.trim();
    return fullName || user.username || user.email || "";
}

function getUserInitials(user) {
    const fullName = getUserFullName(user);
    if (!fullName) return "";
    const parts = fullName.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function SideBar () {
    const [currentUser, setCurrentUser] = useState(false);
    const navigate = useNavigate();

    const displayName = getUserFullName(currentUser);
    const displayInitials = getUserInitials(currentUser);

    useEffect(() => {
      const user = getCurrentUser();
      setCurrentUser(user);
    }, []);

        function handleLogout() {
                logout();
                navigate("/login");
        }
    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="logo-mark" aria-hidden="true">TF</div>
                <div>
                  <h2 className="logo">TaskFlow</h2>
                  <p className="logo-subtitle">Project command center</p>
                </div>
            </div>

            <div className="sidebar-section">
              <p className="section-header">Workspace</p>
              <nav className="nav-list" aria-label="Primary">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => (isActive ? "nav-btn active" : "nav-btn")}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="sidebar-bottom">
              <div className="user">
                                <div className="avatar">{displayInitials || "U"}</div>
                <div className="meta">
                                    <div className="name">{displayName || "Guest"}</div>
                  <div className="email">{currentUser?.email || "Not signed in"}</div>
                </div>
              </div>
              <button className="logout" onClick={handleLogout}>Log Out</button>
            </div>
        </aside>
    );
}

