import React, { useEffect, useState, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import "./AddTaskModal.css";

export default function AddTaskModal({
  isOpen,
  onClose,
  onCreate,
  initialCategoryId = "",
  categories = [],
}) {
  const toast = useToast();
  const priorityOptions = ["unset", "low", "medium", "high", "urgent"];
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
          <h2>Add New Task</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
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

            <div className="form-group">
              <label htmlFor="taskCategory">Category</label>
              <select
                id="taskCategory"
                name="categoryId"
                value={taskData.categoryId}
                onChange={handleChange}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatLabel(c.name || c.title)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="taskPriority">Priority</label>
              <select
                id="taskPriority"
                name="priority"
                className={`priority-select priority-${taskData.priority || "unset"}`}
                value={taskData.priority}
                onChange={handleChange}
              >
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatLabel(option)}
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

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Creating..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
