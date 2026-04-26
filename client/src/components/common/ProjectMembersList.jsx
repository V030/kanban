import "../styles/ProjectMembersList.css";

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

export default function ProjectMembersList({
  members = [],
  loading = false,
  error = "",
  currentUserId = "",
  compact = false,
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
            return (
              <li key={member.id} className="pm-item">
                <div className="pm-info">
                  <p className="pm-name">
                    {getMemberName(member)}
                    {isMe && <span className="pm-me">(You)</span>}
                  </p>
                  <p className="pm-email">{member.email}</p>
                </div>
                <span className={getRoleClassName(member.role)}>{member.role || "member"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
