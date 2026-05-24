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
import { DashboardIcon, FolderIcon, TeamIcon, TasksIcon, NotificationsIcon, RefreshIcon } from "../components/common/AppIcons";

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
        if (!project || !project.id) return;

        navigate(`/main-page/projects/${project.id}/kanban`);
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
                            <RefreshIcon />
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
                            <FolderIcon />
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
                                <DashboardIcon />
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
                                <TasksIcon />
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
                                <FolderIcon />
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
                                <TeamIcon />
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
                                <NotificationsIcon />
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
                                <RefreshIcon />
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