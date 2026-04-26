import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { getFriends } from "../services/friendService";
import { getMemberProjects, getProjectInvitations, getProjects } from "../services/projectService";
import "../components/styles/WorkspacePages.css";

function Dashboard() {
    const navigate = useNavigate();
    const currentUser = useMemo(() => getCurrentUser(), []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [ownedProjects, setOwnedProjects] = useState([]);
    const [memberProjects, setMemberProjects] = useState([]);
    const [friendCount, setFriendCount] = useState(0);
    const [inviteCount, setInviteCount] = useState(0);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [owned, member, friends, invites] = await Promise.all([
                getProjects(),
                getMemberProjects(),
                getFriends(),
                getProjectInvitations(),
            ]);

            setOwnedProjects(owned.projects || []);
            setMemberProjects(member.projects || []);
            setFriendCount((friends.friends || []).length);
            setInviteCount((invites.projectInvitations || []).length);
        } catch (requestError) {
            setError(requestError?.message || "Unable to load dashboard data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const allProjects = [...ownedProjects, ...memberProjects];

    const openProjectBoard = (project) => {
        if (!project) return;
        localStorage.setItem("selectedProject", JSON.stringify(project));
        navigate("/main-page/kanban", { state: { project } });
    };

    const greetingName =
        `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() || "there";

    return (
        <section className="page-shell dashboard-page">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Welcome back, {greetingName}</h1>
                    <p className="page-subtitle">
                        Track project momentum, team activity, and where to focus next.
                    </p>
                </div>
                <div className="projects-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={loadDashboard}>
                        Refresh
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate("/main-page/projects")}
                    >
                        Open Projects Hub
                    </button>
                </div>
            </header>

            {error && <p className="status-text error">{error}</p>}

            <section className="dashboard-stats" aria-live="polite">
                <article className="stat-card">
                    <p className="stat-label">Owned Projects</p>
                    <p className="stat-value">{loading ? ".." : ownedProjects.length}</p>
                    <p className="stat-caption">Your active portfolios</p>
                </article>

                <article className="stat-card">
                    <p className="stat-label">Shared Projects</p>
                    <p className="stat-value">{loading ? ".." : memberProjects.length}</p>
                    <p className="stat-caption">Boards where you collaborate</p>
                </article>

                <article className="stat-card">
                    <p className="stat-label">Pending Invites</p>
                    <p className="stat-value">{loading ? ".." : inviteCount}</p>
                    <p className="stat-caption">Awaiting response</p>
                </article>

                <article className="stat-card">
                    <p className="stat-label">Connections</p>
                    <p className="stat-value">{loading ? ".." : friendCount}</p>
                    <p className="stat-caption">Team members in your network</p>
                </article>
            </section>

            <section className="dashboard-grid">
                <article className="dashboard-panel">
                    <div className="panel-heading">
                        <h3>Project Snapshot</h3>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => navigate("/main-page/projects")}
                        >
                            Manage
                        </button>
                    </div>

                    {loading && <p className="status-text">Loading project snapshot...</p>}

                    {!loading && allProjects.length === 0 && (
                        <div className="empty-state-card">
                            <h3>No projects yet</h3>
                            <p>Create your first project to start organizing tasks with your team.</p>
                            <div className="empty-state-actions">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => navigate("/main-page/projects")}
                                >
                                    Go to Projects
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && allProjects.length > 0 && (
                        <div className="project-peek-list">
                            {allProjects.slice(0, 5).map((project) => (
                                <button
                                    key={project.id}
                                    type="button"
                                    className="project-peek-item"
                                    onClick={() => openProjectBoard(project)}
                                >
                                    <div className="project-peek-meta">
                                        <strong>{project.name}</strong>
                                        <p>{project.description || "No description yet."}</p>
                                    </div>
                                    <span className={`pill ${project.joined_at ? "member" : "owner"}`}>
                                        {project.joined_at ? "Member" : "Owner"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </article>

                <article className="dashboard-panel">
                    <div className="panel-heading">
                        <h3>Quick Focus</h3>
                    </div>

                    <div className="focus-list">
                        <div className="focus-row">
                            <h4>Review team invites</h4>
                            <p>{inviteCount > 0 ? `${inviteCount} invites need your response.` : "No pending invites right now."}</p>
                        </div>
                        <div className="focus-row">
                            <h4>Plan your board updates</h4>
                            <p>Use column ordering and task creation to keep flow predictable.</p>
                        </div>
                        <div className="focus-row">
                            <h4>Coordinate with members</h4>
                            <p>{friendCount > 0 ? `${friendCount} friends available to invite.` : "Expand your team network to collaborate faster."}</p>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <button type="button" className="btn btn-primary" onClick={() => navigate("/main-page/kanban")}>
                            Open Current Board
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/main-page/friends")}>
                            Manage Members
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate("/main-page/my-tasks")}>
                            Review My Tasks
                        </button>
                    </div>
                </article>
            </section>

            <section className="metrics-strip">
                <strong>{ownedProjects.length + memberProjects.length}</strong> active projects visible. Keep boards
                focused with clear statuses, short task titles, and ownership rules that match your workflow.
            </section>
        </section>
    );
}

export default Dashboard;