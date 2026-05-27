import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "../services/authService";
import { getFriends } from "../services/friendService";
import { getNotifications } from "../services/notificationService";
import {
    getMemberProjects,
    getProjectInvitations,
    getProjects,
    getMyTasks,
} from "../services/projectService";
import { useToast } from "../hooks/useToast";
import HeroActionButton from "../components/common/HeroActionButton";
import { CalendarIcon, FolderIcon, NotificationsIcon, RefreshIcon, TeamIcon } from "../components/common/AppIcons";

import {
    SkeletonCard,
    SkeletonRow,
} from "../components/common/SkeletonComponents";
import normalizeProfileImage from "../utils/normalizeProfileImage";

import "../components/styles/WorkspacePages.css";
import "../components/styles/DashboardTheme.css";
import "../components/styles/SkeletonLoading.css";

function buildAvatarColor(seed = "") {
    let hash = 0;
    const text = String(seed || "").trim().toLowerCase();

    for (let index = 0; index < text.length; index += 1) {
        hash = (hash * 31 + text.charCodeAt(index)) % 360;
    }

    return `hsl(${hash}, 72%, 42%)`;
}

function getInitials(name = "") {
    return String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "?";
}

function getProfileImageSrc(...sources) {
    for (const source of sources) {
        const normalized = normalizeProfileImage(
            source?.profileImageBase64 ||
            source?.profile_image_base64 ||
            source?.avatar ||
            source?.avatarUrl ||
            source?.imageUrl ||
            source?.profileImage ||
            source?.profilePictureUrl ||
            source?.picture ||
            source?.photoUrl ||
            source?.photo
        );

        if (normalized) {
            return normalized;
        }
    }

    return null;
}

function formatRelativeTime(value) {
    const timestamp = new Date(value || 0).getTime();
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return "Just now";
    }

    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.max(1, Math.round(diffMinutes / 60));
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.max(1, Math.round(diffHours / 24));
    return `${diffDays}d ago`;
}

function formatDueDate(value) {
    if (!value) return "No due date";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "No due date";

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    }).format(date);
}

function getDueTone(value) {
    if (!value) return "muted";

    const dueDate = new Date(value);
    if (Number.isNaN(dueDate.getTime())) return "muted";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    if (dueDate < startOfToday) return "urgent";
    if (dueDate < startOfTomorrow) return "warning";
    return "muted";
}

