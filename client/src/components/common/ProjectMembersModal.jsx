import "../styles/ProjectMembersModal.css";
import "./CreateProjectModal.css";
import ProjectMembersList from "./ProjectMembersList";
import { getFriends } from "../../services/friendService";
import { inviteMemberToProject } from "../../services/projectService";
import { useState, useEffect } from "react";

export default function ProjectMembersModal({
  isOpen,
  onClose,
  project,
  members = [],
  loading = false,
  error = "",
  currentUserId = "",
  onAdded,
}) {

  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
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

  const handleSelectFriend = async (friend, project) => {
    setInviteLoading(true);
    setInviteError("");

    try {
      await inviteMemberToProject ({
        projectId: project,
        friendId: friend,
      });
      if (onAdded) {
        await onAdded();
      }
    } catch (err) {
      setInviteError(err?.message || "Failed to send an invite.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInviteError("");

    if (!email || !email.trim()) {
      setInviteError("Please enter an email");
      return;
    }

    setInviteLoading(true);
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
    } catch (err) {
      setInviteError(err?.message || "Failed to send an invite.");
    } finally {
      setInviteLoading(false);
    }
  };

  
  if (!isOpen) return null;

  return (
    <div className="pmv-overlay" role="dialog" aria-modal="true" aria-label="Project members">
      <div className="pmv-modal">
        <header className="pmv-header">
          <div>
            <h2>Project Members</h2>
            <p>{project?.name ? `People currently collaborating in ${project?.name}.` : "People currently collaborating in this project."}</p>
          </div>
          <button type="button" className="pmv-close-btn" onClick={onClose} aria-label="Close project members">
            &times;
          </button>
        </header>

        <ProjectMembersList
          members={members}
          loading={loading}
          error={error}
          currentUserId={currentUserId}
          compact
        />

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
              <small>We'll send someone an invitation to this project.</small>
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
            <button type="submit" className="submit-btn" disabled={inviteLoading}>{inviteLoading ? 'Sending...' : 'Send Invite'}</button>
          </div>
        </form>

        {inviteError && <p className="error-message">{inviteError}</p>}

        <footer className="pmv-footer">
          <button type="button" className="pmv-done-btn" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>


    </div>
  );
}
