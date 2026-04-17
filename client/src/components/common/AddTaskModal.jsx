import React, { useEffect, useState } from "react";
import "./AddTaskModal.css";

export default function AddTaskModal({
  isOpen,
  onClose,
  onCreate,
  initialCategoryId = "",
  categories = [],
}) {
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
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
      categoryId: taskData.categoryId || null,
    };

    try {
      if (onCreate) await onCreate(payload);
      setTaskData({ title: "", description: "", categoryId: categories.length ? categories[0].id : "" });
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
                    {c.name || c.title}
                  </option>
                ))}
              </select>
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
