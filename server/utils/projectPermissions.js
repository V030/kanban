import { pool } from "../config/db.js";

function asBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizeRole(role, ownerId, requesterId) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "owner" || String(ownerId || "") === String(requesterId || "")) return "owner";
  if (normalized === "admin") return "admin";
  if (normalized === "manager") return "manager";
  if (normalized === "member") return "member";
  return "";
}

export async function getProjectPermissionContext({ projectId, requesterId }) {
  const normalizedProjectId = (projectId || "").trim();
  const normalizedRequesterId = (requesterId || "").trim();

  if (!normalizedProjectId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  if (!normalizedRequesterId) {
    const error = new Error("requesterId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      p.id,
      p.owner,
      COALESCE(pm.role, CASE WHEN p.owner = $2::uuid THEN 'owner' END) AS requester_role,
      ps.*
    FROM projects p
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2::uuid
    LEFT JOIN project_settings ps ON ps.project_id = p.id
    WHERE p.id = $1::uuid
    LIMIT 1
    `,
    [normalizedProjectId, normalizedRequesterId]
  );

  const row = result.rows[0];
  if (!row) {
    const error = new Error("Project not found");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  const requesterRole = normalizeRole(row.requester_role, row.owner, normalizedRequesterId);
  if (!requesterRole) {
    const error = new Error("Forbidden: you are not a member of this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  return {
    projectId: row.id,
    ownerId: row.owner,
    requesterId: normalizedRequesterId,
    requesterRole,
    isOwner: requesterRole === "owner",
    isAdmin: requesterRole === "admin",
    isManager: requesterRole === "manager",
    isMember: requesterRole === "member",
    settings: {
      allow_member_create_task: asBoolean(row.allow_member_create_task, true),
      allow_member_take_task: asBoolean(row.allow_member_take_task, true),
      allow_member_edit_task: asBoolean(row.allow_member_edit_task, true),
      allow_member_delete_task: asBoolean(row.allow_member_delete_task, true),
      allow_member_add_board: asBoolean(row.allow_member_add_board, true),
      allow_member_add_member: asBoolean(row.allow_member_add_member, true),
      allow_member_review: asBoolean(row.allow_member_review, false),
      allow_member_move_task_to_done: asBoolean(row.allow_member_move_task_to_done, false),
      allow_assign_task_to_member: asBoolean(row.allow_assign_task_to_member, false),
      allow_admin_add_member: asBoolean(row.allow_admin_add_member, true),
      allow_admin_remove_member: asBoolean(row.allow_admin_remove_member, true),
      allow_admin_add_board: asBoolean(row.allow_admin_add_board, true),
      allow_admin_manage_tasks: asBoolean(row.allow_admin_manage_tasks, true),
      allow_admin_create_tag: asBoolean(row.allow_admin_create_tag, true),
      allow_member_create_tag: asBoolean(row.allow_member_create_tag, false),
    },
  };
}

export async function getTaskPermissionContext({ taskId, requesterId }) {
  const normalizedTaskId = Number(taskId);
  const normalizedRequesterId = (requesterId || "").trim();

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!normalizedRequesterId) {
    const error = new Error("requesterId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      t.id,
      t.created_by,
      p.id AS project_id,
      p.owner,
      COALESCE(pm.role, CASE WHEN p.owner = $2::uuid THEN 'owner' END) AS requester_role,
      ps.*,
      EXISTS (
        SELECT 1
        FROM task_assignees ta
        WHERE ta.task_id = t.id
          AND ta.user_id = $2::uuid
      ) AS is_assignee
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    JOIN projects p ON p.id = tc.project_id
    LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2::uuid
    LEFT JOIN project_settings ps ON ps.project_id = p.id
    WHERE t.id = $1::int
    LIMIT 1
    `,
    [normalizedTaskId, normalizedRequesterId]
  );

  const row = result.rows[0];
  if (!row) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  const requesterRole = normalizeRole(row.requester_role, row.owner, normalizedRequesterId);
  if (!requesterRole) {
    const error = new Error("Forbidden: you are not a member of this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  return {
    taskId: row.id,
    projectId: row.project_id,
    ownerId: row.owner,
    requesterId: normalizedRequesterId,
    requesterRole,
    isOwner: requesterRole === "owner",
    isAdmin: requesterRole === "admin",
    isManager: requesterRole === "manager",
    isMember: requesterRole === "member",
    isCreator: String(row.created_by || "") === normalizedRequesterId,
    isAssignee: !!row.is_assignee,
    settings: {
      allow_member_create_task: asBoolean(row.allow_member_create_task, true),
      allow_member_take_task: asBoolean(row.allow_member_take_task, true),
      allow_member_edit_task: asBoolean(row.allow_member_edit_task, true),
      allow_member_delete_task: asBoolean(row.allow_member_delete_task, true),
      allow_member_add_board: asBoolean(row.allow_member_add_board, true),
      allow_member_add_member: asBoolean(row.allow_member_add_member, true),
      allow_member_review: asBoolean(row.allow_member_review, false),
      allow_member_move_task_to_done: asBoolean(row.allow_member_move_task_to_done, false),
      allow_assign_task_to_member: asBoolean(row.allow_assign_task_to_member, false),
      allow_admin_add_member: asBoolean(row.allow_admin_add_member, true),
      allow_admin_remove_member: asBoolean(row.allow_admin_remove_member, true),
      allow_admin_add_board: asBoolean(row.allow_admin_add_board, true),
      allow_admin_manage_tasks: asBoolean(row.allow_admin_manage_tasks, true),
      allow_admin_create_tag: asBoolean(row.allow_admin_create_tag, true),
      allow_member_create_tag: asBoolean(row.allow_member_create_tag, false),
    },
  };
}
