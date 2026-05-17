import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/styles/WorkspacePages.css";
import "../components/styles/NotificationsPage.css";

const initialNotifications = [
    {
        id: 1,
        category: "Projects",
        title: "Project invitation accepted",
        message: "A teammate accepted your invitation for the Atlas redesign workspace.",
        time: "2m ago",
        unread: true,
        tone: "success",
    },
    {
        id: 2,
        category: "Tasks",
        title: "Task moved to review",
        message: "The UI polish task was moved into review and is ready for feedback.",
        time: "18m ago",
        unread: true,
        tone: "info",
    },
    {
        id: 3,
        category: "Network",
        title: "New friend request",
        message: "Alex Chen sent you a new connection request.",
        time: "1h ago",
        unread: false,
        tone: "warning",
    },
    {
        id: 4,
        category: "Mentions",
        title: "You were mentioned in a comment",
        message: "Maya tagged you in the sprint planning discussion on the Kanban board.",
        time: "Yesterday",
        unread: false,
        tone: "neutral",
    },
];

const filters = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "projects", label: "Projects" },
];

function Notifications() {
    const navigate = useNavigate();
    const [activeFilter, setActiveFilter] = useState("all");
    const [notifications, setNotifications] = useState(initialNotifications);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => notification.unread).length,
        [notifications]
    );

    const projectCount = useMemo(
        () => notifications.filter((notification) => notification.category === "Projects").length,
        [notifications]
    );

    const filteredNotifications = useMemo(() => {
        if (activeFilter === "unread") {
            return notifications.filter((notification) => notification.unread);
        }

        if (activeFilter === "projects") {
            return notifications.filter((notification) => notification.category === "Projects");
        }

        return notifications;
    }, [activeFilter, notifications]);

    const stats = useMemo(() => ([
        {
            label: "Unread",
            value: unreadCount,
            caption: "Notifications waiting for review",
        },
        {
            label: "Projects",
            value: projectCount,
            caption: "Project-related updates",
        },
        {
            label: "Visible",
            value: filteredNotifications.length,
            caption: "Messages in the current view",
        },
    ]), [filteredNotifications.length, projectCount, unreadCount]);

    const markAllAsRead = () => {
        setNotifications((current) => current.map((notification) => ({
            ...notification,
            unread: false,
        })));
    };

    const toggleReadState = (id) => {
        setNotifications((current) => current.map((notification) => (
            notification.id === id
                ? { ...notification, unread: !notification.unread }
                : notification
        )));
    };

    return (
        <section className="page-shell notifications-page">
            <header className="workspace-hero">
                <div className="workspace-hero-content notifications-hero-content">
                    <div>
                        <h1 className="page-title">Notifications</h1>
                        <p className="page-subtitle">
                            Track project activity, mentions, and workspace updates without leaving the app shell.
                        </p>
                    </div>

                    <div className="notifications-header-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate("/main-page/projects")}
                        >
                            Open Projects
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            Mark All Read
                        </button>
                    </div>
                </div>
            </header>

            <section className="notifications-stats" aria-label="Notification summary">
                {stats.map((stat) => (
                    <article className="stat-card" key={stat.label}>
                        <p className="stat-label">{stat.label}</p>
                        <p className="stat-value">{stat.value}</p>
                        <p className="stat-caption">{stat.caption}</p>
                    </article>
                ))}
            </section>

            <section className="project-section notifications-panel">
                <div className="section-heading">
                    <h2>Inbox</h2>
                    <p>{filteredNotifications.length} shown</p>
                </div>

                <div className="notifications-tabs" role="tablist" aria-label="Notification filters">
                    {filters.map((filter) => {
                        const count = filter.key === "unread"
                            ? unreadCount
                            : filter.key === "projects"
                                ? projectCount
                                : notifications.length;

                        return (
                            <button
                                key={filter.key}
                                type="button"
                                className={`notifications-tab ${activeFilter === filter.key ? "active" : ""}`}
                                onClick={() => setActiveFilter(filter.key)}
                            >
                                <span>{filter.label}</span>
                                <span className="notifications-tab-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {filteredNotifications.length === 0 ? (
                    <div className="empty-state-card">
                        <h3>No notifications in this view</h3>
                        <p>Try switching filters or mark all messages as read to clear the inbox.</p>
                    </div>
                ) : (
                    <div className="notification-list">
                        {filteredNotifications.map((notification) => (
                            <article
                                key={notification.id}
                                className={`notification-item ${notification.unread ? "unread" : "read"}`}
                            >
                                <div className={`notification-icon notification-icon-${notification.tone}`} aria-hidden="true">
                                    <span />
                                </div>

                                <div className="notification-body">
                                    <div className="notification-topline">
                                        <span className="notification-category">{notification.category}</span>
                                        <span className="notification-time">{notification.time}</span>
                                    </div>

                                    <h3 className="notification-title">{notification.title}</h3>
                                    <p className="notification-message">{notification.message}</p>
                                </div>

                                <div className="notification-actions">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => toggleReadState(notification.id)}
                                    >
                                        {notification.unread ? "Mark read" : "Mark unread"}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}

export default Notifications;