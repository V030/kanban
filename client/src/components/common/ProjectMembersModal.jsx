import "../styles/ProjectMembersModal.css";
import "./CreateProjectModal.css";
import normalizeProfileImage from "../../utils/normalizeProfileImage";
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
  currentUserRole = "member",
  canRemoveMembers = false,
  canUpdateRoles = false,
  onRemoveMember,
  onUpdateRole,
  removePending = {},
  updateRolePending = {},
  memberActionError = "",
  onAdded,
}) {

  const [email, setEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [pendingFriendId, setPendingFriendId] = useState("");

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
    setPendingFriendId(String(friend));

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
      setPendingFriendId("");
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

  const normalizedSearch = friendSearch.trim().toLowerCase();
  const filteredFriends = normalizedSearch
    ? friends.filter((f) => {
        const fullName = `${f.firstName || ""} ${f.lastName || ""}`.trim().toLowerCase();
        const emailValue = String(f.email || "").toLowerCase();
        return fullName.includes(normalizedSearch) || emailValue.includes(normalizedSearch);
      })
    : friends;

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
          currentUserRole={currentUserRole}
          canRemoveMembers={canRemoveMembers}
          canUpdateRoles={canUpdateRoles}
          onRemoveMember={onRemoveMember}
          onUpdateRole={onUpdateRole}
          removePending={removePending}
          updateRolePending={updateRolePending}
          compact
        />

        {memberActionError && <p className="error-message">{memberActionError}</p>}

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
              <div className="form-group" style={{ marginTop: 10 }}>
                <label htmlFor="projectMemberSearch">Search</label>
                <input
                  id="projectMemberSearch"
                  name="projectMemberSearch"
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
                            {(() => {
                              const src = normalizeProfileImage(f?.profileImageBase64 || f?.profile_image_base64);
                              return src ? <div className="friend-avatar"><img src={src} alt={`${f.firstName || ''} ${f.lastName || ''}`.trim() || f.email} /></div> : <div className="friend-initials">{((f.firstName||'').charAt(0) + (f.lastName||'').charAt(0)).toUpperCase()}</div>;
                            })()}
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
