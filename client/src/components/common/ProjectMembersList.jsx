import "../styles/ProjectMembersList.css";
import normalizeProfileImage from "../../utils/normalizeProfileImage";

function getMemberName(member) {
  const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim();
  return fullName || member.email || "Unnamed member";
}

function getRoleClassName(role) {
  switch ((role || "").toLowerCase()) {
    case "owner":
      return "pm-role owner";
    case "admin":
      return "pm-role admin";
    default:
      return "pm-role member";
  }
}

function getProfileImageSrc(member) {
  return normalizeProfileImage(
    member?.profileImageBase64 ||
    member?.profile_image_base64 ||
    member?.avatar ||
    member?.avatarUrl ||
    member?.imageUrl ||
    member?.profileImage ||
    null
  );
}

export default function ProjectMembersList({
  members = [],
  loading = false,
  error = "",
  currentUserId = "",
  currentUserRole = "member",
  canRemoveMembers = false,
  canUpdateRoles = false,
  onRemoveMember,
  onUpdateRole,
  compact = false,
  removePending = {},
  updateRolePending = {},
}) {
  return (
    <section className={`pm-section ${compact ? "pm-section-compact" : ""}`} aria-live="polite">
      <header className="pm-header">
        <h3>Project Members</h3>
        <span className="pm-count">{members.length}</span>
      </header>

      {loading && <p className="pm-empty">Loading members...</p>}
      {!loading && error && <p className="pm-error">{error}</p>}

      {!loading && !error && members.length === 0 && (
        <p className="pm-empty">No members found for this project.</p>
      )}

      {!loading && !error && members.length > 0 && (
        <ul className="pm-list">
          {members.map((member) => {
            const isMe = currentUserId && member.id === currentUserId;
            const isOwner = (member.role || "").toLowerCase() === "owner";
            const isPrivileged = currentUserRole === "owner" || currentUserRole === "admin";
            const canRemove = canRemoveMembers && isPrivileged && !isMe && !isOwner;
            const canPromote = canUpdateRoles && currentUserRole === "owner" && !isMe && !isOwner && (member.role || "").toLowerCase() !== "admin";
            const canDemote = canUpdateRoles && currentUserRole === "owner" && !isMe && !isOwner && (member.role || "").toLowerCase() !== "member";

            return (
              <li key={member.id} className="pm-item">
                <div className="pm-info">
                  <div className="pm-avatar">
                    {(() => {
                      const src = getProfileImageSrc(member);
                      return src ? <img src={src} alt={getMemberName(member)} /> : <div className="pm-initials">{(member.firstName||'').charAt(0).toUpperCase() + (member.lastName||'').charAt(0).toUpperCase()}</div>;
                    })()}
                  </div>
                  <div>
                    <p className="pm-name">
                      {getMemberName(member)}
                      {isMe && <span className="pm-me">(You)</span>}
                    </p>
                    <p className="pm-email">{member.email}</p>
                  </div>
                </div>
                <div className="pm-actions-container">
                  <span className={getRoleClassName(member.role)}>{member.role || "member"}</span>
                  {(canRemove || canPromote || canDemote) && (
                    <div className="pm-actions">
                      {canPromote && (
                        <button
                          type="button"
                          className="pm-action-btn pm-promote-btn"
                          onClick={() => onUpdateRole?.(member.id, "admin")}
                          disabled={updateRolePending?.[member.id]}
                          title="Promote to Admin"
                        >
                          ▲
                        </button>
                      )}
                      {canDemote && (
                        <button
                          type="button"
                          className="pm-action-btn pm-demote-btn"
                          onClick={() => onUpdateRole?.(member.id, "member")}
                          disabled={updateRolePending?.[member.id]}
                          title="Demote to Member"
                        >
                          ▼
                        </button>
                      )}
                      {canRemove && (
                        <button
                          type="button"
                          className="pm-action-btn pm-remove-btn"
                          onClick={() => onRemoveMember?.(member.id)}
                          disabled={removePending?.[member.id]}
                          title="Remove from Project"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
