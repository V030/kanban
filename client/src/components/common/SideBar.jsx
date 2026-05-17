import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import normalizeProfileImage from "../../utils/normalizeProfileImage";
import { getCurrentUser, logout } from "../../services/authService";
import "../styles/SideBar.css";

function DashboardIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3h5A1.5 1.5 0 0 1 12 4.5v5A1.5 1.5 0 0 1 10.5 11h-5A1.5 1.5 0 0 1 4 9.5v-5Zm9 0A1.5 1.5 0 0 1 14.5 3h4A1.5 1.5 0 0 1 20 4.5v2A1.5 1.5 0 0 1 18.5 8h-4A1.5 1.5 0 0 1 13 6.5v-2ZM13 12.5A1.5 1.5 0 0 1 14.5 11h4A1.5 1.5 0 0 1 20 12.5v7A1.5 1.5 0 0 1 18.5 21h-4A1.5 1.5 0 0 1 13 19.5v-7ZM4 14.5A1.5 1.5 0 0 1 5.5 13h5A1.5 1.5 0 0 1 12 14.5v5A1.5 1.5 0 0 1 10.5 21h-5A1.5 1.5 0 0 1 4 19.5v-5Z" />
        </svg>
    );
}

function ProjectsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4.5 6A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h15A2.5 2.5 0 0 0 22 15.5v-6A2.5 2.5 0 0 0 19.5 7h-5.8l-1.32-1.32A2 2 0 0 0 11.96 5H4.5Z" />
        </svg>
    );
}



function TeamIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 11.5A3.5 3.5 0 1 0 8 4.5a3.5 3.5 0 0 0 0 7ZM17 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.5 18.5A5.5 5.5 0 0 1 8 13h.1c1.58 0 3.01.61 4.08 1.6A5.5 5.5 0 0 1 17 13h.1A5 5 0 0 1 22 18v.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-.5Z" />
        </svg>
    );
}

function TasksIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="7" r="1.6" />
            <rect x="8" y="6.2" width="11" height="1.6" rx="0.8" />
            <circle cx="5" cy="12" r="1.6" />
            <rect x="8" y="11.2" width="11" height="1.6" rx="0.8" />
            <circle cx="5" cy="17" r="1.6" />
            <rect x="8" y="16.2" width="8.5" height="1.6" rx="0.8" />
        </svg>
    );
}

function NotificationsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3a5 5 0 0 0-5 5v2.18c0 .7-.18 1.38-.52 1.98L5.4 14.7A1.5 1.5 0 0 0 6.7 17h10.6a1.5 1.5 0 0 0 1.3-2.3l-1.08-1.54c-.34-.6-.52-1.28-.52-1.98V8a5 5 0 0 0-5-5Zm0 18a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 21Z" />
        </svg>
    );
}

const navItems = [
    { to: "/main-page/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { to: "/main-page/projects", label: "Projects", icon: <ProjectsIcon /> },
    { to: "/main-page/friends", label: "Network", icon: <TeamIcon /> },
    { to: "/main-page/notifications", label: "Notifications", icon: <NotificationsIcon /> },
    { to: "/main-page/my-tasks", label: "My Tasks", icon: <TasksIcon /> },
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
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const displayName = getUserFullName(currentUser);
    const displayInitials = getUserInitials(currentUser);

        useEffect(() => {
            const user = getCurrentUser();
            setCurrentUser(user);
        }, []);

        // close dropdown when clicking outside
        useEffect(() => {
            function handleDocClick(e) {
                if (profileRef.current && !profileRef.current.contains(e.target)) {
                    setProfileOpen(false);
                }
            }
            document.addEventListener("mousedown", handleDocClick);
            return () => document.removeEventListener("mousedown", handleDocClick);
        }, []);

        function handleLogout() {
                logout();
                navigate("/login");
        }
    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="logo-mark" aria-hidden="true">Miru</div>
                <div>
                  <h2 className="logo">Miruban</h2>
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
                                        className={({ isActive }) => {
                                            // Keep Projects highlighted when user opens a project (which navigates to /main-page/kanban with project in state)
                                            if (item.to === "/main-page/projects") {
                                                const isProjectActive = location.pathname.startsWith("/main-page/projects") ||
                                                    (location.pathname === "/main-page/kanban" && location.state && location.state.project);
                                                return isProjectActive ? "nav-btn active" : "nav-btn";
                                            }
                                            return isActive ? "nav-btn active" : "nav-btn";
                                        }}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </nav>
            </div>

                        <div className="sidebar-bottom">
                            <div className="user-wrapper" ref={profileRef}>
                                <button
                                    type="button"
                                    className="user user-btn"
                                    onClick={() => setProfileOpen((v) => !v)}
                                    aria-label="Open profile menu"
                                >
                                    {(() => {
                                        const src = normalizeProfileImage(currentUser?.profileImageBase64 || currentUser?.profile_image_base64);
                                        return src ? (
                                            <img src={src} alt={displayName || "Profile"} className="avatar avatar-image" />
                                        ) : (
                                            <div className="avatar">{displayInitials || "U"}</div>
                                        );
                                    })()}

                                    <div className="meta">
                                        <div className="name">{displayName || "Guest"}</div>
                                        <div className="email">{currentUser?.email || "Not signed in"}</div>
                                    </div>
                                </button>

                                {profileOpen && (
                                    <div className="profile-dropdown" role="menu">
                                        <div className="profile-dropdown-card">
                                            <div className="dropdown-profile-row">
                                                {(() => {
                                                    const src = normalizeProfileImage(currentUser?.profileImageBase64 || currentUser?.profile_image_base64);
                                                    return src ? (
                                                        <img src={src} alt="Profile" className="avatar avatar-image" />
                                                    ) : (
                                                        <div className="avatar">{displayInitials || "U"}</div>
                                                    );
                                                })()}
                                                <div className="dropdown-meta">
                                                    <div className="name">{displayName || "Guest"}</div>
                                                    <div className="email">{currentUser?.email || "Not signed in"}</div>
                                                </div>
                                            </div>

                                            <div className="dropdown-list">
                                                <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate('/main-page/profile'); }}>Account</button>
                                                <button className="dropdown-item" onClick={() => { setProfileOpen(false); /* placeholder */ }}>Give feedback</button>
                                            </div>

                                            <div className="dropdown-actions">
                                                <button className="logout small" onClick={() => { setProfileOpen(false); handleLogout(); }}>Sign out</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
        </aside>
    );
}

