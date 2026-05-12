import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import normalizeProfileImage from "../../utils/normalizeProfileImage";
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

const navItems = [
    { to: "/main-page/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { to: "/main-page/projects", label: "Projects", icon: <ProjectsIcon /> },
    { to: "/main-page/friends", label: "Connections", icon: <TeamIcon /> },
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

                            <button className="logout" onClick={handleLogout}>Log Out</button>
                        </div>
        </aside>
    );
}

