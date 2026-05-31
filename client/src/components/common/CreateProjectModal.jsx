import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import { createProject } from "../../services/projectService";
import { getCurrentUser } from "../../services/authService";
import { CancelIcon, CreateProjectIcon } from "./AppIcons";
import "./CreateProjectModal.css";

const PROJECT_NAME_LIMIT = 60;
const PROJECT_DESCRIPTION_LIMIT = 300;

function toSlug(value, fallback = "untitled-project") {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PROJECT_NAME_LIMIT);

  return slug || fallback;
}

function getProjectNamespace() {
  const user = getCurrentUser();
  const source =
    user?.username ||
    user?.email?.split("@")[0] ||
    [user?.firstName || user?.first_name, user?.lastName || user?.last_name].filter(Boolean).join(" ") ||
    "miruban";

  return toSlug(source, "miruban");
}

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
  const projectIdentifier = `${getProjectNamespace()}/${toSlug(projectData.name)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = projectData.name.trim();
    const trimmedDescription = projectData.description.trim();

    if (!trimmedName) {
      toast.showValidationError("Project name is required");
      return;
    }

    if (!trimmedDescription) {
      toast.showValidationError("Project description is required");
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

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // open immediately
      clearTimeout(timerRef.current);
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    // start closing animation then unmount
    if (shouldRender) {
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 220); // match CSS --transition-base (200ms) + small buffer
    }

    return () => clearTimeout(timerRef.current);
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`}>
      <div className={`modal-content${isClosing ? " is-closing" : ""}`}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-tile" aria-hidden="true">
              <CreateProjectIcon size={26} />
            </span>
            <div>
              <h2>Create New Project</h2>
              <p>Set up your workspace board</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close create project modal">
            <CancelIcon size={16} />
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
                maxLength={PROJECT_NAME_LIMIT}
                required
              />

              <div className="field-counter">{projectData.name.length} / {PROJECT_NAME_LIMIT}</div>
            </div>

            <div className="form-group">
              <label htmlFor="projectDescription">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="projectDescription"
                name="description"
                placeholder="Add a brief description"
                value={projectData.description}
                onChange={handleChange}
                maxLength={PROJECT_DESCRIPTION_LIMIT}
                required
              ></textarea>
              <div className="field-counter">{projectData.description.length} / {PROJECT_DESCRIPTION_LIMIT}</div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <div className="modal-required-hint">
              <span className="modal-info-icon" aria-hidden="true">i</span>
              <span>Fields marked * are required</span>
            </div>
            <div className="modal-footer-actions">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
