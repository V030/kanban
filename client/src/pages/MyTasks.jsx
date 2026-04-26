import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { getProjectTasks } from "../services/projectService";
import "../components/styles/WorkspacePages.css";

function normalizeTasks(responseData) {
    const rawTasks = responseData?.tasks || responseData?.projectTasks || [];

    if (Array.isArray(rawTasks) && rawTasks.length > 0) {
        return rawTasks.map((task) => ({
            ...task,
            columnName: task?.columnName || task?.categoryName || task?.status || "Todo",
            statusKey: String(task?.status || task?.categoryName || "todo").toLowerCase().replace(/\s+/g, "_"),
        }));
    }

    const categories = responseData?.categories || [];
    return categories.flatMap((category) =>
        (category.tasks || []).map((task) => ({
            ...task,
            columnName: category.name || category.title || "Todo",
            statusKey: String(category.name || category.title || "todo").toLowerCase().replace(/\s+/g, "_"),
        }))
    );
}

function isAssignedToUser(task, userId) {
    if (!task || !userId) return false;

    if (task.assignee?.id === userId || task.assignee_id === userId || task.user_id === userId) {
        return true;
    }

    if (Array.isArray(task.assignees)) {
        return task.assignees.some((assignee) => assignee?.id === userId);
    }

    return false;
}

function MyTasks() {
    const navigate = useNavigate();
    const currentUser = useMemo(() => getCurrentUser(), []);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const selectedProjectJson = localStorage.getItem("selectedProject");
        if (!selectedProjectJson) return;

        try {
            const parsedProject = JSON.parse(selectedProjectJson);
            setSelectedProject(parsedProject);
        } catch (parseError) {
            console.error("Unable to parse selected project from storage", parseError);
        }
    }, []);

    const loadTasks = useCallback(async () => {
        if (!selectedProject?.id) {
            setTasks([]);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const data = await getProjectTasks(selectedProject.id);
            setTasks(normalizeTasks(data));
        } catch (requestError) {
            setError(requestError?.message || "Unable to load project tasks.");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    }, [selectedProject?.id]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const myTasks = tasks.filter((task) => isAssignedToUser(task, currentUser?.id));
    const unassignedTasks = tasks.filter((task) => !isAssignedToUser(task, currentUser?.id));

    if (!selectedProject) {
        return (
            <section className="page-shell tasks-page">
                <header className="page-header">
                    <div>
                        <h1 className="page-title">My Tasks</h1>
                        <p className="page-subtitle">Pick a project first so your personal task queue can be built.</p>
                    </div>
                </header>

                <div className="empty-state-card">
                    <h3>No selected project</h3>
                    <p>Open Projects, select a board, and this page will highlight tasks assigned to you.</p>
                    <div className="empty-state-actions">
                        <button type="button" className="btn btn-primary" onClick={() => navigate("/main-page/projects")}>
                            Browse Projects
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="page-shell tasks-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">My Tasks</h1>
                    <p className="page-subtitle">
                        Focused task queue for <strong>{selectedProject.name}</strong>.
                    </p>
                </div>
                <div className="tasks-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={loadTasks}>
                        Refresh
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => navigate("/main-page/kanban")}>
                        Open Board
                    </button>
                </div>
            </header>

            {loading && <p className="status-text">Loading tasks...</p>}
            {error && <p className="status-text error">{error}</p>}

            {!loading && !error && myTasks.length === 0 && (
                <div className="empty-state-card">
                    <h3>No assignments yet</h3>
                    <p>You currently have no tasks assigned in this project. Check unassigned tasks on the board.</p>
                    <div className="empty-state-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/main-page/kanban")}>
                            View Board Tasks
                        </button>
                    </div>
                </div>
            )}

            {!loading && !error && myTasks.length > 0 && (
                <section className="project-section">
                    <div className="section-heading">
                        <h2>Assigned to You</h2>
                        <p>{myTasks.length} tasks</p>
                    </div>

                    <div className="task-list-grid">
                        {myTasks.map((task) => (
                            <article key={task.id} className="task-item-card">
                                <div className="task-meta-row">
                                    <h3>{task.title || task.name || "Untitled task"}</h3>
                                    <span className={`pill ${task.statusKey || "todo"}`}>
                                        {task.columnName || "Todo"}
                                    </span>
                                </div>
                                <p>{task.description || "No description provided."}</p>
                                <div className="task-meta-row">
                                    <span className="meta-line">Created: {task.created_at ? new Date(task.created_at).toLocaleString() : "Unknown"}</span>
                                    {task.priority && <span className="pill">Priority: {task.priority}</span>}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {!loading && !error && (
                <section className="project-section">
                    <div className="section-heading">
                        <h2>Unassigned Tasks</h2>
                        <p>{unassignedTasks.length} available</p>
                    </div>

                    {unassignedTasks.length === 0 && <p className="status-text">No unassigned tasks right now.</p>}
                    {unassignedTasks.length > 0 && (
                        <div className="task-list-grid">
                            {unassignedTasks.slice(0, 4).map((task) => (
                                <article key={task.id} className="task-item-card">
                                    <div className="task-meta-row">
                                        <h3>{task.title || task.name || "Untitled task"}</h3>
                                        <span className={`pill ${task.statusKey || "unassigned"}`}>
                                            {task.columnName || "Todo"}
                                        </span>
                                    </div>
                                    <p>{task.description || "No description provided."}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}

export default MyTasks;