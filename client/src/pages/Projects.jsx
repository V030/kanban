import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CreateProjectModal from "../components/common/CreateProjectModal";
import AddMemberModal from "../components/common/AddMemberModal";
import ProjectInvitesModal from "../components/common/ProjectInvitesModal";
import "../components/common/CreateProjectModal.css"; 
import "../components/styles/WorkspacePages.css";
import { getProjects, getMemberProjects } from "../services/projectService";

function Projects() {
  const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [memberProjects, setMemberProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isInvitesOpen, setIsInvitesOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [memberLoading, setMemberLoading] = useState(true);
    const [memberError, setMemberError] = useState("");

    const loadProjects = async () => {
        setLoading(true);
        setError("");

        try {
          const data = await getProjects();
          setProjects(data.projects || []);
        } catch (err) {
          setError(err.message || "Failed to load projects");
        } finally {
            setLoading(false);
        }
    }

    const loadOtherProjects = async () => {
        setMemberLoading(true);
        setMemberError("");

        try {
          const data = await getMemberProjects();
          setMemberProjects(data.projects || []);
        } catch (err) {
          setMemberError(err.message || "Failed to load member projects");
        } finally {
            setMemberLoading(false);
        }
    }

    useEffect(() => {
      loadProjects();
      loadOtherProjects();
    }, []);

    const openKanban = (project) => {
      localStorage.setItem("selectedProject", JSON.stringify(project));
      navigate("/main-page/kanban", { state: { project } });
    };

    const renderProjectCard = (project, type = "owner") => (
      <article
        key={project.id}
        className="project-card"
        onClick={() => openKanban(project)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openKanban(project);
          }
        }}
      >
        <h3>{project.name}</h3>
        <p>{project.description || "No description added yet."}</p>
        <p className="meta-line">
          {type === "owner"
            ? `Created ${new Date(project.created_at).toLocaleString()}`
            : `Joined ${new Date(project.joined_at).toLocaleString()}`}
        </p>
        <div className="project-card-foot">
          <span className={`pill ${type}`}>{type === "owner" ? "Owner" : "Member"}</span>
          {type === "owner" && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedProject(project);
              }}
            >
              Add Member
            </button>
          )}
        </div>
      </article>
    );

    return (
      <section className="page-shell projects-page">
        <header className="page-header">
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
        </header>

        <CreateProjectModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreated={loadProjects}
        />

        <section className="project-section">
          <div className="section-heading">
            <h2>My Projects</h2>
            <p>{projects.length} total</p>
          </div>

          {loading && <p className="status-text">Loading your projects...</p>}
          {error && <p className="status-text error">{error}</p>}

          {!loading && !error && projects.length === 0 && (
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

          {!loading && !error && projects.length > 0 && (
            <div className="project-grid">{projects.map((project) => renderProjectCard(project, "owner"))}</div>
          )}
        </section>

        <section className="project-section">
          <div className="section-heading">
            <h2>Projects You Joined</h2>
            <p>{memberProjects.length} total</p>
          </div>

          {memberLoading && <p className="status-text">Loading shared projects...</p>}
          {memberError && <p className="status-text error">{memberError}</p>}

          {!memberLoading && !memberError && memberProjects.length === 0 && (
            <p className="status-text">You are not a member of other projects yet.</p>
          )}

          {!memberLoading && !memberError && memberProjects.length > 0 && (
            <div className="project-grid">
              {memberProjects.map((project) => renderProjectCard(project, "member"))}
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