function formatStatusLabel(status = "todo") {
    return String(status || "todo")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusTone(status = "todo") {
    const normalized = String(status || "todo").toLowerCase();
    if (normalized === "blocked") return "blocked";
    if (normalized === "in_review") return "in_review";
    if (normalized === "in_progress") return "in_progress";
    return "todo";
}

function getTaskSortRank(task) {
    const status = String(task?.status || "todo").toLowerCase();
    const priority = String(task?.priority || "").toLowerCase();
    const parsedDueDate = task?.dueDate ? new Date(task.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const dueDate = Number.isFinite(parsedDueDate) ? parsedDueDate : Number.POSITIVE_INFINITY;

    const statusRank = {
        blocked: 4,
        in_review: 3,
        in_progress: 2,
        todo: 1,
    }[status] || 1;

    const priorityRank = {
        urgent: 4,
        high: 3,
        medium: 2,
        low: 1,
        unset: 0,
    }[priority] || 0;

    return {
        statusRank,
        priorityRank,
        dueDate,
    };
}

function normalizeActivityItem(notification) {
    const message = String(notification?.message || "").trim();
    const type = String(notification?.type || "").toLowerCase();
    const payload = notification?.payload && typeof notification.payload === "object" ? notification.payload : {};
    const timestamp = notification?.created_at || notification?.createdAt || notification?.updated_at || notification?.updatedAt || Date.now();

    const actionTextMap = {
        task_assigned: "assigned a task",
        task_unassigned: "removed a task",
        task_status_changed: "updated a task",
        review_approved: "approved a review",
        review_rejected: "rejected a review",
        task_comment: "commented on a task",
        task_comment_reply: "replied to a comment",
    };

    const actionText = actionTextMap[type] || "updated activity";
    const actorMatch = message.match(/^(.+?)\s+(?:assigned you to|unassigned you from|moved|approved|rejected|commented on|replied on)\b/i);
    const projectMatch = message.match(/\bin\s+(.+?)(?:[:.])\s*$/i) || message.match(/\bin\s+(.+?)\s*$/i);
    const userName = actorMatch?.[1]?.trim() || message.split(" ").slice(0, 2).join(" ") || "Someone";
    const projectName = projectMatch?.[1]?.trim() || "Project";
    const avatarSrc = getProfileImageSrc(
        notification,
        payload,
        payload?.actor,
        payload?.user,
        payload?.requester,
        payload?.inviter,
        payload?.recipient
    );

    return {
        id: notification?.id,
        user: {
            name: userName,
            avatarInitials: getInitials(userName),
            color: buildAvatarColor(userName),
            avatarSrc,
        },
        actionText,
        projectName,
        timestamp,
        progress: notification?.progress || null,
    };
}

function normalizePriorityTask(task, fallbackUser = null) {
    const assignee = Array.isArray(task?.assignees) && task.assignees.length > 0
        ? task.assignees[0]
        : task?.creator || fallbackUser || null;

    const assigneeName = [assignee?.firstName, assignee?.lastName].filter(Boolean).join(" ").trim()
        || assignee?.displayName
        || assignee?.name
        || "You";

    return {
        id: task?.id,
        title: task?.title || "Untitled task",
        status: String(task?.statusKey || task?.status?.name || task?.status || "todo").toLowerCase(),
        projectName: task?.projectName || task?.project?.name || "Project",
        dueDate: task?.targetDate || task?.dueDate || null,
        priority: String(task?.priority || "").toLowerCase(),
        assignee: {
            name: assigneeName,
            avatarInitials: getInitials(assigneeName),
            color: buildAvatarColor(assigneeName),
        },
    };
}

function DashboardItemAvatar({ name, initials, color, src = null, size = 30 }) {
    return (
        <span
            className="dashboard-avatar"
            style={{ background: color, width: size, height: size, minWidth: size, minHeight: size }}
            aria-hidden="true"
        >
            {src ? <img src={src} alt="" /> : (initials || getInitials(name))}
        </span>
    );
}

function DashboardPanelHeader({ title, actionLabel, onAction }) {
    return (
        <div className="panel-heading dashboard-panel-heading">
            <h3>{title}</h3>
            <button type="button" className="btn btn-ghost dashboard-panel-action" onClick={onAction}>
                {actionLabel}
            </button>
        </div>
    );
}

function ActivityProgress({ progress, accentColor }) {
    if (!progress || progress.percent == null) return null;

    const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0));
    const remainingTasks = Number(progress.remainingTasks || 0);

    return (
        <div className="dashboard-progress-wrap">
            <div className="dashboard-progress-track" aria-hidden="true">
                <div className="dashboard-progress-fill" style={{ width: `${percent}%`, background: accentColor }} />
            </div>
            <p className="dashboard-progress-text">
                {percent}% complete · {remainingTasks} tasks remaining
            </p>
        </div>
    );
}

function DashboardActivityCard({ activity }) {
    return (
        <article className="dashboard-activity-card">
            <DashboardItemAvatar
                name={activity.user.name}
                initials={activity.user.avatarInitials}
                color={activity.user.color}
                src={activity.user.avatarSrc}
                size={30}
            />
            <div className="dashboard-activity-copy">
                <p className="dashboard-activity-title">
                    <strong>{activity.user.name}</strong> {activity.actionText}
                </p>
                <p className="dashboard-activity-meta">
                    {activity.projectName} · {formatRelativeTime(activity.timestamp)}
                </p>
                <ActivityProgress progress={activity.progress} accentColor={activity.user.color} />
            </div>
        </article>
    );
}

