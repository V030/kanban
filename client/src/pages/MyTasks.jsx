import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyTasks } from "../services/projectService";
import { getCurrentUser, hydrateUserFromToken } from "../services/authService";
import "../components/styles/WorkspacePages.css";
import normalizeProfileImage from "../utils/normalizeProfileImage";

function normalizeTask(task) {
    const statusName = task?.status?.name || task?.statusName || task?.columnName || task?.categoryName || task?.status || "Todo";
    const statusKey = String(task?.status?.id || task?.categoryId || statusName || "todo").toLowerCase().replace(/\s+/g, "_");

    return {
        ...task,
        statusName,
        statusKey,
        project: task?.project || (task?.projectId ? { id: task.projectId, name: task.projectName, owner: task.projectOwner } : null),
    };
}

function formatStatus(name) {
    if (!name && name !== 0) return "";
    return String(name).replace(/_/g, " ").toUpperCase();
}

function getCurrentUserDisplay(user) {
    if (!user) {
        return { name: "You", initials: "", avatar: "" };
    }

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    const initialsSource = fullName || user?.email || "You";
    const initials = (initialsSource || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0])
        .join("")
        .toUpperCase();

    return {
        name: "You",
        initials,
        avatar: normalizeProfileImage(user?.profileImageBase64 || user?.profile_image_base64 || ""),
    };
}

/** Map a status name to a pill variant class */
function statusPillClass(statusName) {
    const key = String(statusName || "").toLowerCase().replace(/\s+/g, "_");
    if (key === "done" || key === "completed") return "done";
    if (key === "in_progress" || key === "in progress") return "in_progress";
    if (key === "todo" || key === "to_do") return "todo";
    if (key === "to_review" || key === "review") return "pending";
    return "todo";
}

