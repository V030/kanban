import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import HeroActionButton from "../components/common/HeroActionButton";
import { CreateProjectIcon, ProjectInvitationsIcon } from "../components/common/AppIcons";
import CreateProjectModal from "../components/common/CreateProjectModal";
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
    const [isInvitesOpen, setIsInvitesOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [memberLoading, setMemberLoading] = useState(true);

    const loadProjects = useCallback(async () => {
        setLoading(true);

        try {
          const data = await getProjects();
          setProjects(data.projects || []);
        } catch (err) {
          toast.showError(err.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const loadOtherProjects = useCallback(async () => {
        setMemberLoading(true);

        try {
          const data = await getMemberProjects();
          setMemberProjects(data.projects || []);
        } catch (err) {
          toast.showError(err.message || "Failed to load member projects");
        } finally {
            setMemberLoading(false);
        }
    }, [toast]);

    useEffect(() => {
      loadProjects();
      loadOtherProjects();
    }, [loadOtherProjects, loadProjects]);

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
      if (!project || !project.id) return;
      navigate(`/main-page/projects/${project.id}/kanban`);
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
              <HeroActionButton
                icon={<CreateProjectIcon />}
                label="Create Project"
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
              />

              <HeroActionButton
                icon={<ProjectInvitationsIcon />}
                label="Invitations"
                variant="secondary"
                onClick={() => setIsInvitesOpen(true)}
              />
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

          {loading && (
            <div style={{ textAlign: "center" }}>
              <p className="status-text">Loading your projects...</p>
            </div>
          )}

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

          {memberLoading && (
            <div style={{ textAlign: "center" }}>
              <p className="status-text">Loading shared projects...</p>
            </div>
          )}

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
        
          <div className="page-footer-strip">
            <p>Projects sync automatically as you create or join boards.</p>
          </div>
        </section>

        <ProjectInvitesModal
          isOpen={isInvitesOpen}
          onClose={() => setIsInvitesOpen(false)}
        />
      </section>
    );
}

export default Projects;
