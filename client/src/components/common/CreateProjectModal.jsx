import React, { useState } from "react";
import { createProject } from "../../services/projectService";
import "./CreateProjectModal.css";

export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!projectData.name.trim()) {
      setError("Project name is required");
      return;
    }

    console.log("Project Data:", projectData);

    try {
      await createProject({
        name: projectData.name.trim(),
        description: projectData.description.trim(),
      });
      // Reset form and close modal after successful creation
      setProjectData({ name: "", description: "" });

      if (onCreated) {
        await onCreated();
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Project creation failed");
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
            <button type="submit" className="submit-btn">
              Create Project
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}
