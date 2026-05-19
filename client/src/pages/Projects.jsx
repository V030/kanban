import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import CreateProjectModal from "../components/common/CreateProjectModal";
import AddMemberModal from "../components/common/AddMemberModal";
import ProjectInvitesModal from "../components/common/ProjectInvitesModal";
import "../components/common/CreateProjectModal.css"; 
import "../components/styles/WorkspacePages.css";
import { getProjects, getMemberProjects } from "../services/projectService";

function Projects() {
  const navigate = useNavigate();
  const toast = useToast();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [memberProjects, setMemberProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isInvitesOpen, setIsInvitesOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [memberLoading, setMemberLoading] = useState(true);

    const loadProjects = async () => {
        setLoading(true);

        try {
          const data = await getProjects();
          setProjects(data.projects || []);
        } catch (err) {
          toast.showError(err.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    }

    const loadOtherProjects = async () => {
        setMemberLoading(true);

        try {
          const data = await getMemberProjects();
          setMemberProjects(data.projects || []);
        } catch (err) {
          toast.showError(err.message || "Failed to load member projects");
        } finally {
            setMemberLoading(false);
        }
    }

    useEffect(() => {
      loadProjects();
      loadOtherProjects();
    }, []);

    const handleOptimisticCreate = (optimisticProject) => {
      setProjects((prev) => [optimisticProject, ...(prev || [])]);
    };

    const handleCreateResolved = (tempId, createdProject) => {
      if (!tempId) return;
      if (createdProject) {
        toast.showSuccess("Project created successfully!");
        setProjects((prev) =>
          (prev || []).map((project) =>
            String(project?.id) === String(tempId) ? { ...createdProject, isPending: false } : project
          )
        );
      } else {
        setProjects((prev) => (prev || []).filter((project) => String(project?.id) !== String(tempId)));
      }
    };

    const handleCreateFailed = (tempId, err) => {
      if (tempId) {
        setProjects((prev) => (prev || []).filter((project) => String(project?.id) !== String(tempId)));
      }
      toast.showError(err?.message || "Project creation failed");
    };

    const openKanban = (project) => {
      navigate("/main-page/kanban", { state: { project } });
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    };

    const renderProjectRow = (project, type = "owner") => {
      const isPending = !!project?.isPending;
      const canOpen = !isPending;
      const dateLabel = isPending
        ? "Creating…"
        : type === "owner"
        ? formatDate(project.created_at)
        : formatDate(project.joined_at);

      return (
        <tr
          key={project.id}
          className={`project-table-row${canOpen ? " clickable" : ""}`}
          onClick={() => { if (canOpen) openKanban(project); }}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && canOpen) {
              e.preventDefault();
              openKanban(project);
            }
          }}
          tabIndex={canOpen ? 0 : undefined}
          role={canOpen ? "button" : undefined}
        >
          <td className="project-table-name-cell">
            <span className="project-table-name">{project.name}</span>
            <span className="project-table-desc">
              {project.description || "No description added yet."}
            </span>
          </td>
          <td>
            <span className={`pill ${type}`}>{type === "owner" ? "Owner" : "Member"}</span>
            {isPending && <span className="pill pending" style={{ marginLeft: 6 }}>Pending</span>}
          </td>
          <td className="project-table-date">{dateLabel}</td>
          <td className="project-table-action-cell">
            {/* {type === "owner" && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canOpen) return;
                  setSelectedProject(project);
                }}
                disabled={isPending}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1a4 4 0 1 1 0 8A4 4 0 0 1 8 1zm0 9c4.418 0 7 1.79 7 3v1H1v-1c0-1.21 2.582-3 7-3z" fill="currentColor"/>
                  <path d="M13 6h2M14 5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Add Member
              </button>
            )} */}
          </td>
        </tr>
      );
    };

    return (
      <section className="page-shell projects-page">
        <header className="workspace-hero">
          <div className="workspace-hero-content">
            <div>
              <h1 className="page-title">Projects</h1>
              <p className="page-subtitle">
                Create, review, and open boards quickly with a clean overview of ownership and collaboration.
              </p>
            </div>

            <div className="projects-header-actions">
              <button type="button" className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                Create Project
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsInvitesOpen(true)}>
                Project Invitations
              </button>
            </div>
          </div>

        </header>

        <CreateProjectModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreated={loadProjects}
          onOptimisticCreate={handleOptimisticCreate}
          onCreateResolved={handleCreateResolved}
          onCreateFailed={handleCreateFailed}
        />

        <section className="project-section">
          <div className="section-heading">
            <h2>My Projects</h2>
            <p>{projects.length} total</p>
          </div>

          {loading && <p className="status-text">Loading your projects...</p>}

          {!loading && projects.length === 0 && (
            <div className="empty-state-card">
              <h3>No owned projects yet</h3>
              <p>Start by creating a project, then add members and set up your board workflow.</p>
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create First Project
                </button>
              </div>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="project-table-wrapper">
              <table className="project-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => renderProjectRow(project, "owner"))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="project-section">
          <div className="section-heading">
            <h2>Projects You Joined</h2>
            <p>{memberProjects.length} total</p>
          </div>

          {memberLoading && <p className="status-text">Loading shared projects...</p>}

          {!memberLoading && memberProjects.length === 0 && (
            <div className="empty-state-card">
              <h3>No shared projects yet</h3>
              <p>You are not a member of other projects yet. Once someone invites you, the project will appear here.</p>
            </div>
          )}

          {!memberLoading && memberProjects.length > 0 && (
            <div className="project-table-wrapper">
              <table className="project-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {memberProjects.map((project) => renderProjectRow(project, "member"))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <AddMemberModal
          isOpen={!!selectedProject}
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onAdded={loadProjects}
        />

        <ProjectInvitesModal
          isOpen={isInvitesOpen}
          onClose={() => setIsInvitesOpen(false)}
        />
      </section>
    );
}

export default Projects;