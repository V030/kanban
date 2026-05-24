import React, { useState, useRef, useEffect } from "react";
import { RemoveMemberIcon } from "./AppIcons";
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
  function RoleSelector({ member, disabled, onChange, pending }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      function onDoc(e) {
        if (!ref.current) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener("click", onDoc);
      return () => document.removeEventListener("click", onDoc);
    }, []);

    const current = (member.role || "member").toLowerCase();
    // Only allow switching between admin and member via this dropdown.
    const options = [
      { key: "admin", label: "Admin" },
      { key: "member", label: "Member" },
    ];

    return (
      <div className="pm-role-selector" ref={ref}>
        <button
          type="button"
          className={`pm-role selector ${disabled ? "disabled" : ""}`}
          onClick={() => !disabled && setOpen((s) => !s)}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={`Role: ${member.role || "member"}`}
        >
          {pending ? "…" : (member.role || "member")}
        </button>

        {open && (
          <ul className="pm-role-options" role="listbox">
            {options.map((opt) => (
              <li key={opt.key} role="option">
                <button
                  type="button"
                  className={`pm-role-option ${opt.key === current ? "active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    if (opt.key !== current) onChange(opt.key);
                  }}
                  disabled={disabled || opt.key === current}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <section className={`pm-section ${compact ? "pm-section-compact" : ""}`} aria-live="polite">
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
                  {((member.role||"").toLowerCase() === "owner") ? (
                    <span className={getRoleClassName(member.role)}>{member.role}</span>
                  ) : (
                    <RoleSelector
                      member={member}
                      disabled={!(canPromote || canDemote)}
                      pending={updateRolePending?.[member.id]}
                      onChange={(newRole) => onUpdateRole?.(member.id, newRole)}
                    />
                  )}

                  {(canRemove) && (
                    <div className="pm-actions">
                      <button
                        type="button"
                        className="pm-remove-icon"
                        onClick={() => onRemoveMember?.(member.id)}
                        disabled={removePending?.[member.id]}
                        aria-label="Remove from project"
                        title="Remove"
                      >
                          <RemoveMemberIcon size={18} />
                      </button>
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
