import "../styles/ProjectSettingsModal.css";

function ToggleRow({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <div className="ps-toggle-row">
      <div className="ps-toggle-text">
        <label htmlFor={id} className="ps-toggle-label">
          {label}
        </label>
        <p className="ps-toggle-description">{description}</p>
      </div>

      <label className={`ps-switch ${disabled ? "is-disabled" : ""}`} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span className="ps-slider" aria-hidden="true" />
      </label>
    </div>
  );
}

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingChange,
  projectRole,
  canEditPermissions = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="ps-overlay" role="dialog" aria-modal="true" aria-label="Project settings">
      <div className="ps-modal">
        <header className="ps-header">
          <div>
            <h2>Project Settings</h2>
            <p>Configure collaboration rules for this project.</p>
          </div>
          <button type="button" className="ps-close-btn" onClick={onClose} aria-label="Close project settings">
            &times;
          </button>
        </header>

        {!canEditPermissions && (
          <div className="ps-section">
            <p className="ps-readonly-note">
              Note: Only owners and admins can change these settings. They are read-only for members.
            </p>
          </div>
        )}

        <section className="ps-section">
          <h3>Task Permissions</h3>

          <ToggleRow
            id="allow-create"
            label="Create tasks"
            description="Allow project members to create new tasks."
            checked={settings.allow_member_create_task}
            onChange={(nextValue) => onSettingChange("allow_member_create_task", nextValue)}
            disabled={!canEditPermissions}
          />

          <ToggleRow
            id="allow-take"
            label="Take tasks"
            description="Allow members to assign themselves to unassigned tasks."
            checked={settings.allow_member_take_task}
            onChange={(nextValue) => onSettingChange("allow_member_take_task", nextValue)}
            disabled={!canEditPermissions}
          />

          <ToggleRow
            id="allow-edit"
            label="Edit tasks"
            description="Allow members to edit properties of tasks assigned to others."
            checked={settings.allow_member_edit_task}
            onChange={(nextValue) => onSettingChange("allow_member_edit_task", nextValue)}
            disabled={!canEditPermissions}
          />

          <ToggleRow
            id="allow-delete"
            label="Delete tasks"
            description="Allow members to delete tasks."
            checked={settings.allow_member_delete_task}
            onChange={(nextValue) => onSettingChange("allow_member_delete_task", nextValue)}
            disabled={!canEditPermissions}
          />
        </section>

        <section className="ps-section">
          <h3>Board Permissions</h3>

          <ToggleRow
            id="allow-add-board"
            label="Add Boards/Columns"
            description="Allow project members to add and manage boards & columns."
            checked={settings.allow_member_add_board}
            onChange={(nextValue) => onSettingChange("allow_member_add_board", nextValue)}
            disabled={!canEditPermissions}
          />
        </section>

        <section className="ps-section">
          <h3>Member Permissions</h3>

          <ToggleRow
            id="allow-add-member"
            label="Add Members"
            description="Allow project members to invite other people to the project."
            checked={settings.allow_member_add_member}
            onChange={(nextValue) => onSettingChange("allow_member_add_member", nextValue)}
            disabled={!canEditPermissions}
          />

          <ToggleRow
            id="allow-assign-task-to-member"
            label="Allow members to assign task to others"
            description="This allows the project members to assign task to other members in this project."
            checked={settings.allow_assign_task_to_member}
            onChange={(nextValue) => onSettingChange("allow_assign_task_to_member", nextValue)}
            disabled={!canEditPermissions}
          />
        </section>

        <footer className="ps-footer">
          <p>Signed in as role: {projectRole}</p>
          <button type="button" className="ps-done-btn" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
