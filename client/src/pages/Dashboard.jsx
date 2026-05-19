import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getCurrentUser } from "../services/authService";
import { getFriends } from "../services/friendService";
import {
    getMemberProjects,
    getProjectInvitations,
    getProjects,
} from "../services/projectService";
import { useToast } from "../hooks/useToast";

import {
    SkeletonCard,
    SkeletonRow,
} from "../components/common/SkeletonComponents";

import "../components/styles/WorkspacePages.css";
import "../components/styles/DashboardTheme.css";
import "../components/styles/SkeletonLoading.css";

function Dashboard() {
    const navigate = useNavigate();
    const toast = useToast();

    const currentUser = useMemo(() => getCurrentUser(), []);

    const [loading, setLoading] = useState(true);

    const [ownedProjects, setOwnedProjects] = useState([]);
    const [memberProjects, setMemberProjects] = useState([]);

    const [friendCount, setFriendCount] = useState(0);
    const [inviteCount, setInviteCount] = useState(0);

    const loadDashboard = useCallback(async () => {
        setLoading(true);

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
            toast.showError(
                requestError?.message ||
                    "Unable to load dashboard data."
            );
        } finally {
            setLoading(false);
        }
    }, [toast]);

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

                    <div className="focus-grid">

                        <button
                            type="button"
                            className="focus-tile focus-tile--primary"
                            onClick={() => navigate("/main-page/kanban")}
                        >
                            <span className="focus-tile__icon focus-tile__icon--teal" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="9" rx="1.5" />
                                    <rect x="14" y="3" width="7" height="5" rx="1.5" />
                                    <rect x="14" y="12" width="7" height="9" rx="1.5" />
                                    <rect x="3" y="16" width="7" height="5" rx="1.5" />
                                </svg>
                            </span>
                            <span className="focus-tile__label">Open Board</span>
                            <span className="focus-tile__sub">Current project</span>
                        </button>

                        <button
                            type="button"
                            className="focus-tile"
                            onClick={() => navigate("/main-page/my-tasks")}
                        >
                            <span className="focus-tile__icon focus-tile__icon--amber" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 11l3 3L22 4" />
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </svg>
                            </span>
                            <span className="focus-tile__label">My Tasks</span>
                            <span className="focus-tile__sub">Review all</span>
                        </button>

                        <button
                            type="button"
                            className="focus-tile"
                            onClick={() => navigate("/main-page/projects")}
                        >
                            <span className="focus-tile__icon focus-tile__icon--purple" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                </svg>
                            </span>
                            <span className="focus-tile__label">Projects</span>
                            <span className="focus-tile__sub">All workspaces</span>
                        </button>

                        <button
                            type="button"
                            className="focus-tile"
                            onClick={() => navigate("/main-page/friends")}
                        >
                            <span className="focus-tile__icon focus-tile__icon--blue" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </span>
                            <span className="focus-tile__label">Members</span>
                            <span className="focus-tile__sub">
                                {friendCount > 0 ? `${friendCount} in network` : "Manage team"}
                            </span>
                        </button>

                        <button
                            type="button"
                            className="focus-tile"
                            onClick={() => navigate("/main-page/notifications")}
                        >
                            <span className="focus-tile__icon focus-tile__icon--coral" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            </span>
                            <span className="focus-tile__label">Invites</span>
                            <span className="focus-tile__sub">
                                {inviteCount > 0 ? `${inviteCount} pending` : "No pending"}
                            </span>
                        </button>

                        <button
                            type="button"
                            className="focus-tile"
                            onClick={loadDashboard}
                        >
                            <span className="focus-tile__icon focus-tile__icon--green" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 4 23 10 17 10" />
                                    <polyline points="1 20 1 14 7 14" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                            </span>
                            <span className="focus-tile__label">Refresh</span>
                            <span className="focus-tile__sub">Sync data</span>
                        </button>

                    </div>

                </article>

            </section>

        </section>
    );
}

export default Dashboard;