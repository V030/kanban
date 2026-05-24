import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../services/notificationService";
import { NotificationIcon } from "../components/common/NotificationIcons";
import "../components/styles/WorkspacePages.css";
import "../components/styles/NotificationsPage.css";

const filters = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "projects", label: "Projects" },
];

const notificationTypeMeta = {
    project_invitation: { category: "Projects", title: "Project invitation", tone: "info" },
    project_invitation_accepted: { category: "Projects", title: "Invitation accepted", tone: "success" },
    task_assigned: { category: "Tasks", title: "Task assigned", tone: "info" },
    task_unassigned: { category: "Tasks", title: "Task unassigned", tone: "warning" },
    task_status_changed: { category: "Tasks", title: "Task status updated", tone: "info" },
    review_approved: { category: "Reviews", title: "Review approved", tone: "success" },
    review_rejected: { category: "Reviews", title: "Review rejected", tone: "warning" },
    task_comment: { category: "Tasks", title: "New task comment", tone: "neutral" },
    task_comment_reply: { category: "Tasks", title: "New comment reply", tone: "neutral" },
    friend_request: { category: "Network", title: "New friend request", tone: "warning" },
    friend_request_accepted: { category: "Network", title: "Friend request accepted", tone: "success" },
};

function formatTimeAgo(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const diffMs = Date.now() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalizeNotification(notification) {
    const typeKey = String(notification?.type || "").toLowerCase();
    const meta = notificationTypeMeta[typeKey] || { category: "Updates", title: "Notification", tone: "neutral" };
    const payload = notification?.payload && typeof notification.payload === "object" ? notification.payload : {};
    const rawUrl = String(notification?.url || "").trim();
    const taskId = payload?.taskId ?? payload?.task_id;
    const projectId = payload?.projectId ?? payload?.project_id;
    const normalizedUrl = rawUrl.startsWith("/main-page/kanban/task/") && projectId && taskId
        ? `/main-page/projects/${projectId}/kanban/tasks/${taskId}`
        : rawUrl;

    return {
        id: notification?.id,
        type: typeKey,
        category: meta.category,
        title: meta.title,
        message: notification?.message || "",
        time: formatTimeAgo(notification?.created_at || notification?.createdAt),
        unread: String(notification?.status || "unread").toLowerCase() !== "read",
        tone: meta.tone,
        url: normalizedUrl,
        payload,
    };
}

function getNotificationTargetUrl(notification) {
    if (!notification) return "";

    if (notification.url) {
        return notification.url;
    }

    const taskId = notification?.payload?.taskId ?? notification?.payload?.task_id;
    const projectId = notification?.payload?.projectId ?? notification?.payload?.project_id;

    if (taskId && projectId) {
        return `/main-page/projects/${projectId}/kanban/tasks/${taskId}`;
    }

    return "";
}

function Notifications() {
    const navigate = useNavigate();
    const toast = useToast();
    const [activeFilter, setActiveFilter] = useState("all");
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const notificationsRef = useRef([]);

    const loadNotifications = useCallback(async (options = {}) => {
        const silent = options.silent === true;
        if (!silent) {
            setLoading(true);
        }
        try {
            const data = await getNotifications();
            const rows = Array.isArray(data?.notifications) ? data.notifications : [];
            setNotifications(rows.map(normalizeNotification));
            window.dispatchEvent(new Event("notifications:updated"));
        } catch (error) {
            toast.showError(error?.message || "Unable to load notifications.");
            setNotifications([]);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [toast]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        notificationsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        const handlePush = (event) => {
            const incoming = normalizeNotification(event?.detail);
            if (!incoming?.id) return;
            setNotifications((current) => {
                const exists = current.some((notification) => notification.id === incoming.id);
                if (exists) {
                    return current.map((notification) =>
                        notification.id === incoming.id ? { ...notification, ...incoming } : notification
                    );
                }
                return [incoming, ...current];
            });
        };

        window.addEventListener("notifications:push", handlePush);
        return () => window.removeEventListener("notifications:push", handlePush);
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            loadNotifications({ silent: true });
        }, 60000);

        return () => clearInterval(intervalId);
    }, [loadNotifications]);

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

    const markAllAsRead = () => {
        (async () => {
            try {
                await markAllNotificationsRead();
                setNotifications((current) => current.map((notification) => ({
                    ...notification,
                    unread: false,
                })));
                window.dispatchEvent(new Event("notifications:updated"));
            } catch (error) {
                toast.showError(error?.message || "Unable to mark notifications as read.");
            }
        })();
    };

    useEffect(() => {
        return () => {
            const hasUnreadNotifications = notificationsRef.current.some((notification) => notification.unread);
            if (!hasUnreadNotifications) return;

            (async () => {
                try {
                    await markAllNotificationsRead();
                    window.dispatchEvent(new Event("notifications:updated"));
                } catch (error) {
                    /* leave unread state intact if bulk mark fails */
                }
            })();
        };
    }, []);

    const markRead = useCallback(async (id) => {
        if (!id) return;
        try {
            await markNotificationRead(id);
            setNotifications((current) => current.map((notification) => (
                notification.id === id
                    ? { ...notification, unread: false }
                    : notification
            )));
            window.dispatchEvent(new Event("notifications:updated"));
        } catch (error) {
            toast.showError(error?.message || "Unable to update notification.");
        }
    }, [toast]);

    const handleOpenNotification = useCallback(async (notification) => {
        const targetUrl = getNotificationTargetUrl(notification);
        if (!targetUrl) return;
        if (notification.unread) {
            await markRead(notification.id);
        }
        navigate(targetUrl);
    }, [markRead, navigate]);

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

            <section className="project-section notifications-panel">

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

                {loading ? (
                    <div className="empty-state-card">
                        <h3>Loading notifications</h3>
                        <p>Fetching the latest updates from your workspace.</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
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
                                onClick={() => handleOpenNotification(notification)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        handleOpenNotification(notification);
                                    }
                                }}
                                tabIndex={0}
                            >
                                <div className={`notification-icon notification-icon-${notification.tone || 'neutral'}`} aria-hidden="true">
                                    <NotificationIcon type={notification.type} className="notification-icon-svg" size={20} />
                                </div>

                                <div className="notification-body">
                                    <div className="notification-topline">
                                        {/* <span className="notification-category">{notification.category}</span> */}
                                    </div>

                                    <h3 className="notification-title">{notification.title}</h3>
                                    <p className="notification-message">{notification.message}</p>
                                    <p className="notification-time">{notification.time}</p>
                                </div>

                                <div className="notification-actions">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            markRead(notification.id);
                                        }}
                                        disabled={!notification.unread}
                                    >
                                        Mark read
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