function MyTasks() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const data = await getMyTasks();
            const rawTasks = Array.isArray(data?.tasks) ? data.tasks : [];
            setTasks(rawTasks.map(normalizeTask));
        } catch (requestError) {
            setError(requestError?.message || "Unable to load assigned tasks.");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    useEffect(() => {
        let isMounted = true;

        if (!currentUser) {
            hydrateUserFromToken().then((user) => {
                if (!isMounted) return;
                if (user) setCurrentUser(user);
            }).catch(() => {});
        }

        return () => { isMounted = false; };
    }, [currentUser]);

    const currentUserDisplay = useMemo(() => getCurrentUserDisplay(currentUser), [currentUser]);

    const groupedProjects = useMemo(() => {
        const projectMap = new Map();

        tasks.forEach((task) => {
            const project = task?.project || {};
            const projectId = String(project?.id || task?.projectId || "unknown");
            const projectName = project?.name || task?.projectName || "Unknown project";
            const projectOwner = project?.owner || task?.projectOwner || null;
            const statusId = String(task?.status?.id || task?.categoryId || task?.statusKey || task?.statusName || "unknown");
            const statusName = task?.status?.name || task?.statusName || "Todo";
            const statusPosition = Number.isFinite(Number(task?.status?.position)) ? Number(task.status.position) : Number.MAX_SAFE_INTEGER;

            if (!projectMap.has(projectId)) {
                projectMap.set(projectId, {
                    id: projectId,
                    name: projectName,
                    owner: projectOwner,
                    statuses: new Map(),
                });
            }

            const projectGroup = projectMap.get(projectId);
            if (!projectGroup.statuses.has(statusId)) {
                projectGroup.statuses.set(statusId, {
                    id: statusId,
                    name: statusName,
                    position: statusPosition,
                    tasks: [],
                });
            }

            projectGroup.statuses.get(statusId).tasks.push(task);
        });

        return Array.from(projectMap.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((project) => ({
                ...project,
                statuses: Array.from(project.statuses.values())
                    .sort((a, b) => {
                        if (a.position !== b.position) return a.position - b.position;
                        return String(a.name).localeCompare(String(b.name));
                    })
                    .map((status) => ({
                        ...status,
                        tasks: [...status.tasks].sort((a, b) => {
                            const ap = Number.isFinite(Number(a?.position)) ? Number(a.position) : Number.MAX_SAFE_INTEGER;
                            const bp = Number.isFinite(Number(b?.position)) ? Number(b.position) : Number.MAX_SAFE_INTEGER;
                            if (ap !== bp) return ap - bp;
                            return new Date(a?.createdAt || a?.created_at || 0).getTime()
                                 - new Date(b?.createdAt || b?.created_at || 0).getTime();
                        }),
                    })),
            }));
    }, [tasks]);

    const totalTaskCount = useMemo(
        () => groupedProjects.reduce((sum, p) => sum + p.statuses.reduce((s2, st) => s2 + st.tasks.length, 0), 0),
        [groupedProjects]
    );

    const openTask = (task) => {
        if (!task?.id) return;
        navigate(`/main-page/kanban/task/${task.id}`, { state: { task, project: task.project } });
    };

    const openProject = (project) => {
        if (!project?.id) return;
        navigate("/main-page/kanban", { state: { project } });
    };

    return (
        <section className="page-shell tasks-page">
            {/* ── Hero header ── */}
            <header className="workspace-hero">
                <div className="workspace-hero-content">
                    <div>
                        <h1 className="page-title">My Tasks</h1>
                        <p className="page-subtitle">Assigned tasks grouped by project and status.</p>
                    </div>

                    <div className="tasks-top-controls">
                        <div className="controls-right">
                            <button type="button" className="btn btn-ghost">Filter</button>
                            <button type="button" className="btn btn-ghost">Sort</button>
                            <button type="button" className="btn btn-secondary" onClick={loadTasks}>Refresh</button>
                            <button type="button" className="btn btn-primary" onClick={() => navigate("/main-page/projects")}>
                                Browse Projects
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Loading / error ── */}
            {loading && <p className="status-text">Loading tasks…</p>}
            {error   && <p className="status-text error">{error}</p>}

            {/* ── Empty state ── */}
            {!loading && !error && groupedProjects.length === 0 && (
                <div className="empty-state-card">
                    <h3>No assigned tasks yet</h3>
                    <p>Tasks assigned to you will appear here, grouped by project and status.</p>
                    <div className="empty-state-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/main-page/projects")}>
                            Browse Projects
                        </button>
                    </div>
                </div>
            )}

            {/* ── Task groups ── */}
            {!loading && !error && groupedProjects.length > 0 && (
                <div className="project-section">
                    {/* Section-level heading — mirrors "My Projects (3 total)" */}
                    <div className="section-heading">
                        <h2>All Tasks</h2>
                        <p>{totalTaskCount} total</p>
                    </div>

                    {groupedProjects.map((project) => (
                        <div className="mytasks-project-group" key={project.id}>
                            {/* Project sub-header */}
                            <div className="mytasks-project-header">
                                <button
                                    type="button"
                                    className="mytasks-project-name"
                                    onClick={() => openProject(project)}
                                    title={`Open ${project.name}`}
                                >
                                    {project.name}
                                </button>
                                <span className="mytasks-project-date">Oct 24, 2026</span>
                            </div>

                            {/* Per-status table blocks */}
                            {project.statuses.map((status) => (
                                <div className="mytasks-status-block" key={`${project.id}-${status.id}`}>
                                    {/* Status label row — mirrors "My Projects" / "Projects You Joined" dividers */}
                                    <div className="mytasks-status-heading">
                                        <span className={`pill ${statusPillClass(status.name)}`}>
                                            {formatStatus(status.name)}
                                        </span>
                                        <span className="mytasks-status-count">{status.tasks.length}</span>
                                    </div>

                                    {/* Table */}
                                    <div className="project-table-wrapper">
                                        <table className="project-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: "42%" }}>TASK</th>
                                                    <th style={{ width: "18%" }}>ASSIGNEE</th>
                                                    <th style={{ width: "13%" }}>PRIORITY</th>
                                                    <th style={{ width: "15%" }}>STATUS</th>
                                                    <th style={{ width: "12%", textAlign: "right" }}>ACTIVITY</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {status.tasks.map((task) => {
                                                    const priorityLabel = (task.priority || "low").toUpperCase();
                                                    const commentCount  = task.comments?.length ?? task.commentCount ?? 0;
                                                    const assigneeCount = task.assigneeCount ?? (task.assignees || []).length;

                                                    return (
                                                        <tr
                                                            key={task.id}
                                                            className="project-table-row clickable"
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => openTask(task)}
                                                            onKeyDown={(e) => e.key === "Enter" && openTask(task)}
                                                        >
                                                            {/* Task name + project sub-label */}
                                                            <td>
                                                                <div className="project-table-name-cell">
                                                                    <span className="project-table-name">
                                                                        {task.title || "Untitled task"}
                                                                    </span>
                                                                    <span className="project-table-desc">
                                                                        {task.project?.name || ""}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Assignee */}
                                                            <td>
                                                                <div className="assignee-count">
                                                                    <span className="avatar-small" aria-hidden="true">
                                                                        {currentUserDisplay.avatar ? (
                                                                            <img src={currentUserDisplay.avatar} alt="" />
                                                                        ) : (
                                                                            currentUserDisplay.initials
                                                                        )}
                                                                    </span>
                                                                    <span className="assignee-name">{currentUserDisplay.name}</span>
                                                                </div>
                                                            </td>

                                                            {/* Priority */}
                                                            <td>
                                                                <span className={`badge priority-${priorityLabel.toLowerCase()}`}>
                                                                    {priorityLabel}
                                                                </span>
                                                            </td>

                                                            {/* Status */}
                                                            <td>
                                                                <span className={`pill ${statusPillClass(status.name)}`}>
                                                                    {formatStatus(status.name)}
                                                                </span>
                                                            </td>

                                                            {/* Activity */}
                                                            <td style={{ textAlign: "right" }}>
                                                                <span className="icons">
                                                                    💬 {commentCount} &bull; 👥 {assigneeCount}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default MyTasks;