import { useEffect, useMemo, useState } from "react";
import "../styles/TaskDetailsModal.css";

function getMemberLabel(member) {
  if (!member) return "Unknown member";

  const firstName = member.firstName || member.first_name || "";
  const lastName = member.lastName || member.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || member.email || member.username || member.id || "Unknown member";
}

function getCreatedAtLabel(task) {
  const rawValue = task?.createdAt || task?.created_at;
  if (!rawValue) return "Not available";

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return String(rawValue);

  return parsedDate.toLocaleString();
}

function getMemberId(member) {
  if (!member) return "";
  return String(member.id || member.email || getMemberLabel(member));
}

function getInitials(member) {
  const firstName = member?.firstName || member?.first_name || "";
  const lastName = member?.lastName || member?.last_name || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return initials || String(getMemberLabel(member)).slice(0, 2).toUpperCase();
}

export default function TaskDetailsModal({ task, isAdminOrOwner, canMembersAssignTaskToOthers, projectMembers = [], onClose }) {
  const taskData = task || {};
  const assignees = Array.isArray(taskData.assignees) ? taskData.assignees : [];
  const [localAssignedIds, setLocalAssignedIds] = useState([]);

  useEffect(() => {
    const initialIds = assignees.map((member) => getMemberId(member)).filter(Boolean);
    setLocalAssignedIds(initialIds);
  }, [task]);

  const memberPool = useMemo(() => {
    const combined = [...(Array.isArray(projectMembers) ? projectMembers : []), ...assignees];
    const deduped = new Map();

    combined.forEach((member) => {
      const id = getMemberId(member);
      if (!id || deduped.has(id)) return;
      deduped.set(id, member);
    });

    return Array.from(deduped.values());
  }, [projectMembers, assignees]);

  const displayedAssignedMembers = useMemo(() => {
    const allById = new Map();
    memberPool.forEach((member) => allById.set(getMemberId(member), member));

    return localAssignedIds
      .map((memberId) => allById.get(memberId))
      .filter(Boolean);
  }, [localAssignedIds, memberPool]);

  const toggleAssigned = (member) => {
    const memberId = getMemberId(member);
    if (!memberId) return;

    setLocalAssignedIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  return (
    <div
      className="tdm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Task details"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div className="tdm-modal">
        <header className="tdm-header">
          <div>
            <h2>Task Details</h2>
            <p>Review task information and manage assignee view.</p>
          </div>
          <button type="button" className="tdm-close-btn" onClick={onClose} aria-label="Close task details">
            &times;
          </button>
        </header>

        <div className="tdm-grid">
          <section className="tdm-main-column">
            <article className="tdm-section-card tdm-focus-card">
              <h3>Task Details</h3>
              <h4 className="tdm-task-title">{taskData.title || "Untitled task"}</h4>
              <p className="tdm-task-description">{taskData.description || "No description provided."}</p>
              <div className="tdm-meta-row">
                <span className="tdm-created-pill">Created {getCreatedAtLabel(taskData)}</span>
              </div>
            </article>

            <article className="tdm-section-card">
              <h3>Assigned Members</h3>
              {displayedAssignedMembers.length === 0 ? (
                <p>No assigned members.</p>
              ) : (
                <ul className="tdm-member-chip-list">
                  {displayedAssignedMembers.map((member, index) => (
                    <li key={getMemberId(member) || `${index}-${getMemberLabel(member)}`} className="tdm-member-chip">
                      <span className="tdm-chip-avatar">{getInitials(member)}</span>
                      <span>{getMemberLabel(member)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>

          <aside className="tdm-side-column">
            <article className="tdm-section-card tdm-members-panel">
              <h3>Project Members</h3>
              {memberPool.length === 0 ? (
                <p>No project members available.</p>
              ) : (
                <ul className="tdm-project-members-list">
                  {memberPool.map((member, index) => {
                    const memberId = getMemberId(member) || `${index}-${getMemberLabel(member)}`;
                    const isAssigned = localAssignedIds.includes(getMemberId(member));

                    return (
                      <li key={memberId} className="tdm-project-member-row">
                        <div className="tdm-member-main">
                          <span className="tdm-member-avatar">{getInitials(member)}</span>
                          <span className="tdm-member-name">{getMemberLabel(member)}</span>
                        </div>
                        
                        {(canMembersAssignTaskToOthers || isAdminOrOwner) && (
                            <button
                              type="button"
                              className={`tdm-assign-btn ${isAssigned ? "is-assigned" : ""}`}
                              onClick={() => toggleAssigned(member)}
                            >
                              {isAssigned ? "Assigned" : "Assign"}
                            </button>
                          )
                        }


                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          </aside>
        </div>

        <footer className="tdm-footer">
          <button type="button" className="tdm-close-action" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}