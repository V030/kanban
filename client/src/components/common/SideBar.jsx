import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import normalizeProfileImage from "../../utils/normalizeProfileImage";
import { getCurrentUser, logout } from "../../services/authService";
import { getUnreadNotificationsCount } from "../../services/notificationService";
import { DashboardIcon, FolderIcon, TeamIcon, TasksIcon, NotificationsIcon, SendIcon } from "./AppIcons";
import "../styles/SideBar.css";

const navItems = [
    { to: "/main-page/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { to: "/main-page/projects", label: "Projects", icon: <FolderIcon /> },
    { to: "/main-page/friends", label: "Network", icon: <TeamIcon /> },
    { to: "/main-page/notifications", label: "Notifications", icon: <NotificationsIcon /> },
    { to: "/main-page/my-tasks", label: "My Tasks", icon: <TasksIcon /> },
    { to: "/main-page/feedback", label: "Feedback", icon: <SendIcon /> },
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
    const [unreadCount, setUnreadCount] = useState(0);
    const [imageError, setImageError] = useState(false);
    const profileRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    const displayName = getUserFullName(currentUser);
    const displayInitials = getUserInitials(currentUser);

        useEffect(() => {
            const user = getCurrentUser();
            setCurrentUser(user);
        }, []);

        const refreshUnreadCount = useCallback(async () => {
            try {
                const data = await getUnreadNotificationsCount();
                const nextCount = Number(data?.count ?? data?.unreadCount ?? 0);
                setUnreadCount(Number.isFinite(nextCount) ? nextCount : 0);
            } catch (error) {
                setUnreadCount(0);
            }
        }, []);

        useEffect(() => {
            refreshUnreadCount();
            const intervalId = setInterval(refreshUnreadCount, 30000);
            return () => clearInterval(intervalId);
        }, [refreshUnreadCount]);

        useEffect(() => {
            const handleNotificationsUpdated = () => {
                refreshUnreadCount();
            };

            window.addEventListener("notifications:updated", handleNotificationsUpdated);
            return () => window.removeEventListener("notifications:updated", handleNotificationsUpdated);
        }, [refreshUnreadCount]);

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
                                            // Keep Projects highlighted when user opens a project (which navigates to /main-page/projects/:projectId/kanban)
                                            if (item.to === "/main-page/projects") {
                                                const isProjectActive = location.pathname.startsWith("/main-page/projects");
                                                return isProjectActive ? "nav-btn active" : "nav-btn";
                                            }
                                            return isActive ? "nav-btn active" : "nav-btn";
                                        }}
                                    >
                                        <span className="nav-icon">{item.icon}</span>
                                        <span className="nav-label">
                                            {item.label}
                                            {item.to === "/main-page/notifications" && unreadCount > 0 && (
                                                <span className="nav-notification-dot" aria-label="Unread notifications" />
                                            )}
                                        </span>
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
                                        return src && !imageError ? (
                                            <img 
                                                src={src} 
                                                alt={displayName || "Profile"} 
                                                className="avatar avatar-image"
                                                onError={() => setImageError(true)}
                                            />
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
                                                    return src && !imageError ? (
                                                        <img 
                                                            src={src} 
                                                            alt="Profile" 
                                                            className="avatar avatar-image"
                                                            onError={() => setImageError(true)}
                                                        />
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
                                                <button className="dropdown-item" onClick={() => { setProfileOpen(false); navigate('/main-page/feedback'); }}>Give feedback</button>
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

