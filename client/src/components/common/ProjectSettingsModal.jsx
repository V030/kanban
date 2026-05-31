import "../styles/ProjectSettingsModal.css";
import { useState, useRef, useEffect } from "react";

function ToggleRow({ id, label, description, checked, onChange, disabled = false, pending = false }) {
  return (
    <div className="ps-toggle-row">
      <div className="ps-toggle-text">
        <label htmlFor={id} className="ps-toggle-label">{label}</label>
        <p className="ps-toggle-description">
          {description}
          {pending ? " (Updating...)" : ""}
        </p>
      </div>
      <label className={`ps-switch ${disabled || pending ? "is-disabled" : ""}`} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled || pending}
        />
        <span className="ps-slider" aria-hidden="true" />
      </label>
    </div>
  );
}

const TABS = [
  { id: "owner",  label: "Owner" },
  { id: "admin",  label: "Admin" },
  { id: "member", label: "Member" },
];

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  onDeleteProject,
  projectRole,
  pendingSettings = {},
  deleteProjectPending = false,
  activeTab,
  setActiveTab,
  projectName = "",
}) {
  const [localTab, setLocalTab] = useState("owner");
  const tab = typeof setActiveTab === "function" ? activeTab : localTab;
  const setTab = typeof setActiveTab === "function" ? setActiveTab : setLocalTab;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTyped, setConfirmTyped] = useState("");

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

  const canEditOwner   = projectRole === 'owner';                       // owners can edit everything
  const canEditAdmin   = projectRole === 'owner';                       // only owners may edit admin‑level settings
  const canEditMember  = projectRole === 'owner' || projectRole === 'admin'; // owners + admins can edit member‑level settings

  if (!shouldRender) return null;

  return (
    <div className={`ps-overlay${isClosing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label="Project settings">
      <div className={`ps-modal${isClosing ? " is-closing" : ""}`}>

        <header className="ps-header">
          <div>
            <h2>Project settings</h2>
            <p>Configure collaboration rules for this project.</p>
          </div>
          <button type="button" className="ps-close-btn" onClick={onClose} aria-label="Close project settings">
            &times;
          </button>
        </header>

        {!canEditOwner && (
        <div className="ps-readonly-banner">
          {canEditAdmin
            ? "Only the project owner can change these settings."
            : "Only the project owner and admins can change these settings."}
        </div>
      )}

        <div className="ps-body">

          <nav className="ps-nav" aria-label="Settings sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ps-nav-btn ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ps-panel">

            {tab === "owner" && (
              <>
                <p className="ps-panel-title">Owner controls</p>
                <p className="ps-panel-desc">
                  Owners have full control over the project.
                </p>

                <div className="ps-toggle-list">
                  {/* <ToggleRow
                    id="owner-transfer"
                    label="Transfer ownership"
                    description="Assign a new owner to this project."
                    checked={settings.allow_owner_transfer ?? false}
                    onChange={(v) => onSettingChange("allow_owner_transfer", v)}
                    disabled={!canEditOwner}
                    pending={!!pendingSettings.allow_owner_transfer}
                  />
                  <ToggleRow
                    id="owner-archive"
                    label="Archive project"
                    description="Hide the project without permanently deleting it."
                    checked={settings.allow_owner_archive ?? false}
                    onChange={(v) => onSettingChange("allow_owner_archive", v)}
                    disabled={!canEditOwner}
                    pending={!!pendingSettings.allow_owner_archive}
                  /> */}
                </div>

                {projectRole === "owner" && onDeleteProject && (
                  <div className="ps-danger-zone">
                    <p className="ps-danger-title">Danger zone</p>
                    <p className="ps-danger-desc">Permanently delete this project and all its data. This cannot be undone.</p>
                    {!confirmOpen ? (
                      <button
                        type="button"
                        className="ps-delete-btn"
                        onClick={() => { setConfirmOpen(true); setConfirmTyped(""); }}
                        disabled={deleteProjectPending}
                      >
                        {deleteProjectPending ? "Deleting..." : "Delete project"}
                      </button>
                    ) : (
                      <div className="ps-delete-confirm">
                        <p className="ps-delete-confirm-instruction">
                          Type <span className="ps-delete-name">'{projectName}'</span> to confirm deletion:
                        </p>
                        <input
                          type="text"
                          className="ps-delete-input"
                          value={confirmTyped}
                          onChange={(e) => setConfirmTyped(e.target.value)}
                          placeholder="Project name"
                          aria-label="Type project name to confirm deletion"
                          onKeyDown={(e) => {
                            const cleaned = (confirmTyped || "").trim();
                            const expected = (projectName || "").trim();
                            if (e.key === 'Enter' && cleaned === expected && !deleteProjectPending) {
                              onDeleteProject?.();
                            }
                          }}
                        />
                        {confirmTyped.length > 0 && ((confirmTyped || "").trim() !== (projectName || "").trim()) && (
                          <p className="ps-delete-error">The names do not match.</p>
                        )}
                        <div className="ps-delete-confirm-actions">
                          <button type="button" className="ps-delete-cancel" onClick={() => setConfirmOpen(false)} disabled={deleteProjectPending}>Cancel</button>
                          <button
                            type="button"
                            className="ps-delete-confirm-btn"
                            onClick={() => onDeleteProject?.()}
                            disabled={deleteProjectPending || ((confirmTyped || "").trim() !== (projectName || "").trim())}
                          >
                            {deleteProjectPending ? "Deleting..." : "Confirm Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {tab === "admin" && (
              <>
                <p className="ps-panel-title">Admin permissions</p>
                <p className="ps-panel-desc">Control what admins are allowed to do in this project.</p>
                <div className="ps-toggle-list">
                  <ToggleRow
                    id="allow-admin-add-member"
                    label="Add members"
                    description="Allow admins to invite people to the project."
                    checked={settings.allow_admin_add_member}
                    onChange={(v) => onSettingChange("allow_admin_add_member", v)}
                    disabled={!canEditAdmin}
                    pending={!!pendingSettings.allow_admin_add_member}
                  />
                  <ToggleRow
                    id="allow-admin-remove-member"
                    label="Remove members"
                    description="Allow admins to remove members from the project."
                    checked={settings.allow_admin_remove_member}
                    onChange={(v) => onSettingChange("allow_admin_remove_member", v)}
                    disabled={!canEditAdmin}
                    pending={!!pendingSettings.allow_admin_remove_member}
                  />
                  <ToggleRow
                    id="allow-admin-add-board"
                    label="Add boards & columns"
                    description="Allow admins to add and manage boards & columns."
                    checked={settings.allow_admin_add_board}
                    onChange={(v) => onSettingChange("allow_admin_add_board", v)}
                    disabled={!canEditAdmin}
                    pending={!!pendingSettings.allow_admin_add_board}
                  />
                  <ToggleRow
                    id="allow-admin-manage-tasks"
                    label="Manage tasks"
                    description="Allow admins to create, edit, move, and delete tasks."
                    checked={settings.allow_admin_manage_tasks}
                    onChange={(v) => onSettingChange("allow_admin_manage_tasks", v)}
                    disabled={!canEditAdmin}
                    pending={!!pendingSettings.allow_admin_manage_tasks}
                  />
                </div>
              </>
            )}

            {tab === "member" && (
              <>
                <p className="ps-panel-title">Member permissions</p>
                <p className="ps-panel-desc">Control what regular members are allowed to do.</p>
                <div className="ps-toggle-list">
                  <ToggleRow
                    id="allow-create"
                    label="Create tasks"
                    description="Allow project members to create new tasks."
                    checked={settings.allow_member_create_task}
                    onChange={(v) => onSettingChange("allow_member_create_task", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_create_task}
                  />
                  <ToggleRow
                    id="allow-take"
                    label="Take tasks"
                    description="Allow members to assign themselves to unassigned tasks."
                    checked={settings.allow_member_take_task}
                    onChange={(v) => onSettingChange("allow_member_take_task", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_take_task}
                  />
                  <ToggleRow
                    id="allow-edit"
                    label="Edit tasks"
                    description="Allow members to edit task details."
                    checked={settings.allow_member_edit_task}
                    onChange={(v) => onSettingChange("allow_member_edit_task", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_edit_task}
                  />
                  <ToggleRow
                    id="allow-delete"
                    label="Delete tasks"
                    description="Allow members to delete tasks."
                    checked={settings.allow_member_delete_task}
                    onChange={(v) => onSettingChange("allow_member_delete_task", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_delete_task}
                  />
                  <ToggleRow
                    id="allow-add-board"
                    label="Add boards & columns"
                    description="Allow project members to add and manage boards & columns."
                    checked={settings.allow_member_add_board}
                    onChange={(v) => onSettingChange("allow_member_add_board", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_add_board}
                  />
                  <ToggleRow
                    id="allow-add-member"
                    label="Add members"
                    description="Allow project members to invite other people to the project."
                    checked={settings.allow_member_add_member}
                    onChange={(v) => onSettingChange("allow_member_add_member", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_add_member}
                  />
                  <ToggleRow
                    id="allow-member-review"
                    label="Review tasks"
                    description="Allow project members to approve or reject tasks in review."
                    checked={settings.allow_member_review}
                    onChange={(v) => onSettingChange("allow_member_review", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_review}
                  />
                  <ToggleRow
                    id="allow-member-create-tag"
                    label="Create tags"
                    description="Allow members to create tags on tasks."
                    checked={settings.allow_member_create_tag}
                    onChange={(v) => onSettingChange("allow_member_create_tag", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_member_create_tag}
                  />
                  <ToggleRow
                    id="allow-assign-task-to-member"
                    label="Assign tasks to others"
                    description="Allow project members to assign tasks to other members."
                    checked={settings.allow_assign_task_to_member}
                    onChange={(v) => onSettingChange("allow_assign_task_to_member", v)}
                    disabled={!canEditMember}
                    pending={!!pendingSettings.allow_assign_task_to_member}
                  />
                </div>
              </>
            )}

          </div>
        </div>

        <footer className="ps-footer">
          <span className="ps-footer-role"></span>
          <button type="button" className="ps-done-btn" onClick={onClose}>Done</button>
        </footer>

      </div>
    </div>
  );
}