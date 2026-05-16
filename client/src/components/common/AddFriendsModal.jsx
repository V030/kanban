import React, { useState } from "react";
import { useToast } from "../../hooks/useToast";
import { addFriend } from "../../services/friendService";
import "./CreateProjectModal.css";

export default function AddFriendModal({
  isOpen,
  onClose,
  onCreated,
  onOptimisticCreate,
  onCreateResolved,
  onCreateFailed,
}) {
  const toast = useToast();
  const [friendData, setFriendData] = useState({
    email: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = friendData.email.trim();
    if (!trimmedEmail) {
      toast.showValidationError("Email is required");
      return;
    }

    const tempId = `temp-friend-request-${Date.now()}`;
    const optimisticRequest = {
      id: tempId,
      email: trimmedEmail,
      first_name: "",
      last_name: "",
      isPending: true,
    };

    onOptimisticCreate?.(optimisticRequest);
    setSubmitting(true);

    try {
      const data = await addFriend({
        email: trimmedEmail,
      });
      const createdRequest = data?.friendRequest || data?.request;
      // Reset form and close modal after successful creation
      setFriendData({ email: "" });

      onCreateResolved?.(tempId, createdRequest);

      if (onCreated) {
        await onCreated();
      }

      toast.showSuccess("Friend request sent!");
      onClose();
    } catch (err) {
      console.error(err);
      onCreateFailed?.(tempId, err);
      toast.showError(err.message || "Failed to send friend request");
    } finally {
      setSubmitting(false);
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
            <button type="button" className="cancel-btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? "Sending..." : "Send Friend Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
