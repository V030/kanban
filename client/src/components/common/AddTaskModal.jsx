import React, { useEffect, useState } from "react";
import "./AddTaskModal.css";

export default function AddTaskModal({
  isOpen,
  onClose,
  onCreate,
  initialCategoryId = "",
  categories = [],
}) {
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

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setTaskData((prev) => ({
      ...prev,
      categoryId: initialCategoryId || categories[0]?.id || "",
    }));
  }, [isOpen, initialCategoryId, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!taskData.title.trim()) {
      setError("Task title is required");
      return;
    }

    const payload = {
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      priority: taskData.priority || "unset",
      targetDate: taskData.targetDate || null,
      categoryId: taskData.categoryId || null,
    };

    try {
      if (onCreate) await onCreate(payload);
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
      setError(err?.message || "Failed to create task");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
              <label htmlFor="taskDescription">Description</label>
              <textarea
                id="taskDescription"
                name="description"
                placeholder="Optional details"
                value={taskData.description}
                onChange={handleChange}
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
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Add Task
            </button>
          </div>
        </form>

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}
