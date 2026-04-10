import React, { useState } from "react";
import { addFriend } from "../../services/friendService";
import "./CreateProjectModal.css";

export default function AddFriendModal({ isOpen, onClose, onCreated }) {
  const [friendData, setFriendData] = useState({
    email: "",
  });

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!friendData.email.trim()) {
      setError("E-Mail is required.");
      return;
    }

    console.log("Project Data:", friendData);

    try {
      await addFriend({
        email: friendData.email.trim(),
      });
      // Reset form and close modal after successful creation
      setFriendData({ email: "" });

      if (onCreated) {
        await onCreated();
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed Adding Friend.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFriendData((prev) => ({
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
          <h2>Add Friend</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="userEmail">
                E-mail <span className="required">*</span>
              </label>
              <input
                id="userEmail"
                name="email"
                type="text"
                placeholder="Enter E-mail"
                value={friendData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Send Friend Request
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}
