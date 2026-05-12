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
        return {
            name: "You",
            initials: "",
            avatar: "",
        };
    }

    const fullName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    const displayName = "You";
    const initialsSource = fullName || user?.email || "You";
    const initials = (initialsSource || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0])
        .join("")
        .toUpperCase();

    return {
        name: displayName,
        initials,
        avatar: normalizeProfileImage(user?.profileImageBase64 || user?.profile_image_base64 || ""),
    };
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
            }).catch(() => {
                // Keep graceful fallback display when hydration fails.
            });
        }

        return () => {
            isMounted = false;
        };
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
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((project) => ({
                ...project,
                statuses: Array.from(project.statuses.values())
                    .sort((left, right) => {
                        if (left.position !== right.position) {
                            return left.position - right.position;
                        }

                        return String(left.name).localeCompare(String(right.name));
                    })
                    .map((status) => ({
                        ...status,
                        tasks: [...status.tasks].sort((left, right) => {
                            const leftPosition = Number.isFinite(Number(left?.position)) ? Number(left.position) : Number.MAX_SAFE_INTEGER;
                            const rightPosition = Number.isFinite(Number(right?.position)) ? Number(right.position) : Number.MAX_SAFE_INTEGER;

                            if (leftPosition !== rightPosition) {
                                return leftPosition - rightPosition;
                            }

                            const leftCreated = new Date(left?.createdAt || left?.created_at || 0).getTime();
                            const rightCreated = new Date(right?.createdAt || right?.created_at || 0).getTime();
                            return leftCreated - rightCreated;
                        }),
                    })),
            }));
    }, [tasks]);

    const openTask = (task) => {
        if (!task?.id) return;

        navigate(`/main-page/kanban/task/${task.id}`, {
            state: {
                task,
                project: task.project,
            },
        });
    };

    const openProject = (project) => {
        if (!project?.id) return;

        navigate("/main-page/kanban", { state: { project } });
    };

    return (
        <section className="page-shell tasks-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">My Tasks</h1>
                    <p className="page-subtitle">Assigned tasks grouped by project and status.</p>
                </div>

                <div className="tasks-top-controls">
                    <div className="controls-right">
                        <button type="button" className="btn btn-ghost">Filter</button>
                        <button type="button" className="btn btn-ghost">Sort</button>
                        <button type="button" className="btn btn-secondary" onClick={loadTasks}>Refresh</button>
                        <button type="button" className="btn btn-primary" onClick={() => navigate("/main-page/projects") }>
                            Browse Projects
                        </button>
                    </div>
                </div>
            </header>

            {loading && <p className="status-text">Loading tasks...</p>}
            {error && <p className="status-text error">{error}</p>}

            {!loading && !error && groupedProjects.length === 0 && (
                <div className="empty-state-card">
                    <h3>No assigned tasks yet</h3>
                    <p>Tasks assigned to you will appear here, grouped by project and status.</p>
                    <div className="empty-state-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/main-page/projects") }>
                            Browse Projects
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && groupedProjects.length > 0 && groupedProjects.map((project) => (
                <section className="project-card" key={project.id}>
                    <div className="project-card-header">
                        <div className="project-card-title">
                            <h2>{project.name}</h2>
                        </div>

                        <div className="project-card-meta">
                            <div className="due-date">Oct 24, 2026</div>
                        </div>
                    </div>

                    <div className="project-card-body">
                        {project.statuses.map((status) => (
                            <div className="status-block" key={`${project.id}-${status.id}`}>
                                <div className="status-block-header">
                                    <h3>{formatStatus(status.name)}</h3>
                                    <span className="pill">{status.tasks.length}</span>
                                </div>

                                <div className="task-list">
                                    {status.tasks.map((task) => {
                                        const priorityLabel = (task.priority || "low").toUpperCase();
                                        const commentCount = task.comments?.length ?? task.commentCount ?? 0;
                                        const assigneeCount = task.assigneeCount ?? (task.assignees || []).length;

                                        return (
                                            <article key={task.id} className="task-row" role="button" tabIndex={0} onClick={() => openTask(task)}>
                                                <div className="task-left">
                                                    <div className="task-title">
                                                        <h4>{task.title || "Untitled task"}</h4>
                                                        <div className="task-sub">{task.project?.name || ""}</div>
                                                    </div>
                                                </div>

                                                <div className="task-right">
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
                                                    <div className="task-meta">
                                                        <span className={`badge priority-${priorityLabel.toLowerCase()}`}>{priorityLabel}</span>
                                                        <span className="status-badge">{formatStatus(status.name)}</span>
                                                        <span className="icons" title={`Comments: ${commentCount} — Assignees: ${assigneeCount}`}>{`💬 ${commentCount} • 👥 ${assigneeCount}`}</span>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </section>
    );
}

export default MyTasks;