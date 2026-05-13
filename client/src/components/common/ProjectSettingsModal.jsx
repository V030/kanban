import "../styles/ProjectSettingsModal.css";
import "../styles/SkeletonLoading.css";

function ToggleRow({ id, label, description, checked, onChange, disabled = false, pending = false }) {
  return (
    <div className="ps-toggle-row">
      <div className="ps-toggle-text">
        <label htmlFor={id} className="ps-toggle-label">
          {label}
        </label>
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
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled || pending}
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
  onDeleteProject,
  projectRole,
  canEditPermissions = false,
  pendingSettings = {},
  deleteProjectPending = false,
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
          <h3>Owner Controls</h3>
          <p className="ps-role-note">Owners have full control over project settings and can delete the project.</p>
          {projectRole === "owner" && onDeleteProject && (
            <button
              type="button"
              className="ps-delete-project-btn"
              onClick={onDeleteProject}
              disabled={deleteProjectPending}
            >
              {deleteProjectPending ? "Deleting..." : "Delete Project"}
            </button>
          )}
        </section>

        <section className="ps-section">
          <h3>Admin Permissions</h3>

          <ToggleRow
            id="allow-admin-add-member"
            label="Add Members"
            description="Allow admins to invite people to the project."
            checked={settings.allow_admin_add_member}
            onChange={(nextValue) => onSettingChange("allow_admin_add_member", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_admin_add_member}
          />

          <ToggleRow
            id="allow-admin-remove-member"
            label="Remove Members"
            description="Allow admins to remove members from the project."
            checked={settings.allow_admin_remove_member}
            onChange={(nextValue) => onSettingChange("allow_admin_remove_member", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_admin_remove_member}
          />

          <ToggleRow
            id="allow-admin-add-board"
            label="Add Boards/Columns"
            description="Allow admins to add and manage boards & columns."
            checked={settings.allow_admin_add_board}
            onChange={(nextValue) => onSettingChange("allow_admin_add_board", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_admin_add_board}
          />

          <ToggleRow
            id="allow-admin-manage-tasks"
            label="Manage Tasks"
            description="Allow admins to create, edit, move, and delete tasks."
            checked={settings.allow_admin_manage_tasks}
            onChange={(nextValue) => onSettingChange("allow_admin_manage_tasks", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_admin_manage_tasks}
          />

          <ToggleRow
            id="allow-admin-create-tag"
            label="Create Tags"
            description="Allow admins to create tags on tasks."
            checked={settings.allow_admin_create_tag}
            onChange={(nextValue) => onSettingChange("allow_admin_create_tag", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_admin_create_tag}
          />
        </section>

        <section className="ps-section">
          <h3>Member Permissions</h3>

          <ToggleRow
            id="allow-create"
            label="Create tasks"
            description="Allow project members to create new tasks."
            checked={settings.allow_member_create_task}
            onChange={(nextValue) => onSettingChange("allow_member_create_task", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_create_task}
          />

          <ToggleRow
            id="allow-take"
            label="Take tasks"
            description="Allow members to assign themselves to unassigned tasks."
            checked={settings.allow_member_take_task}
            onChange={(nextValue) => onSettingChange("allow_member_take_task", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_take_task}
          />

          <ToggleRow
            id="allow-edit"
            label="Edit tasks"
            description="Allow members to edit task details."
            checked={settings.allow_member_edit_task}
            onChange={(nextValue) => onSettingChange("allow_member_edit_task", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_edit_task}
          />

          <ToggleRow
            id="allow-delete"
            label="Delete tasks"
            description="Allow members to delete tasks."
            checked={settings.allow_member_delete_task}
            onChange={(nextValue) => onSettingChange("allow_member_delete_task", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_delete_task}
          />

          <ToggleRow
            id="allow-add-board"
            label="Add Boards/Columns"
            description="Allow project members to add and manage boards & columns."
            checked={settings.allow_member_add_board}
            onChange={(nextValue) => onSettingChange("allow_member_add_board", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_add_board}
          />

          <ToggleRow
            id="allow-add-member"
            label="Add Members"
            description="Allow project members to invite other people to the project."
            checked={settings.allow_member_add_member}
            onChange={(nextValue) => onSettingChange("allow_member_add_member", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_add_member}
          />

          <ToggleRow
            id="allow-member-review"
            label="Review tasks"
            description="Allow project members to approve or reject tasks in review."
            checked={settings.allow_member_review}
            onChange={(nextValue) => onSettingChange("allow_member_review", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_review}
          />

          <ToggleRow
            id="allow-member-move-task-to-done"
            label="Move assigned tasks to Done"
            description="Allow an assignee to mark their own task as Done."
            checked={settings.allow_member_move_task_to_done}
            onChange={(nextValue) => onSettingChange("allow_member_move_task_to_done", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_member_move_task_to_done}
          />

          <ToggleRow
            id="allow-assign-task-to-member"
            label="Allow members to assign task to others"
            description="This allows the project members to assign task to other members in this project."
            checked={settings.allow_assign_task_to_member}
            onChange={(nextValue) => onSettingChange("allow_assign_task_to_member", nextValue)}
            disabled={!canEditPermissions}
            pending={!!pendingSettings.allow_assign_task_to_member}
          />

          <p className="ps-member-note">
            Members can create tags only when they created the task or are assigned to it. Review and Done actions are controlled separately. Admins and owners can create tags normally.
          </p>
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
