import React, { useState } from "react";
import { useToast } from "../../hooks/useToast";
import { createProject } from "../../services/projectService";
import "./CreateProjectModal.css";

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreated,
  onOptimisticCreate,
  onCreateResolved,
  onCreateFailed,
}) {
  const toast = useToast();
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = projectData.name.trim();
    const trimmedDescription = projectData.description.trim();

    if (!trimmedName) {
      toast.showValidationError("Project name is required");
      return;
    }

    const tempId = `temp-project-${Date.now()}`;
    const optimisticProject = {
      id: tempId,
      name: trimmedName,
      description: trimmedDescription,
      created_at: new Date().toISOString(),
      isPending: true,
    };

    onOptimisticCreate?.(optimisticProject);
    setSubmitting(true);

    try {
      const data = await createProject({
        name: trimmedName,
        description: trimmedDescription,
      });
      const createdProject = data?.project || data?.createdProject;
  
      setProjectData({ name: "", description: "" });

      onCreateResolved?.(tempId, createdProject);

      if (onCreated) {
        await onCreated();
      }

      onClose();
    } catch (err) {
      console.error(err);
      onCreateFailed?.(tempId, err);
      toast.showError(err.message || "Project creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // If modal is not open, render nothing
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="projectName">
                Project Name <span className="required">*</span>
              </label>
              <input
                id="projectName"
                name="name"
                type="text"
                placeholder="Enter project name"
                value={projectData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="projectDescription">Description</label>
              <textarea
                id="projectDescription"
                name="description"
                placeholder="Add a brief description (optional)"
                value={projectData.description}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
