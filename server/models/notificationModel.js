import { pool } from "../config/db.js";
import { publishNotification } from "../utils/notificationStream.js";

function formatDisplayName(row) {
  if (!row) return "Someone";
  const first = row.first_name || "";
  const last = row.last_name || "";
  const fullName = `${first} ${last}`.trim();
  return fullName || row.email || "Someone";
}

export async function getUserSummary(userId) {
  const normalizedUserId = (userId || "").trim();
  if (!normalizedUserId) return null;

  const result = await pool.query(
    `
    SELECT id, first_name, last_name, email, profile_image_base64, profile_picture_url
    FROM users
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [normalizedUserId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    displayName: formatDisplayName(row),
    profileImageBase64: row.profile_image_base64,
    profilePictureUrl: row.profile_picture_url,
  };
}

export async function getProjectSummary(projectId) {
  const normalizedProjectId = (projectId || "").trim();
  if (!normalizedProjectId) return null;

  const result = await pool.query(
    `
    SELECT id, name
    FROM projects
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [normalizedProjectId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
  };
}

export async function getTaskContext(taskId) {
  const normalizedTaskId = Number(taskId);
  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) return null;

  const taskResult = await pool.query(
    `
    SELECT
      t.id,
      t.title,
      t.created_by,
      tc.id AS category_id,
      tc.name AS category_name,
      tc.project_id,
      p.name AS project_name
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    JOIN projects p ON p.id = tc.project_id
    WHERE t.id = $1
    LIMIT 1
    `,
    [normalizedTaskId]
  );

  const taskRow = taskResult.rows[0];
  if (!taskRow) return null;

  const assigneeResult = await pool.query(
    `
    SELECT user_id
    FROM task_assignees
    WHERE task_id = $1
    `,
    [normalizedTaskId]
  );

  const assigneeIds = assigneeResult.rows.map((row) => row.user_id);

  return {
    taskId: taskRow.id,
    taskTitle: taskRow.title,
    creatorId: taskRow.created_by,
    categoryId: taskRow.category_id,
    categoryName: taskRow.category_name,
    projectId: taskRow.project_id,
    projectName: taskRow.project_name,
    assigneeIds,
  };
}

export async function createNotification({
  type,
  message,
  payload = {},
  recipientUserId,
  recipientRole = null,
  recipientGroup = null,
  url = null,
  status = "unread",
}) {
  const normalizedRecipientId = (recipientUserId || "").trim();
  if (!normalizedRecipientId) return null;

  const result = await pool.query(
    `
    INSERT INTO notifications (
      id,
      type,
      message,
      payload,
      recipient_user_id,
      recipient_role,
      recipient_group,
      url,
      status,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      $1,
      $2,
      $3::jsonb,
      $4::uuid,
      $5,
      $6,
      $7,
      $8,
      now(),
      now()
    )
    RETURNING id, type, message, payload, recipient_user_id, url, status, created_at, updated_at
    `,
    [type, message, JSON.stringify(payload || {}), normalizedRecipientId, recipientRole, recipientGroup, url, status]
  );

  const row = result.rows[0];
  if (row) {
    publishNotification(normalizedRecipientId, row);
  }
  return row;
}

export async function getNotificationsForUser({ userId, limit = 50, offset = 0 }) {
  const normalizedUserId = (userId || "").trim();
  if (!normalizedUserId) return [];

  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Number(limit), 200) : 50;
  const safeOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;

  const result = await pool.query(
    `
    SELECT id, type, message, payload, recipient_user_id, url, status, created_at, updated_at
    FROM notifications
    WHERE recipient_user_id = $1::uuid
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [normalizedUserId, safeLimit, safeOffset]
  );

  return result.rows || [];
}

// Cursor-based notifications retrieval (cursor is base64(JSON.stringify({ createdAt, id })))
export async function getNotificationsForUserCursor({ userId, limit = 50, cursor = null }) {
  const normalizedUserId = (userId || "").trim();
  if (!normalizedUserId) return { rows: [], hasMore: false };

  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Number(limit), 200) : 50;

  // If no cursor provided, query newest first
  if (!cursor) {
    const result = await pool.query(
      `
      SELECT id, type, message, payload, recipient_user_id, url, status, created_at, updated_at
      FROM notifications
      WHERE recipient_user_id = $1::uuid
      ORDER BY created_at DESC, id DESC
      LIMIT $2
      `,
      [normalizedUserId, safeLimit + 1]
    );

    const rows = result.rows || [];
    const hasMore = rows.length > safeLimit;
    return { rows: rows.slice(0, safeLimit), hasMore };
  }

  // decode cursor (expected base64 of JSON { createdAt, id })
  let decoded = null;
  try {
    const raw = Buffer.from(String(cursor), "base64").toString("utf8");
    decoded = JSON.parse(raw);
  } catch (err) {
    // invalid cursor; return empty result to be safe
    return { rows: [], hasMore: false };
  }

  const createdAt = decoded?.createdAt || null;
  const id = decoded?.id || null;

  if (!createdAt || !id) return { rows: [], hasMore: false };

  const result = await pool.query(
    `
    SELECT id, type, message, payload, recipient_user_id, url, status, created_at, updated_at
    FROM notifications
    WHERE recipient_user_id = $1::uuid
      AND (created_at < $2::timestamptz OR (created_at = $2::timestamptz AND id < $3::uuid))
    ORDER BY created_at DESC, id DESC
    LIMIT $4
    `,
    [normalizedUserId, createdAt, id, safeLimit + 1]
  );

  const rows = result.rows || [];
  const hasMore = rows.length > safeLimit;
  return { rows: rows.slice(0, safeLimit), hasMore };
}

export async function getUnreadCountForUser(userId) {
  const normalizedUserId = (userId || "").trim();
  if (!normalizedUserId) return 0;

  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM notifications
    WHERE recipient_user_id = $1::uuid
      AND status IS DISTINCT FROM 'read'
    `,
    [normalizedUserId]
  );

  return Number(result.rows[0]?.count || 0);
}

export async function markNotificationRead({ userId, notificationId }) {
  const normalizedUserId = (userId || "").trim();
  const normalizedNotificationId = (notificationId || "").trim();
  if (!normalizedUserId || !normalizedNotificationId) return null;

  const result = await pool.query(
    `
    UPDATE notifications
    SET status = 'read', updated_at = now()
    WHERE id = $1::uuid
      AND recipient_user_id = $2::uuid
    RETURNING id, status, updated_at
    `,
    [normalizedNotificationId, normalizedUserId]
  );

  return result.rows[0] || null;
}

export async function markAllNotificationsRead(userId) {
  const normalizedUserId = (userId || "").trim();
  if (!normalizedUserId) return 0;

  const result = await pool.query(
    `
    UPDATE notifications
    SET status = 'read', updated_at = now()
    WHERE recipient_user_id = $1::uuid
      AND status IS DISTINCT FROM 'read'
    RETURNING id
    `,
    [normalizedUserId]
  );

  return result.rows.length;
}
