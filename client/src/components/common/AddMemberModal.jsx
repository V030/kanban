import React, { useState, useEffect } from "react";
import { getFriends } from "../../services/friendService";
import { inviteMemberToProject } from "../../services/projectService";
import "./CreateProjectModal.css";

export default function AddMemberModal({ isOpen, onClose, project, onAdded }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadFriends();
  }, [isOpen]);

  async function loadFriends() {
    setFriendsLoading(true);
    try {
      const data = await getFriends();
      setFriends(data.friends || []);
    } catch (err) {
      console.warn("Failed to load friends", err);
    } finally {
      setFriendsLoading(false);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !email.trim()) {
      setError("Please enter an email");
      return;
    }

    setLoading(true);
    try {
      if (!project?.id) {
        throw new Error("Project is missing");
      }

      await inviteMemberToProject({
        projectId: project.id,
        email: email.trim(),
      });

      setEmail("");
      if (onAdded) {
        await onAdded();
      }
      onClose();
    } catch(err) {
      setError(err?.message || "Failed to send an invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = async (friend, project) => {
    setLoading(true);
    setError("");

    try {
      await inviteMemberToProject ({
        projectId: project,
        friendId: friend,
      });
    } catch (err) {
      setError(err?.message || "Failed to send an invite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add Someone to "{project?.name || 'Project'}"</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="memberEmail">Email <span className="required">*</span></label>
              <input
                id="memberEmail"
                name="email"
                type="email"
                placeholder="person@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <small>We'll send a friend invite. They can be added to the project after they accept.</small>
            </div>

            <div className="modal-subsection">
              <strong>Your Friends</strong>
              {friendsLoading && <p>Loading friends...</p>}
              {!friendsLoading && friends.length === 0 && <p className="modal-muted">You have no friends yet.</p>}
              {!friendsLoading && friends.length > 0 && (
                <div className="friends-list">
                  {friends.map((f) => (
                    <div key={f.id} className="friend-item">
                      <div className="friend-item-main">
                        <div className="friend-initials">{((f.firstName||'').charAt(0) + (f.lastName||'').charAt(0)).toUpperCase()}</div>
                        <div className="friend-meta">
                          <div className="friend-name">{`${f.firstName || ''} ${f.lastName || ''}`.trim() || f.email}</div>
                          <div className="friend-email">{f.email}</div>
                        </div>
                      </div>
                      <div className="friend-item-action">
                        <button type="button" className="friend-add-btn" onClick={() => handleSelectFriend(f.id, project.id)}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Sending...' : 'Send Invite'}</button>
          </div>
        </form>

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}