function DashboardTaskCard({ task }) {
    const tone = getStatusTone(task.status);
    const dueTone = getDueTone(task.dueDate);
    const dueLabel = formatDueDate(task.dueDate);

    return (
        <article className="dashboard-task-card">
            <span className="dashboard-task-checkbox" aria-hidden="true" />
            <div className="dashboard-task-copy">
                <p className="dashboard-task-title">{task.title}</p>
                <div className="dashboard-task-meta-row">
                    <span className={`pill dashboard-task-status ${tone}`}>{formatStatusLabel(task.status)}</span>
                    <span className="dashboard-task-project-tag">{task.projectName}</span>
                    <span className={`dashboard-task-due dashboard-task-due--${dueTone}`}>
                        <CalendarIcon size={14} />
                        <span>{dueLabel}</span>
                    </span>
                </div>
            </div>
            <DashboardItemAvatar
                name={task.assignee.name}
                initials={task.assignee.avatarInitials}
                color={task.assignee.color}
            />
        </article>
    );
}

function Dashboard() {
    const navigate = useNavigate();
    const toast = useToast();

    const currentUser = useMemo(() => getCurrentUser(), []);
    const currentUserDisplay = useMemo(() => {
        const firstName = currentUser?.firstName || currentUser?.first_name || "";
        const lastName = currentUser?.lastName || currentUser?.last_name || "";
        const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "You";

        return {
            name,
            initials: getInitials(name),
            color: buildAvatarColor(name),
        };
    }, [currentUser]);

    const [loading, setLoading] = useState(true);

    const [ownedProjects, setOwnedProjects] = useState([]);
    const [memberProjects, setMemberProjects] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [priorityTasks, setPriorityTasks] = useState([]);

    const [friendCount, setFriendCount] = useState(0);
    const [inviteCount, setInviteCount] = useState(0);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setRecentActivity([]);
        setPriorityTasks([]);

        try {
            const [owned, member, friends, invites] = await Promise.all([
                getProjects(),
                getMemberProjects(),
                getFriends(),
                getProjectInvitations(),
            ]);

            const [activityResult, tasksResult] = await Promise.allSettled([
                getNotifications(20),
                getMyTasks(20),
            ]);

            setOwnedProjects(owned.projects || []);
            setMemberProjects(member.projects || []);

            setFriendCount((friends.friends || []).length);
            setInviteCount((invites.projectInvitations || []).length);

            const activityItems = activityResult.status === "fulfilled"
                ? (activityResult.value?.notifications || [])
                    .map(normalizeActivityItem)
                    .filter((item) => {
                        const timestamp = new Date(item.timestamp || 0).getTime();
                        const hoursAgo = 1000 * 60 * 60 * 24;
                        return Number.isFinite(timestamp) && (Date.now() - timestamp) <= hoursAgo;
                    })
                    .slice(0, 4)
                : [];

            const taskItems = tasksResult.status === "fulfilled"
                ? (tasksResult.value?.tasks || [])
                    .map((task) => normalizePriorityTask(task, currentUserDisplay))
                    .sort((left, right) => {
                        const leftRank = getTaskSortRank(left);
                        const rightRank = getTaskSortRank(right);

                        if (rightRank.statusRank !== leftRank.statusRank) {
                            return rightRank.statusRank - leftRank.statusRank;
                        }

                        if (rightRank.priorityRank !== leftRank.priorityRank) {
                            return rightRank.priorityRank - leftRank.priorityRank;
                        }

                        return leftRank.dueDate - rightRank.dueDate;
                    })
                    .slice(0, 5)
                : [];

            setRecentActivity(activityItems);
            setPriorityTasks(taskItems);
        } catch (requestError) {
            toast.showError(
                requestError?.message ||
                    "Unable to load dashboard data."
            );
        } finally {
            setLoading(false);
        }
    }, [currentUserDisplay, toast]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const allProjects = [
        ...ownedProjects,
        ...memberProjects,
    ];

    const greetingName =
        `${currentUser?.firstName || currentUser?.first_name || ""}
        `.trim() || "";

    const totalProjects =
        ownedProjects.length + memberProjects.length;

    return (
        <section className="page-shell dashboard-page">

            {/* HERO */}
            <header className="dashboard-hero">

                <div className="dashboard-hero-content">

                    <div className="dashboard-hero-copy">
                        <h1 className="dashboard-hero-title">
                            Hey there, <span className="greeting-name">{greetingName}!</span>
                        </h1>

                        <p className="dashboard-hero-subtitle">
                            <strong>{totalProjects}</strong> active projects currently visible across your workspace. Maintain clarity with concise task naming, structured ownership, and focused workflow states.
                        </p>
                    </div>

                    <div className="dashboard-hero-actions">

                        <HeroActionButton
                            icon={<RefreshIcon />}
                            label="Refresh"
                            variant="secondary"
                            onClick={loadDashboard}
                            title="Refresh dashboard"
                        />

                        <HeroActionButton
                            icon={<FolderIcon />}
                            label="Projects"
                            variant="secondary"
                            onClick={() => navigate("/main-page/projects")}
                            title="Open projects hub"
                        />

                    </div>

                </div>

                <div className="dashboard-hero-glow" />

            </header>

            {/* STATS */}
            <section
                className="dashboard-stats"
                aria-live="polite"
            >

                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <article className="stat-card">
                            <div className="stat-icon">
                                <FolderIcon />
                            </div>

                            <p className="stat-label">
                                Owned Projects
                            </p>

                            <p className="stat-value">
                                {ownedProjects.length}
                            </p>

                            <p className="stat-caption">
                                Your active project workspaces
                            </p>

                        </article>

                        <article className="stat-card">
                            <div className="stat-icon">
                                <TeamIcon />
                            </div>

                            <p className="stat-label">
                                Shared Projects
                            </p>

                            <p className="stat-value">
                                {memberProjects.length}
                            </p>

                            <p className="stat-caption">
                                Boards where you collaborate
                            </p>

                        </article>

                        <article className="stat-card">
                            <div className="stat-icon">
                                <NotificationsIcon />
                            </div>

                            <p className="stat-label">
                                Pending Invites
                            </p>

                            <p className="stat-value">
                                {inviteCount}
                            </p>

                            <p className="stat-caption">
                                Awaiting your response
                            </p>

                        </article>

                        <article className="stat-card">
                            <div className="stat-icon">
                                <TeamIcon />
                            </div>

                            <p className="stat-label">
                                Connections
                            </p>

                            <p className="stat-value">
                                {friendCount}
                            </p>

                            <p className="stat-caption">
                                Team members in your network
                            </p>

                        </article>
                    </>
                )}

            </section>

            {/* MAIN GRID */}
            <section className="dashboard-grid">

                {/* RECENT ACTIVITY */}
                <article className="dashboard-panel dashboard-panel--activity">

                    <DashboardPanelHeader
                        title="Recent activity"
                        actionLabel="View all"
                        onAction={() => navigate("/main-page/notifications")}
                    />

                    <div className="dashboard-panel-body">
                        {loading ? (
                            <div className="skeleton-list dashboard-panel-skeleton-list">
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                            </div>
                        ) : recentActivity.length > 0 ? (
                            <div className="dashboard-activity-list">
                                {recentActivity.map((activity) => (
                                    <DashboardActivityCard key={activity.id} activity={activity} />
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-panel-empty">
                                <h4>No recent activity</h4>
                                <p>Nothing has changed across your workspace in the last 24 hours.</p>
                            </div>
                        )}
                    </div>

                    <div className="dashboard-panel-footer">
                        Updates from the last 24 hours across all {allProjects.length} projects
                    </div>

                </article>

                {/* MY PRIORITY TASKS */}
                <article className="dashboard-panel dashboard-panel--tasks">

                    <DashboardPanelHeader
                        title="My priority tasks"
                        actionLabel="View all"
                        onAction={() => navigate("/main-page/my-tasks")}
                    />

                    <div className="dashboard-panel-body">
                        {loading ? (
                            <div className="skeleton-list dashboard-panel-skeleton-list">
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                                <SkeletonRow showAvatar lineCount={2} />
                            </div>
                        ) : priorityTasks.length > 0 ? (
                            <div className="dashboard-task-list">
                                {priorityTasks.map((task) => (
                                    <DashboardTaskCard key={task.id} task={task} />
                                ))}
                            </div>
                        ) : (
                            <div className="dashboard-panel-empty">
                                <h4>No priority tasks</h4>
                                <p>Tasks assigned to you will appear here when they need attention.</p>
                            </div>
                        )}
                    </div>

                </article>

            </section>

        </section>
    );
}

export default Dashboard;