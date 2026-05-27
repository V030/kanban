import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import { getFriends } from "../../services/friendService";
import { inviteMemberToProject } from "../../services/projectService";
import "./CreateProjectModal.css";

export default function AddMemberModal({ isOpen, onClose, project, onAdded }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [pendingFriendId, setPendingFriendId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    loadFriends();
  }, [isOpen]);

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

  if (!shouldRender) return null;

  const normalizedSearch = friendSearch.trim().toLowerCase();
  const filteredFriends = normalizedSearch
    ? friends.filter((f) => {
        const fullName = `${f.firstName || ""} ${f.lastName || ""}`.trim().toLowerCase();
        const emailValue = String(f.email || "").toLowerCase();
        return fullName.includes(normalizedSearch) || emailValue.includes(normalizedSearch);
      })
    : friends;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      toast.showValidationError("Please enter an email");
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

      toast.showSuccess("Invitation sent!");
      setEmail("");
      if (onAdded) {
        await onAdded();
      }
      onClose();
    } catch(err) {
      toast.showError(err?.message || "Failed to send an invite.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = async (friend, project) => {
    setLoading(true);
    setPendingFriendId(String(friend));

    try {
      await inviteMemberToProject ({
        projectId: project,
        friendId: friend,
      });
      toast.showSuccess("Invitation sent!");
    } catch (err) {
      toast.showError(err?.message || "Failed to send an invite.");
    } finally {
      setLoading(false);
      setPendingFriendId("");
    }
  };

  return (
    <div className={`modal-overlay${isClosing ? " is-closing" : ""}`}>
      <div className={`modal-content${isClosing ? " is-closing" : ""}`}>
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
              <div className="form-group" style={{ marginTop: 10 }}>
                <label htmlFor="friendSearch">Search</label>
                <input
                  id="friendSearch"
                  name="friendSearch"
                  type="text"
                  placeholder="Search by name or email"
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                />
              </div>
              {friendsLoading && <p>Loading friends...</p>}
              {!friendsLoading && friends.length === 0 && <p className="modal-muted">You have no friends yet.</p>}
              {!friendsLoading && friends.length > 0 && filteredFriends.length === 0 && (
                <p className="modal-muted">No matches found.</p>
              )}
              {!friendsLoading && filteredFriends.length > 0 && (
                <div className="friends-list">
                  {filteredFriends.map((f) => (
                    <div key={f.id} className="friend-item">
                      <div className="friend-item-main">
                        <div className="friend-initials">{((f.firstName||'').charAt(0) + (f.lastName||'').charAt(0)).toUpperCase()}</div>
                        <div className="friend-meta">
                          <div className="friend-name">{`${f.firstName || ''} ${f.lastName || ''}`.trim() || f.email}</div>
                          <div className="friend-email">{f.email}</div>
                        </div>
                      </div>
                      <div className="friend-item-action">
                        <button
                          type="button"
                          className="friend-add-btn"
                          onClick={() => handleSelectFriend(f.id, project.id)}
                          disabled={pendingFriendId === String(f.id)}
                        >
                          {pendingFriendId === String(f.id) ? "Sending..." : "Add"}
                        </button>
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
      </div>
    </div>
  );
}
