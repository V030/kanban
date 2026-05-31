import React, { useEffect, useState, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import { CancelIcon, TasksIcon } from "./AppIcons";
import "./AddTaskModal.css";

export default function AddTaskModal({
  isOpen,
  onClose,
  onCreate,
  initialCategoryId = "",
  categories = [],
  projectName = "",
}) {
  const toast = useToast();
  const priorityOptions = ["unset", "low", "medium", "high"];
  const formatLabel = (value) =>
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "unset",
    targetDate: "",
    categoryId: categories.length ? categories[0].id : "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setTaskData((prev) => ({
      ...prev,
      categoryId: initialCategoryId || categories[0]?.id || "",
    }));
  }, [isOpen, initialCategoryId, categories]);

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      clearTimeout(timerRef.current);
      setShouldRender(true);
      setIsClosing(false);
      return;
    }

    if (shouldRender) {
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 220);
    }

    return () => clearTimeout(timerRef.current);
  }, [isOpen, shouldRender]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedCategory = categories.find((category) => String(category.id) === String(taskData.categoryId));
  const boardLabel = selectedCategory ? formatLabel(selectedCategory.name || selectedCategory.title) : "Uncategorized";
  const modalSubtitle = `${projectName || "Current project"} · ${boardLabel} board`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskData.title.trim()) {
      toast.showValidationError("Task title is required");
      return;
    }

    const trimmedDescription = taskData.description.trim();
    if (!trimmedDescription) {
      toast.showValidationError("Task description is required");
      return;
    }

    const payload = {
      title: taskData.title.trim(),
      description: trimmedDescription,
      priority: taskData.priority || "unset",
      targetDate: taskData.targetDate || null,
      categoryId: taskData.categoryId || null,
    };

    setLoading(true);
    try {
      if (onCreate) await onCreate(payload);
      toast.showSuccess("Task created!");
      setTaskData({
        title: "",
        description: "",
        priority: "unset",
        targetDate: "",
        categoryId: categories.length ? categories[0].id : "",
      });
      onClose();
    } catch (err) {
      console.error(err);
      toast.showError(err?.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`}>
      <div className={`modal-content${isClosing ? " is-closing" : ""}`}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon-tile" aria-hidden="true">
              <TasksIcon size={24} />
            </span>
            <div>
              <h2>Add New Task</h2>
              <p>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close add task modal">
            <CancelIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="taskTitle">
                Title <span className="required">*</span>
              </label>
              <input
                id="taskTitle"
                name="title"
                type="text"
                placeholder="Enter task title"
                value={taskData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="taskDescription">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="taskDescription"
                name="description"
                placeholder="Enter task details"
                value={taskData.description}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <div className="form-row form-row-two">
              <div className="form-group">
                <label htmlFor="taskCategory">Category</label>
                <select
                  id="taskCategory"
                  name="categoryId"
                  value={taskData.categoryId}
                  onChange={handleChange}
                >
                  {/* <option value="">Uncategorized</option> */}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatLabel(c.name || c.title)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="taskTargetDate">Target Date</label>
                <input
                  id="taskTargetDate"
                  name="targetDate"
                  type="date"
                  value={taskData.targetDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label id="taskPriorityLabel">Priority</label>
              <div className="priority-segmented" role="radiogroup" aria-labelledby="taskPriorityLabel">
                {priorityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`priority-pill priority-${option}${taskData.priority === option ? " is-active" : ""}`}
                    role="radio"
                    aria-checked={taskData.priority === option}
                    onClick={() => setTaskData((prev) => ({ ...prev, priority: option }))}
                  >
                    <span className="priority-dot" aria-hidden="true" />
                    {formatLabel(option)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-required-hint">
              <span className="modal-info-icon" aria-hidden="true">i</span>
              <span>Fields marked * are required</span>
            </div>
            <div className="modal-footer-actions">
              <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Creating..." : "Add Task"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
