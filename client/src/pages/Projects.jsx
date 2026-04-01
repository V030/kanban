import React, { useEffect, useState } from "react";
import CreateProjectModal from "../components/common/CreateProjectModal";
import "../components/common/CreateProjectModal.css"; 
import { getProjects } from "../services/projectService";

function Projects() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    useEffect(() => {
      loadProjects();
    }, [])

    return (
        <div>
           <h1>Projects</h1>
           <p>Manage and organize all your projects</p>

           <button className="add-project-btn" onClick={() => setIsModalOpen(true)}>
               + Create Project
           </button>

           <CreateProjectModal 
               isOpen={isModalOpen} 
               onClose={() => setIsModalOpen(false)} 
               onCreated={loadProjects}
           />

           {loading && <p>Loading your projects...</p>}
           {error && <p style={{ color: "red" }}>{error}</p>}

           {!loading && !error && projects.length === 0 && <p>No projects yet.</p>}

           {!loading && !error && projects.length > 0 && (
             <div>
               {projects.map((project) => (
                 <div key={project.id} style={{ border: "1px solid #ddd", padding: "12px", marginTop: "12px" }}>
                 <h3>{project.name}</h3>
                 <p>{project.description || "No description"}</p>
                 <small>Created: {new Date(project.created_at).toLocaleString()}</small>
              </div>
            ))}
          </div>
          )}
        </div>
    );
}

export default Projects;