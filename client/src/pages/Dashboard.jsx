import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "../services/authService";
import { getFriends } from "../services/friendService";
import {
    getMemberProjects,
    getProjectInvitations,
    getProjects,
} from "../services/projectService";

import {
    SkeletonCard,
    SkeletonRow,
} from "../components/common/SkeletonComponents";

import "../components/styles/WorkspacePages.css";
import "../components/styles/DashboardTheme.css";
import "../components/styles/SkeletonLoading.css";

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
            setError(
                requestError?.message ||
                    "Unable to load dashboard data."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const allProjects = [
        ...ownedProjects,
        ...memberProjects,
    ];

    const openProjectBoard = (project) => {
        if (!project) return;

        navigate("/main-page/kanban", {
            state: { project },
        });
    };

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

                    <div>
                        <h1 className="page-title">
                            Hey there, <span className="greeting-name">{greetingName}!</span>
                        </h1>

                        <p className="page-subtitle">
                            {/* Track project momentum, collaboration activity,
                            and pending work across your workspace. */}
                            <strong>
                                {totalProjects}
                            </strong>{" "}
                            active projects currently visible across your
                            workspace. Maintain clarity with concise task
                            naming, structured ownership, and focused
                            workflow states.
                        </p>

                    </div>

                    <div className="dashboard-hero-actions">

                        <button
                            type="button"
                            className="dashboard-hero-icon-button"
                            aria-label="Refresh dashboard"
                            title="Refresh dashboard"
                            onClick={loadDashboard}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M12 4a8 8 0 0 0-7.18 4.45.75.75 0 1 0 1.34.67A6.5 6.5 0 1 1 12 18.5c-2.04 0-3.93-1-5.1-2.6H8a.75.75 0 0 0 0-1.5H4.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-1.74A8 8 0 1 0 12 4Z" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className="dashboard-hero-icon-button"
                            aria-label="Open projects hub"
                            title="Open projects hub"
                            onClick={() =>
                                navigate("/main-page/projects")
                            }
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path fill="currentColor" d="M4.5 7.5A3.5 3.5 0 0 1 8 4h3.28c.53 0 1.03.21 1.41.59L14.7 7h4.8A2.5 2.5 0 0 1 22 9.5v7A3.5 3.5 0 0 1 18.5 20h-11A3.5 3.5 0 0 1 4 16.5v-9Z" />
                            </svg>
                        </button>

                    </div>

                </div>

                <div className="dashboard-hero-glow" />

            </header>

            {/* ERROR */}
            {error && (
                <p className="status-text error">
                    {error}
                </p>
            )}

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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path fill="currentColor" d="M4.5 5A2.5 2.5 0 0 0 2 7.5v9A2.5 2.5 0 0 0 4.5 19h15A2.5 2.5 0 0 0 22 16.5v-7A2.5 2.5 0 0 0 19.5 7h-6.2l-1.18-1.55A2 2 0 0 0 10.52 5H4.5Z" />
                                </svg>
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path fill="currentColor" d="M8 4.75A3.25 3.25 0 1 1 4.75 8 3.25 3.25 0 0 1 8 4.75Zm8.75 1.5a2.5 2.5 0 1 1-2.5 2.5 2.5 2.5 0 0 1 2.5-2.5ZM2.5 18.25A5.75 5.75 0 0 1 8.25 12.5h.05c1.55 0 2.98.62 4.02 1.64A5.75 5.75 0 0 1 16 12.5h.5A5.5 5.5 0 0 1 22 18v.5a.75.75 0 0 1-.75.75H3.25a.75.75 0 0 1-.75-.75v-.25Z" />
                                </svg>
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path fill="currentColor" d="M12 2.75A6.25 6.25 0 0 0 5.75 9c0 3.39-.7 5.54-1.45 6.93A1.75 1.75 0 0 0 5.83 18.5h12.34a1.75 1.75 0 0 0 1.53-2.57c-.75-1.39-1.45-3.54-1.45-6.93A6.25 6.25 0 0 0 12 2.75Zm-1.75 16.75A1.75 1.75 0 0 0 12 21.25a1.75 1.75 0 0 0 1.75-1.75h-3.5Z" />
                                </svg>
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
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path fill="currentColor" d="M4.5 3.5A2.5 2.5 0 0 0 2 6v10.5A2.5 2.5 0 0 0 4.5 19H7l4.3 2.9a1 1 0 0 0 1.57-.82V19h6.63A2.5 2.5 0 0 0 22 16.5V6a2.5 2.5 0 0 0-2.5-2.5h-15ZM6.5 8.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0 4.75a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
                                </svg>
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

                {/* PROJECT PANEL */}
                <article className="dashboard-panel">

                    <div className="panel-heading">

                        <h3>
                            Project Snapshot
                        </h3>

                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() =>
                                navigate("/main-page/projects")
                            }
                        >
                            Manage
                        </button>

                    </div>

                    {loading && (
                        <div className="skeleton-list">

                            <SkeletonRow
                                showAvatar={false}
                                lineCount={2}
                            />

                            <SkeletonRow
                                showAvatar={false}
                                lineCount={2}
                            />

                            <SkeletonRow
                                showAvatar={false}
                                lineCount={2}
                            />

                            <SkeletonRow
                                showAvatar={false}
                                lineCount={2}
                            />

                            <SkeletonRow
                                showAvatar={false}
                                lineCount={2}
                            />

                        </div>
                    )}

                    {!loading &&
                        allProjects.length === 0 && (
                            <div className="empty-state-card">

                                <h3>
                                    No projects yet
                                </h3>

                                <p>
                                    Create your first project
                                    to start organizing tasks
                                    with your team.
                                </p>

                                <div className="empty-state-actions">

                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() =>
                                            navigate(
                                                "/main-page/projects"
                                            )
                                        }
                                    >
                                        Go to Projects
                                    </button>

                                </div>

                            </div>
                        )}

                    {!loading &&
                        allProjects.length > 0 && (
                            <div className="project-peek-list">

                                {allProjects
                                    .slice(0, 6)
                                    .map((project) => (

                                        <button
                                            key={project.id}
                                            type="button"
                                            className="project-peek-item"
                                            onClick={() =>
                                                openProjectBoard(project)
                                            }
                                        >

                                            <div className="project-peek-meta">

                                                <strong>
                                                    {project.name}
                                                </strong>

                                                <p>
                                                    {project.description ||
                                                        "No description yet."}
                                                </p>

                                            </div>

                                            <span
                                                className={`pill ${
                                                    project.joined_at
                                                        ? "member"
                                                        : "owner"
                                                }`}
                                            >
                                                {project.joined_at
                                                    ? "Member"
                                                    : "Owner"}
                                            </span>

                                        </button>
                                    ))}

                            </div>
                        )}

                </article>

                {/* FOCUS PANEL */}
                <article className="dashboard-panel">

                    <div className="panel-heading">

                        <h3>
                            Quick Focus
                        </h3>

                    </div>

                    <div className="focus-list">

                        <div className="focus-row">

                            <h4>
                                Review project invites
                            </h4>

                            <p>
                                {inviteCount > 0
                                    ? `${inviteCount} invites need your response.`
                                    : "No pending invites right now."}
                            </p>

                        </div>

                        <div className="focus-row">

                            <h4>
                                Organize workflow updates
                            </h4>

                            <p>
                                Keep task progression predictable
                                with structured board management.
                            </p>

                        </div>

                        <div className="focus-row">

                            <h4>
                                Coordinate with teammates
                            </h4>

                            <p>
                                {friendCount > 0
                                    ? `${friendCount} collaborators available in your network.`
                                    : "Expand your network to collaborate faster."}
                            </p>

                        </div>

                    </div>

                    <div className="quick-actions">

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() =>
                                navigate("/main-page/kanban")
                            }
                        >
                            Open Current Board
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                                navigate("/main-page/friends")
                            }
                        >
                            Manage Members
                        </button>

                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                                navigate("/main-page/my-tasks")
                            }
                        >
                            Review My Tasks
                        </button>

                    </div>

                </article>

            </section>

        </section>
    );
}

export default Dashboard;
