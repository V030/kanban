import React, { useEffect, useState } from "react";
import CreateProjectModal from "../components/common/CreateProjectModal";
import AddMemberModal from "../components/common/AddMemberModal";
import ProjectInvitesModal from "../components/common/ProjectInvitesModal";
import "../components/common/CreateProjectModal.css"; 
import { getProjects, getMemberProjects } from "../services/projectService";

function Projects() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [memberProjects, setMemberProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isInvitesOpen, setIsInvitesOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [memberLoading, setMemberLoading] = useState(true);
    const [error, setError] = useState("");
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
    }, [])

    return (
        <div>
           <h1>Projects</h1>
           <p>Manage and organize all your projects</p>

           <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
             <button className="add-project-btn" onClick={() => setIsCreateModalOpen(true)}>
               + Create Project
             </button>
             <button className="invites-btn" onClick={() => setIsInvitesOpen(true)}>
               Project Invitations
             </button>
           </div>

           <CreateProjectModal 
               isOpen={isCreateModalOpen} 
               onClose={() => setIsCreateModalOpen(false)} 
               onCreated={loadProjects}
           />

           {loading && <p>Loading your projects...</p>}
           {error && <p style={{ color: "red" }}>{error}</p>}

           {!loading && !error && projects.length === 0 && <p>No owned projects yet.</p>}

           {!loading && !error && projects.length > 0 && (
             <div>
               <h3 style={{ marginTop: 6 }}>My Projects</h3>
               {projects.map((project) => (
                 <div key={project.id} style={{ border: "1px solid #ddd", padding: "12px", marginTop: "12px", position: 'relative' }}>
                 <h3>{project.name}</h3>
                 <p>{project.description || "No description"}</p>
                 <small>Created: {new Date(project.created_at).toLocaleString()}</small>
                 <div style={{ marginTop: 10 }}>
                   <button className="add-member-btn" onClick={() => setSelectedProject(project)}>+ Add Someone</button>
                 </div>
              </div>
            ))}
          </div>
          )}

          {memberLoading && <p>Loading projects you joined...</p>}
          {memberError && <p style={{ color: "red" }}>{memberError}</p>}

          {!memberLoading && !memberError && memberProjects.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3>Other Projects</h3>
              {memberProjects.map((project) => (
                <div key={project.id} style={{ border: "1px solid #ddd", padding: "12px", marginTop: "12px" }}>
                  <h3>{project.name}</h3>
                  <p>{project.description || "No description"}</p>
                  <small>Joined: {new Date(project.joined_at).toLocaleString()}</small>
                </div>
              ))}
            </div>
          )}

          {!memberLoading && !memberError && memberProjects.length === 0 && (
            <p style={{ marginTop: 16 }}>You're not a member of any other project yet.</p>
          )}

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
        </div>
    );
}

export default Projects;