import "../styles/ProjectMembersModal.css";
import normalizeProfileImage from "../../utils/normalizeProfileImage";
import ProjectMembersList from "./ProjectMembersList";
import { getFriends } from "../../services/friendService";
import { inviteMemberToProject } from "../../services/projectService";
import { useState, useEffect, useRef } from "react";
import { useToast } from "../../hooks/useToast";

function getProfileImageSrc(user) {
  return normalizeProfileImage(
    user?.profileImageBase64 ||
    user?.profile_image_base64 ||
    user?.avatar ||
    user?.avatarUrl ||
    user?.imageUrl ||
    user?.profileImage ||
    null
  );
}

function FriendAvatar({ friend }) {
  const src = getProfileImageSrc(friend);
  const initials = (
    (friend.firstName || "").charAt(0) + (friend.lastName || "").charAt(0)
  ).toUpperCase();

  if (src) {
    return (
      <div className="pmv-friend-avatar">
        <img src={src} alt={`${friend.firstName || ""} ${friend.lastName || ""}`.trim() || friend.email} />
      </div>
    );
  }
  return <div className="pmv-friend-initials">{initials}</div>;
}

export default function ProjectMembersModal({
  isOpen,
  onClose,
  project,
  members = [],
  loading = false,
  currentUserId = "",
  currentUserRole = "member",
  canRemoveMembers = false,
  canUpdateRoles = false,
  canInvite = false,
  onRemoveMember,
  onUpdateRole,
  removePending = {},
  updateRolePending = {},
  onAdded,
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [pendingFriendId, setPendingFriendId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setFriendSearch("");
    setPendingFriendId("");
    loadFriends();
  }, [isOpen]);

  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);
  const touchStartYRef = useRef(null);

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

  const handleSelectFriend = async (friendId, projectId) => {
    if (!canInvite) {
      toast.showError("You don't have permission to invite members.");  
      return;
    }
    
    setInviteLoading(true);
    setPendingFriendId(String(friendId));
    try {
      await inviteMemberToProject({ projectId, friendId });
      toast.showSuccess("Invitation sent successfully!");
      if (onAdded) await onAdded();
    } catch (err) {
      toast.showError(err?.message || "Failed to send an invite.");
    } finally {
      setInviteLoading(false);
      setPendingFriendId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      toast.showValidationError("Please enter an email.");
      return;
    }

    if (!canInvite) {
      toast.showError("You don't have permission to invite members.");  
      return;
    }

    setInviteLoading(true);
    try {
      if (!project?.id) throw new Error("Project is missing.");
      await inviteMemberToProject({ projectId: project.id, email: email.trim() });
      toast.showSuccess("Invitation sent successfully!");
      setEmail("");
      if (onAdded) await onAdded();
      onClose();
    } catch (err) {
      toast.showError(err?.message || "Failed to send an invite.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSheetTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    touchStartYRef.current = e.touches?.[0]?.clientY ?? null;
  };

  const handleSheetTouchEnd = (e) => {
    if (window.innerWidth > 768 || touchStartYRef.current == null) return;
    const endY = e.changedTouches?.[0]?.clientY ?? touchStartYRef.current;
    if (endY - touchStartYRef.current > 80) onClose();
    touchStartYRef.current = null;
  };

  if (!shouldRender) return null;

  const projectName = project?.name || "Project";

  const normalizedSearch = friendSearch.trim().toLowerCase();
  const filteredFriends = normalizedSearch
    ? friends.filter((f) => {
        const fullName = `${f.firstName || ""} ${f.lastName || ""}`.trim().toLowerCase();
        const emailValue = String(f.email || "").toLowerCase();
        return fullName.includes(normalizedSearch) || emailValue.includes(normalizedSearch);
      })
    : friends;

  // Inside ProjectMembersModal component (just after the props block)

    const isAlreadyMember = (friendId) => {
      // `members` may contain `id`, `userId`, or `user_id`.  Normalise both sides.
      const fid = String(friendId);
      return members.some((m) => {
        const mid = String(m.id ?? m.userId ?? m.user_id ?? "");
        return mid && mid === fid;
      });
    };

  return (
    <div
      className={`pmv-overlay${isClosing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Project members"
      onMouseDown={onClose}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`pmv-modal${isClosing ? " is-closing" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={handleSheetTouchStart}
        onTouchEnd={handleSheetTouchEnd}
      >
        <div className="pmv-drag-handle" aria-hidden="true" />

        {/* Modal header */}
        <header className="pmv-header">
          <div>
            <h2 className="pmv-title">
              Project members
            </h2>
            <p className="pmv-subtitle">
              {project?.name
                ? `People currently collaborating in ${projectName}.`
                : "People currently collaborating in this project."}
              
            </p>
          </div>
          <button type="button" className="pmv-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>

        {/* Two-column body */}
        <div className="pmv-columns">

          {/* Left: current members (2/3) */}
          <div className="pmv-col-members">
            <div className="pmv-col-label">
              <span>Members</span>
              {members.length > 0 && (
                <span className="pmv-member-count">{members.length}</span>
              )}
            </div>

            <ProjectMembersList
              members={members}
              loading={loading}
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

          </div>

          {/* Right: invite panel (1/3) */}
          <aside className="pmv-col-invite">

            {/* Email invite */}
            <div className="pmv-invite-section">
              <span className="pmv-col-label">Invite by email</span>
              <form onSubmit={handleSubmit} className="pmv-email-form">
                <input
                  id="memberEmail"
                  name="email"
                  type="email"
                  className="pmv-input"
                  placeholder="Invite by email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="pmv-send-btn"
                  disabled={inviteLoading || !canInvite}
                >
                  {inviteLoading ? "Sending..." : "Invite"}
                </button>
              </form>
            </div>

            {/* Friends list */}
            <div className="pmv-friends-section">
              <span className="pmv-col-label">Your friends</span>
              <div className="pmv-search-wrap">
                <span className="pmv-search-icon" aria-hidden="true">⌕</span>
                <input
                  id="projectMemberSearch"
                  name="projectMemberSearch"
                  type="text"
                  className="pmv-input"
                  placeholder="Search by name or email..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                />
              </div>

              <div className="pmv-friends-list">
                {friendsLoading && (
                  <p className="pmv-muted">Loading friends...</p>
                )}
                {!friendsLoading && friends.length === 0 && (
                  <p className="pmv-muted">You have no friends yet.</p>
                )}
                {!friendsLoading && friends.length > 0 && filteredFriends.length === 0 && (
                  <p className="pmv-muted">No matches found.</p>
                )}
                {!friendsLoading && filteredFriends.map((f) => (
                  <div key={f.id} className="pmv-friend-item">
                    <FriendAvatar friend={f} />
                    <div className="pmv-friend-meta">
                      <span className="pmv-friend-name">
                        {`${f.firstName || ""} ${f.lastName || ""}`.trim() || f.email}
                      </span>
                      <span className="pmv-friend-email">{f.email}</span>
                    </div>
                    <button
                      type="button"
                      className="pmv-add-btn"
                      onClick={() => handleSelectFriend(f.id, project.id)}
                      disabled={pendingFriendId === String(f.id) || !canInvite || isAlreadyMember(f.id) }
                    >
                      {isAlreadyMember(f.id)
                        ? "Already in"
                        : pendingFriendId === String(f.id)
                          ? "..."
                          : "Invite"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>

      </div>
    </div>
  );
}
