import { pool } from "../config/db.js";
import { getProjectPermissionContext, getTaskPermissionContext } from "../utils/projectPermissions.js";

export async function createSubtask({ taskId, title, createdBy, status }) {
  const client = await pool.connect();

  try {
    if (!taskId) {
      const error = new Error("taskId is required");
      error.code = "INVALID_TASK";
      throw error;
    }

    if (!title) {
      const error = new Error("sub task title is required");
      error.code = "INVALID_SUBTASK_TITLE";
      throw error;
    }

    if (!createdBy) {
      const error = new Error("createdBy is required");
      error.code = "INVALID_USER";
      throw error;
    }

    const result = await client.query(
      `
      INSERT INTO subtasks (task_id, title, created_by, status)
      VALUES ($1::int, $2, $3::uuid, $4)
      RETURNING id, task_id, title, created_by, status, created_at;
      `,
      [taskId, title, createdBy, status]
    );

    // return the inserted row
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function deleteSubtask({ taskId, subtaskId }) {
  const client = await pool.connect();

  try {
    if (!taskId) {
      const error = new Error("taskId is required");
      error.code = "INVALID_TASK";
      throw error;
    }

    if (!subtaskId) {
      const error = new Error("subtaskId is required");
      error.code = "INVALID_SUBTASK";
      throw error;
    }

    const result = await client.query(
      `
      DELETE FROM subtasks
      WHERE id = $1::int AND task_id = $2::int
      RETURNING id, task_id, title, created_by, status, created_at;
      `,
      [subtaskId, taskId]
    );

    if (result.rows.length === 0) {
      const error = new Error("Subtask not found");
      error.code = "SUBTASK_NOT_FOUND";
      throw error;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getTaskById({ taskId, requesterId }) {
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
      t.board_id,
      t.category_id,
      t.title,
      t.description,
      t.priority,
      t.created_by,
      t.created_at,
      t.target_date,
      t.is_past_due,
      t.position,
      p.id AS project_id,
      p.name AS project_name,
      p.owner AS project_owner,
      COALESCE(ps.allow_assign_task_to_member, false) AS allow_assign_task_to_member,
      COALESCE(pm_req.role, CASE WHEN p.owner = $2::uuid THEN 'owner' END) AS requester_role,
      json_build_object(
        'id', u.id,
        'firstName', u.first_name,
        'lastName', u.last_name,
        'email', u.email
      ) AS creator,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', au.id,
              'firstName', au.first_name,
              'lastName', au.last_name,
              'email', au.email,
              'profileImageBase64', au.profile_image_base64
            ) ORDER BY au.first_name ASC, au.last_name ASC
          )
          FROM task_assignees ta
          JOIN users au ON ta.user_id = au.id
          WHERE ta.task_id = t.id
        ), '[]'::json
      ) AS assignees,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', st.id,
              'title', st.title,
              'createdBy', json_build_object(
                'id', cu.id,
                'firstName', cu.first_name,
                'lastName', cu.last_name,
                'email', cu.email
              ),
              'status', st.status,
              'createdAt', st.created_at
            ) ORDER BY st.created_at ASC
          )
          FROM subtasks st
          LEFT JOIN users cu ON st.created_by = cu.id
          WHERE st.task_id = t.id
        ), '[]'::json
      ) AS subtasks,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', tt.id,
              'tagName', tt.tag_name,
              'taskId', tt.task_id,
              'projectId', tt.project_id
            ) ORDER BY tt.tag_name ASC
          )
          FROM task_tags tt
          WHERE tt.task_id = t.id
        ), '[]'::json
      ) AS tags
    FROM tasks t
    JOIN board b ON t.board_id = b.id
    JOIN projects p ON b.project_id = p.id
    LEFT JOIN project_settings ps ON ps.project_id = p.id
    LEFT JOIN project_members pm_req ON pm_req.project_id = p.id AND pm_req.user_id = $2::uuid
    LEFT JOIN users u ON t.created_by = u.id
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

  return {
    id: row.id,
    boardId: row.board_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    priority: row.priority === "critical" ? "urgent" : row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    targetDate: row.target_date,
    isPastDue: row.is_past_due,
    position: row.position,
    projectId: row.project_id,
    projectName: row.project_name,
    projectOwner: row.project_owner,
    requesterRole: row.requester_role,
    allowAssignTaskToOthers: row.allow_assign_task_to_member,
    project: {
      id: row.project_id,
      name: row.project_name,
      owner: row.project_owner,
    },
    creator: row.creator,
    assignees: row.assignees || [],
    subtasks: row.subtasks || [],
    tags: row.tags || [],
  };
}

function encodeMyTasksCursor(row) {
  if (!row) return null;
  return Buffer.from(JSON.stringify({
    projectName: row.project_name,
    statusPosition: row.status_position,
    statusName: row.status_name,
    taskPosition: row.position,
    createdAt: row.created_at,
    id: row.id,
  }), "utf8").toString("base64");
}

function decodeMyTasksCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(String(cursor), "base64").toString("utf8"));
    return {
      projectName: String(decoded.projectName || ""),
      statusPosition: Number.isFinite(Number(decoded.statusPosition)) ? Number(decoded.statusPosition) : null,
      statusName: String(decoded.statusName || ""),
      taskPosition: Number.isFinite(Number(decoded.taskPosition)) ? Number(decoded.taskPosition) : null,
      createdAt: decoded.createdAt || null,
      id: decoded.id || null,
    };
  } catch (error) {
    return null;
  }
}

export async function getMyTasks({ requesterId, limit = 50, cursor = null }) {
  const normalizedRequesterId = (requesterId || "").trim();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const decodedCursor = decodeMyTasksCursor(cursor);

  if (!normalizedRequesterId) {
    const error = new Error("requesterId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const cursorClause = decodedCursor
    ? `
      AND (
        p.name > $2
        OR (p.name = $2 AND tc."position" > $3)
        OR (p.name = $2 AND tc."position" = $3 AND tc.name > $4)
        OR (p.name = $2 AND tc."position" = $3 AND tc.name = $4 AND t."position" > $5)
        OR (p.name = $2 AND tc."position" = $3 AND tc.name = $4 AND t."position" = $5 AND t.created_at > $6)
        OR (p.name = $2 AND tc."position" = $3 AND tc.name = $4 AND t."position" = $5 AND t.created_at = $6 AND t.id > $7)
      )`
    : "";

  const queryParams = decodedCursor
    ? [normalizedRequesterId, decodedCursor.projectName, decodedCursor.statusPosition, decodedCursor.statusName, decodedCursor.taskPosition, decodedCursor.createdAt, decodedCursor.id, safeLimit + 1]
    : [normalizedRequesterId, safeLimit + 1];

  const result = await pool.query(
    `
    SELECT
      t.id,
      t.board_id,
      t.category_id,
      t.title,
      t.description,
      t.priority,
      t.created_by,
      t.created_at,
      t.target_date,
      t.is_past_due,
      t.position,
      (
        SELECT COUNT(*) FROM task_comments tc2 WHERE tc2.task_id = t.id
      ) AS comment_count,
      (
        SELECT COUNT(*) FROM task_assignees ta2 WHERE ta2.task_id = t.id
      ) AS assignee_count,
      tc.name AS status_name,
      tc."position" AS status_position,
      p.id AS project_id,
      p.name AS project_name,
      p.owner AS project_owner,
      COALESCE(pm_req.role, CASE WHEN p.owner = $1::uuid THEN 'owner' END) AS requester_role,
      json_build_object(
        'id', u.id,
        'firstName', u.first_name,
        'lastName', u.last_name,
        'email', u.email
      ) AS creator,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', au.id,
              'firstName', au.first_name,
              'lastName', au.last_name,
              'email', au.email
            ) ORDER BY au.first_name ASC, au.last_name ASC
          )
          FROM task_assignees ta
          JOIN users au ON ta.user_id = au.id
          WHERE ta.task_id = t.id
        ), '[]'::json
      ) AS assignees
    FROM task_assignees my_assignee
    JOIN tasks t ON t.id = my_assignee.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    JOIN board b ON b.id = t.board_id
    JOIN projects p ON p.id = b.project_id
    LEFT JOIN project_members pm_req ON pm_req.project_id = p.id AND pm_req.user_id = $1::uuid
    LEFT JOIN users u ON t.created_by = u.id
    WHERE my_assignee.user_id = $1::uuid
    ${cursorClause}
    ORDER BY p.name ASC, tc."position" ASC, tc.name ASC, t."position" ASC, t.created_at ASC, t.id ASC
    LIMIT $${decodedCursor ? 8 : 2}
    `,
    queryParams
  );

  const rows = result.rows;
  const hasMore = rows.length > safeLimit;
  const pageRows = hasMore ? rows.slice(0, safeLimit) : rows;

  return {
    rows: pageRows,
    hasMore,
    nextCursor: hasMore ? encodeMyTasksCursor(pageRows[pageRows.length - 1]) : null,
  };
}

export function mapMyTasksRows(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    boardId: row.board_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    priority: row.priority === "critical" ? "urgent" : row.priority,
    createdBy: row.created_by,
    createdAt: row.created_at,
    targetDate: row.target_date,
    isPastDue: row.is_past_due,
    position: row.position,
    status: {
      id: row.category_id,
      name: row.status_name,
      position: row.status_position,
    },
    statusName: row.status_name,
    statusKey: String(row.status_name || "todo").toLowerCase().replace(/\s+/g, "_"),
    projectId: row.project_id,
    projectName: row.project_name,
    projectOwner: row.project_owner,
    requesterRole: row.requester_role,
    project: {
      id: row.project_id,
      name: row.project_name,
      owner: row.project_owner,
    },
    creator: row.creator,
    assignees: row.assignees || [],
    commentCount: Number(row.comment_count || 0),
    assigneeCount: Number(row.assignee_count || (Array.isArray(row.assignees) ? row.assignees.length : 0)),
  }));
}

export async function createTaskComment({ taskId, userId, comment }) {
  const normalizedTaskId = Number(taskId);
  const normalizedUserId = (userId || "").trim();
  const normalizedComment = (comment || "").trim();

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!normalizedUserId) {
    const error = new Error("userId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  if (!normalizedComment) {
    const error = new Error("comment is required");
    error.code = "INVALID_COMMENT";
    throw error;
  }

  const result = await pool.query(
    `
    INSERT INTO task_comments (task_id, user_id, comment)
    VALUES ($1::int, $2::uuid, $3)
    RETURNING id, task_id, user_id, comment, created_at
    `,
    [normalizedTaskId, normalizedUserId, normalizedComment]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function createTaskCommentReply({ taskId, commentId, userId, commentReply }) {
  const normalizedTaskId = Number(taskId);
  const normalizedCommentId = Number(commentId);
  const normalizedUserId = (userId || "").trim();
  const normalizedReply = (commentReply || "").trim();

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!Number.isInteger(normalizedCommentId) || normalizedCommentId <= 0) {
    const error = new Error("commentId is required");
    error.code = "INVALID_COMMENT";
    throw error;
  }

  if (!normalizedUserId) {
    const error = new Error("userId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  if (!normalizedReply) {
    const error = new Error("comment reply is required");
    error.code = "INVALID_COMMENT_REPLY";
    throw error;
  }

  const result = await pool.query(
    `
    INSERT INTO task_comments_replies (comment_id, task_id, user_id, comment_reply)
    VALUES ($1::int, $2::int, $3::uuid, $4)
    RETURNING id, comment_id, task_id, user_id, comment_reply, created_at
    `,
    [normalizedCommentId, normalizedTaskId, normalizedUserId, normalizedReply]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    commentId: row.comment_id,
    taskId: row.task_id,
    userId: row.user_id,
    commentReply: row.comment_reply,
    createdAt: row.created_at,
  };
}

export async function getTaskComments(taskId) {
  const normalizedTaskId = Number(taskId);

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      tc.id,
      tc.comment,
      tc.created_at AS "createdAt",
      json_build_object(
        'id', u.id,
        'firstName', u.first_name,
        'lastName', u.last_name,
        'role', pm.role,
        'profileImageBase64', u.profile_image_base64
      ) AS "user",
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', tcr.id,
              'commentReply', tcr.comment_reply,
              'createdAt', tcr.created_at,
              'user', json_build_object(
                'id', ru.id,
                'firstName', ru.first_name,
                'lastName', ru.last_name,
                'role', pmr.role,
                'profileImageBase64', ru.profile_image_base64
              )
            )
            ORDER BY tcr.created_at ASC
          )
          FROM task_comments_replies tcr
          JOIN users ru ON tcr.user_id = ru.id
          LEFT JOIN tasks t2 ON tcr.task_id = t2.id
          LEFT JOIN tasks_categories tcg2 ON t2.category_id = tcg2.id
          LEFT JOIN project_members pmr ON pmr.user_id = ru.id AND pmr.project_id = tcg2.project_id
          WHERE tcr.comment_id = tc.id
            AND tcr.task_id = tc.task_id
        ), '[]'::json
      ) AS replies
    FROM task_comments tc
    JOIN users u ON tc.user_id = u.id
    LEFT JOIN tasks t ON tc.task_id = t.id
    LEFT JOIN tasks_categories tcg ON t.category_id = tcg.id
    LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = tcg.project_id
    WHERE tc.task_id = $1::int
    ORDER BY tc.created_at ASC
    `,
    [normalizedTaskId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    comment: row.comment,
    createdAt: row.createdAt,
    user: row.user,
    replies: row.replies || [],
  }));
}

async function insertReviewRow(executor, { taskId, reviewerId, action, comment }) {
  const normalizedTaskId = Number(taskId);
  const normalizedReviewerId = (reviewerId || "").trim();
  const normalizedAction = String(action || "").toLowerCase();
  const normalizedCommentInput =
    comment != null && String(comment).trim() !== "" ? String(comment).trim() : null;

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!normalizedReviewerId) {
    const error = new Error("reviewerId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  if (!["approved", "rejected"].includes(normalizedAction)) {
    const error = new Error("action must be 'approved' or 'rejected'");
    error.code = "INVALID_ACTION";
    throw error;
  }

  if (!normalizedCommentInput) {
    const error = new Error("Review comment is required");
    error.code = "INVALID_COMMENT";
    throw error;
  }

  const normalizedComment = normalizedCommentInput;

  const result = await executor(
    `
    INSERT INTO reviews (task_id, reviewer_id, action, comment)
    VALUES ($1::int, $2::uuid, $3, $4)
    RETURNING id, task_id, reviewer_id, action, comment, created_at
    `,
    [normalizedTaskId, normalizedReviewerId, normalizedAction, normalizedComment]
  );

  return result.rows[0];
}

export async function createReview(params) {
  return insertReviewRow((text, params) => pool.query(text, params), params);
}

export async function getReviewsByTask(taskId) {
  const normalizedTaskId = Number(taskId);

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      r.id,
      r.task_id,
      r.reviewer_id,
      r.action,
      r.comment,
      r.created_at,
      u.first_name,
      u.last_name,
      pm.role AS reviewer_role
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    LEFT JOIN tasks t ON t.id = r.task_id
    LEFT JOIN tasks_categories tc ON tc.id = t.category_id
    LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = tc.project_id
    WHERE r.task_id = $1::int
    ORDER BY r.created_at DESC
    `,
    [normalizedTaskId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    reviewerId: row.reviewer_id,
    reviewerName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    reviewerRole: row.reviewer_role,
    action: row.action,
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

export async function approveTaskReview({ taskId, reviewerId, comment: commentInput }) {
  const normalizedTaskId = Number(taskId);
  const normalizedReviewerId = (reviewerId || "").trim();
  const normalizedComment =
    commentInput != null && String(commentInput).trim() !== "" ? String(commentInput).trim() : null;

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!normalizedReviewerId) {
    const error = new Error("reviewerId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedReviewerId });
  const canReview = access.isOwner || access.isAdmin || access.isManager || (access.settings && access.settings.allow_member_review === true);
  if (!canReview) {
    const error = new Error("Forbidden: you don't have permission to approve reviews for this task");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  if (!access.isOwner && !access.isAdmin && !access.isManager) {
    // Review permission alone governs member approval/rejection.
  }

  // find done category id for this project
  const catRes = await pool.query(
    `SELECT id FROM tasks_categories WHERE project_id = $1::uuid AND LOWER(name) IN ('done', 'done') LIMIT 1`,
    [access.projectId]
  );

  if (catRes.rows.length === 0) {
    const error = new Error("Done category not found");
    error.code = "CATEGORY_NOT_FOUND";
    throw error;
  }

  const doneCategoryId = Number(catRes.rows[0].id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await insertReviewRow((text, params) => client.query(text, params), {
      taskId: normalizedTaskId,
      reviewerId: normalizedReviewerId,
      action: "approved",
      comment: normalizedComment,
    });

    const updateRes = await client.query(
      `UPDATE tasks SET category_id = $1 WHERE id = $2::int RETURNING id, board_id, category_id, title, description, priority, created_by, created_at, position`,
      [doneCategoryId, normalizedTaskId]
    );

    if (updateRes.rows.length === 0) {
      const error = new Error("Task not found");
      error.code = "TASK_NOT_FOUND";
      throw error;
    }

    await client.query("COMMIT");
    return updateRes.rows[0];
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectTaskReview({ taskId, reviewerId, comment }) {
  const normalizedTaskId = Number(taskId);
  const normalizedReviewerId = (reviewerId || "").trim();
  const normalizedComment = String(comment || "").trim();

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!normalizedReviewerId) {
    const error = new Error("reviewerId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  if (!normalizedComment) {
    const error = new Error("Rejection reason is required");
    error.code = "INVALID_COMMENT";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedReviewerId });
  const canReview = access.isOwner || access.isAdmin || access.isManager || (access.settings && access.settings.allow_member_review === true);
  if (!canReview) {
    const error = new Error("Forbidden: you don't have permission to reject reviews for this task");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  // find todo category id for this project
  const catRes = await pool.query(
    `SELECT id FROM tasks_categories WHERE project_id = $1::uuid AND LOWER(name) IN ('todo', 'to_do', 'todo') LIMIT 1`,
    [access.projectId]
  );

  if (catRes.rows.length === 0) {
    const error = new Error("Todo category not found");
    error.code = "CATEGORY_NOT_FOUND";
    throw error;
  }

  const todoCategoryId = Number(catRes.rows[0].id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await insertReviewRow((text, params) => client.query(text, params), {
      taskId: normalizedTaskId,
      reviewerId: normalizedReviewerId,
      action: "rejected",
      comment: normalizedComment,
    });

    const updateRes = await client.query(
      `UPDATE tasks SET category_id = $1 WHERE id = $2::int RETURNING id, board_id, category_id, title, description, priority, created_by, created_at, position`,
      [todoCategoryId, normalizedTaskId]
    );

    if (updateRes.rows.length === 0) {
      const error = new Error("Task not found");
      error.code = "TASK_NOT_FOUND";
      throw error;
    }

    await client.query("COMMIT");
    return updateRes.rows[0];
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}


export async function createTask(taskData) {
  const description = (taskData?.taskDescription || taskData?.description || "").trim();
  if (!description) {
    const error = new Error("description is required");
    error.code = "INVALID_DESCRIPTION";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const projectId = (taskData?.projectId || taskData?.project_id || "").trim();
    const categoryIdRaw = taskData?.categoryId ?? taskData?.category_id;
    const categoryId = Number(categoryIdRaw);
    const title = (taskData?.taskName || taskData?.title || "").trim();
    const createdBy = (taskData?.createdBy || taskData?.created_by || "").trim();
    const normalizedPriority = String(taskData?.priority || "").trim().toLowerCase();
    const targetDateRaw = taskData?.targetDate ?? taskData?.target_date ?? null;


    const access = await getProjectPermissionContext({ projectId, requesterId: createdBy });
    if (!access.isOwner) {
      if (access.isAdmin) {
        if (!access.settings.allow_admin_manage_tasks) {
          const error = new Error("Forbidden: task creation is disabled for admins in this project");
          error.code = "PROJECT_FORBIDDEN";
          throw error;
        }
      } else if (!access.settings.allow_member_create_task) {
        const error = new Error("Forbidden: task creation is disabled for members in this project");
        error.code = "PROJECT_FORBIDDEN";
        throw error;
      }
    }

    if (!projectId) {
      const error = new Error("projectId is required");
      error.code = "INVALID_PROJECT";
      throw error;
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      const error = new Error("categoryId is required");
      error.code = "INVALID_CATEGORY";
      throw error;
    }

    if (!title) {
      const error = new Error("task title is required");
      error.code = "INVALID_TASK_TITLE";
      throw error;
    }

    if (!createdBy) {
      const error = new Error("createdBy is required");
      error.code = "INVALID_USER";
      throw error;
    }

    const boardResult = await client.query(
      `
      SELECT id
      FROM board
      WHERE project_id = $1::uuid
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [projectId]
    );

    const board = boardResult.rows[0];

    if (!board) {
      const error = new Error("Board not found for this project");
      error.code = "BOARD_NOT_FOUND";
      throw error;
    }

    const positionResult = await client.query(
      `
      SELECT COALESCE(MAX(position), 0) AS max_position
      FROM tasks
      WHERE category_id = $1
      `,
      [categoryId]
    );

    const position = Number(positionResult.rows[0]?.max_position || 0) + 1;
    const allowedPriorities = new Set(["unset", "low", "medium", "high", "urgent", "critical"]);
    let priority = normalizedPriority || "unset";
    if (!allowedPriorities.has(priority)) {
      priority = "unset";
    }
    const dbPriority = priority === "urgent" ? "critical" : priority;

    const targetDateValue = targetDateRaw ? String(targetDateRaw).trim() : null;
    if (targetDateValue) {
      const parsed = new Date(targetDateValue);
      if (Number.isNaN(parsed.getTime())) {
        const error = new Error("targetDate must be a valid date");
        error.code = "INVALID_TARGET_DATE";
        throw error;
      }
    }

    const newTaskResult = await client.query(
      `
      INSERT INTO tasks (board_id, category_id, title, description, priority, target_date, is_past_due, created_by, position)
      VALUES ($1::uuid, $2, $3, $4, $5, $6::date,
        CASE WHEN $6::date IS NOT NULL AND CURRENT_DATE > $6::date THEN true ELSE false END,
        $7::uuid, $8)
      RETURNING id, board_id, category_id, title, description, priority, target_date, is_past_due, created_by, position
      `,
      [board.id, categoryId, title, description || null, dbPriority, targetDateValue, createdBy, position]
    );

    await client.query("COMMIT");

    const row = newTaskResult.rows[0];
    return {
      id: row.id,
      boardId: row.board_id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      priority: row.priority === "critical" ? "urgent" : row.priority,
      targetDate: row.target_date,
      isPastDue: row.is_past_due,
      createdBy: row.created_by,
      position: row.position,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createProject(projectData) {
  const description = String(projectData?.description || "").trim();
  if (!description) {
    const error = new Error("description is required");
    error.code = "INVALID_DESCRIPTION";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const projectResult = await client.query(
      `
      INSERT INTO projects (id, name, description, owner, created_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4)
      RETURNING id, name, description, owner, created_by
      `,
      [
        projectData.name,
        description,
        projectData.created_by,
        projectData.created_by,
      ]
    );

    const project = projectResult.rows[0];

    await client.query(
      `
      INSERT INTO project_settings (
        project_id,
        allow_member_create_task,
        allow_member_take_task,
        allow_member_edit_task,
        allow_member_delete_task,
        allow_member_add_board,
        allow_member_add_member,
        allow_assign_task_to_member
      )
      VALUES ($1, true, true, true, true, true, true, false)
      `,
      [project.id]
    );

    const boardResult = await client.query(
      `
      INSERT INTO board (id, project_id, name, created_by)
      VALUES (gen_random_uuid(), $1, $2, $3)
      RETURNING id, project_id, name, created_by, created_at
      `,
      [project.id, projectData.name, projectData.created_by]
    );

    const board = boardResult.rows[0];

    await client.query(
      `
      INSERT INTO project_members (board_id, project_id, user_id, role)
      VALUES ($1, $2, $3, 'owner')
      ON CONFLICT (project_id, user_id) DO NOTHING
      `,
      [board.id, project.id, projectData.created_by]
    );

    const categoryResult = await client.query(
      `
      INSERT INTO tasks_categories (board_id, project_id, name, "position")
      VALUES
        ($1, $2, 'todo', 1),
        ($1, $2, 'in_progress', 2),
        ($1, $2, 'to_review', 3),
        ($1, $2, 'done', 4)
      RETURNING id, project_id, name, "position"
      `,
      [board.id, project.id]
    );

    await client.query("COMMIT");

    return {
      board,
      project,
      categories: categoryResult.rows,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating project:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getProjectsByOwner(ownerId) {
  const query = `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.owner,
      p.created_by,
      p.created_at,
      COALESCE(ps.allow_member_create_task, true) AS allow_member_create_task,
      COALESCE(ps.allow_member_take_task, true)   AS allow_member_take_task,
      COALESCE(ps.allow_member_edit_task, true)   AS allow_member_edit_task,
      COALESCE(ps.allow_member_delete_task, true) AS allow_member_delete_task,
      COALESCE(ps.allow_member_add_board, true)   AS allow_member_add_board,
      COALESCE(ps.allow_member_add_member, true)  AS allow_member_add_member
    FROM projects p
    LEFT JOIN project_settings ps
      ON p.id = ps.project_id
    WHERE p.owner = $1
    ORDER BY p.created_at DESC
  `;

  const result = await pool.query(query, [ownerId]);
  return result.rows;
}

export async function getProjectsByMember(userId) {
  const query = `
    SELECT
      p.id,
      p.name,
      p.description,
      p.owner,
      p.created_by,
      p.created_at,
      pm.role,
      pm.joined_at,
      COALESCE(ps.allow_member_create_task, true) AS allow_member_create_task,
      COALESCE(ps.allow_member_take_task, true)   AS allow_member_take_task,
      COALESCE(ps.allow_member_edit_task, true)   AS allow_member_edit_task,
      COALESCE(ps.allow_member_delete_task, true) AS allow_member_delete_task,
      COALESCE(ps.allow_member_add_board, true)   AS allow_member_add_board,
      COALESCE(ps.allow_member_add_member, true)  AS allow_member_add_member
    FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    JOIN projects p ON p.id = pm.project_id
    LEFT JOIN project_settings ps ON p.id = ps.project_id
    WHERE u.id = $1
      AND p.owner <> $1
    ORDER BY pm.joined_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}

export async function getProjectMembers({ projectId, requesterId }) {
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

  const permissionResult = await pool.query(
    `
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = $1::uuid
      AND pm.user_id = $2::uuid
    LIMIT 1
    `,
    [normalizedProjectId, normalizedRequesterId]
  );

  if (permissionResult.rows.length === 0) {
    const error = new Error("Forbidden: you are not a member of this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.profile_image_base64,
      pm.role,
      pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = $1::uuid
    ORDER BY
      CASE pm.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'member' THEN 3
        ELSE 4
      END,
      pm.joined_at ASC,
      u.first_name ASC,
      u.last_name ASC
    `,
    [normalizedProjectId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    profileImageBase64: row.profile_image_base64,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

export async function getProjectSettings({ projectId, requesterId }) {
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

  const accessResult = await pool.query(
    `
    SELECT 1
    FROM project_members
    WHERE project_id = $1::uuid
      AND user_id = $2::uuid
    LIMIT 1
    `,
    [normalizedProjectId, normalizedRequesterId]
  );

  if (accessResult.rows.length === 0) {
    const error = new Error("Forbidden: you are not a member of this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT *
    FROM project_settings
    WHERE project_id = $1::uuid
    `,
    [normalizedProjectId]
  );

  if (result.rows.length === 0) {
    return {
      allow_member_create_task: true,
      allow_member_take_task: true,
      allow_member_edit_task: true,
      allow_member_delete_task: true,
      allow_member_add_board: true,
      allow_member_add_member: true,
      allow_member_review: false,
      allow_assign_task_to_member: false,
      allow_admin_add_member: true,
      allow_admin_remove_member: true,
      allow_admin_add_board: true,
      allow_admin_manage_tasks: true,
      allow_admin_create_tag: true,
      allow_member_create_tag: false
    };
  }

  return result.rows[0];
}

export async function updateProjectSettings({ projectId, requesterId, setting, value }) {
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

  const allowedKeys = [
    "allow_member_create_task",
    "allow_member_take_task",
    "allow_member_edit_task",
    "allow_member_delete_task",
    "allow_member_add_board",
    "allow_member_add_member",
    "allow_member_review",
    "allow_assign_task_to_member",
    "allow_admin_add_member",
    "allow_admin_remove_member",
    "allow_admin_add_board",
    "allow_admin_manage_tasks",
    "allow_admin_create_tag",
    "allow_member_create_tag"
  ];

  const settingDefaults = {
    allow_member_create_task: true,
    allow_member_take_task: true,
    allow_member_edit_task: true,
    allow_member_delete_task: true,
    allow_member_add_board: true,
    allow_member_add_member: true,
    allow_member_review: false,
    allow_assign_task_to_member: false,
    allow_admin_add_member: true,
    allow_admin_remove_member: true,
    allow_admin_add_board: true,
    allow_admin_manage_tasks: true,
    allow_admin_create_tag: true,
    allow_member_create_tag: false,
  };

  if (!allowedKeys.includes(setting)) {
    const error = new Error("No valid settings provided");
    error.code = "INVALID_SETTINGS";
    throw error;
  }

  if (typeof value !== "boolean") {
    const error = new Error("value must be boolean");
    error.code = "INVALID_SETTINGS";
    throw error;
  }

  // Ensure all expected settings columns exist so the RETURNING clause won't fail
  for (const key of Object.keys(settingDefaults)) {
    const defaultVal = settingDefaults[key] ? "true" : "false";
    await pool.query(
      `
      ALTER TABLE IF EXISTS project_settings
      ADD COLUMN IF NOT EXISTS ${key} boolean NOT NULL DEFAULT ${defaultVal}
      `
    );
  }

  const permissionResult = await pool.query(
    `
    SELECT 1
    FROM project_members pm
    WHERE pm.project_id = $1::uuid
      AND pm.user_id = $2::uuid
      AND pm.role IN ('owner', 'admin')
    LIMIT 1
    `,
    [normalizedProjectId, normalizedRequesterId]
  );

  if (permissionResult.rows.length === 0) {
    const error = new Error("Forbidden: only owners and admins can update project settings");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const result = await pool.query(
    `
    INSERT INTO project_settings (project_id, ${setting})
    VALUES ($1::uuid, $2)
    ON CONFLICT (project_id)
    DO UPDATE SET ${setting} = EXCLUDED.${setting}
    RETURNING
      project_id,
      allow_member_create_task,
      allow_member_take_task,
      allow_member_edit_task,
      allow_member_delete_task,
      allow_member_add_board,
      allow_member_add_member,
      allow_member_review,
      allow_assign_task_to_member,
      allow_admin_add_member,
      allow_admin_remove_member,
      allow_admin_add_board,
      allow_admin_manage_tasks,
      allow_admin_create_tag,
      allow_member_create_tag
    `,
    [normalizedProjectId, value]
  );

  return result.rows[0];
}

export async function updateProjectName({ projectId, requesterId, name }) {
  const normalizedProjectId = (projectId || "").trim();
  const normalizedRequesterId = (requesterId || "").trim();
  const trimmedName = String(name || "").trim();

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

  if (!trimmedName) {
    const error = new Error("name is required");
    error.code = "INVALID_NAME";
    throw error;
  }

  const projectResult = await pool.query(
    `
    SELECT owner
    FROM projects
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [normalizedProjectId]
  );

  if (projectResult.rows.length === 0) {
    const error = new Error("Project not found");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  const access = await getProjectPermissionContext({ projectId: normalizedProjectId, requesterId: normalizedRequesterId });
  if (!access.isOwner && !access.isAdmin) {
    const error = new Error("Forbidden: only owners and admins can rename the project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const updateResult = await pool.query(
    `
    UPDATE projects
    SET name = $2
    WHERE id = $1::uuid
    RETURNING id, name
    `,
    [normalizedProjectId, trimmedName]
  );

  const row = updateResult.rows[0];
  return { id: row.id, name: row.name };
}

export async function updateProjectDescription({ projectId, requesterId, description }) {
  const normalizedProjectId = (projectId || "").trim();
  const normalizedRequesterId = (requesterId || "").trim();
  const trimmedDesc = String(description || "").trim();

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

  if (!trimmedDesc) {
    const error = new Error("description is required");
    error.code = "INVALID_DESCRIPTION";
    throw error;
  }

  const projectResult = await pool.query(
    `
    SELECT owner
    FROM projects
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [normalizedProjectId]
  );

  if (projectResult.rows.length === 0) {
    const error = new Error("Project not found");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  const access = await getProjectPermissionContext({ projectId: normalizedProjectId, requesterId: normalizedRequesterId });
  if (!access.isOwner && !access.isAdmin) {
    const error = new Error("Forbidden: only owners and admins can edit the description");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const updateResult = await pool.query(
    `
    UPDATE projects
    SET description = $2
    WHERE id = $1::uuid
    RETURNING id, description
    `,
    [normalizedProjectId, trimmedDesc]
  );

  const row = updateResult.rows[0];
  return { id: row.id, description: row.description };
}

export async function inviteMemberToProject(inviteData) {
  const inviterId = (inviteData?.inviter_id || "").trim();
  let inviteeId = (inviteData?.invitee_id || "").trim();
  const projectId = (inviteData?.project_id || "").trim();
  const inviteeEmail = (inviteData?.invitee_email || "").trim();

  if (!inviterId) throw new Error("Inviter is required");
  if (!projectId) throw new Error("Project is required");

  if (!inviteeId && inviteeEmail) {
    const result = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [inviteeEmail]
    );
    if (result.rows.length === 0) {
      const error = new Error("Invitee not found");
      error.code = "USER_NOT_FOUND";
      throw error;
    }
    inviteeId = result.rows[0].id;
  }

  if (!inviterId) {
    const error = new Error("Inviter is required");
    error.code = "INVALID_INVITER";
    throw error;
  }

  if (!inviteeId) {
    const error = new Error("Invitee is required");
    error.code = "INVALID_INVITEE";
    throw error;
  }

  if (!projectId) {
    const error = new Error("Project is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  if (inviterId === inviteeId) {
    const error = new Error("You cannot invite yourself");
    error.code = "SELF_INVITE";
    throw error;
  }

  const inviteeResult = await pool.query(
    `SELECT id FROM users WHERE id = $1 LIMIT 1`,
    [inviteeId]
  );

  if (inviteeResult.rows.length === 0) {
    const error = new Error("Invitee not found");
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  const projectAccess = await getProjectPermissionContext({ projectId, requesterId: inviterId });
  const requesterRole = projectAccess.requesterRole;
  const canInvite =
    projectAccess.isOwner ||
    (projectAccess.isAdmin ? projectAccess.settings.allow_admin_add_member : projectAccess.settings.allow_member_add_member);

  if (!canInvite) {
    const error = new Error("Forbidden: inviting members is disabled for your role in this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const insertResult = await pool.query(
    `
    INSERT INTO project_requests (
      requester_id,
      recipient_id,
      project_id,
      status,
      requested_at
    )
    SELECT
      $1::uuid,
      u.id,
      p.id,
      'pending'::text,
      now()
    FROM projects p
    JOIN users u
      ON u.id = $2::uuid
    WHERE p.id = $3::uuid
      AND u.id <> $1::uuid
      AND NOT EXISTS (
        SELECT 1
        FROM project_requests pr
        WHERE pr.project_id = p.id
          AND pr.recipient_id = u.id
          AND pr.status IN ('pending', 'accepted')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM project_members pm
        WHERE pm.project_id = p.id
          AND pm.user_id = u.id
      )
    RETURNING id, requester_id, recipient_id, project_id, status, requested_at
    `,
    [inviterId, inviteeId, projectId]
  );

  if (insertResult.rows.length === 0) {
    const duplicateResult = await pool.query(
      `
      SELECT 1
      FROM project_requests
      WHERE project_id = $1::uuid
        AND recipient_id = $2::uuid
        AND status IN ('accepted', 'pending')
      LIMIT 1
      `,
      [projectId, inviteeId]
    );

    if (duplicateResult.rows.length > 0) {
      const error = new Error("A pending invite already exists for this user in this project or user is already in the project.");
      error.code = "ALREADY_PENDING";
      throw error;
    }

    const projectOwnershipResult = await pool.query(
      `
      SELECT id
      FROM projects
      WHERE id = $1 AND owner = $2
      LIMIT 1
      `,
      [projectId, inviterId]
    );

    if (projectOwnershipResult.rows.length === 0) {
      const error = new Error("Project not found or you do not have permission to invite collaborators");
      error.code = "PROJECT_FORBIDDEN";
      throw error;
    }

    const error = new Error("Unable to create project invite");
    error.code = "INVITE_CREATE_FAILED";
    throw error;
  }

  return insertResult.rows[0];
}

export async function getProjectInvitations(userId) {
  const normalizedUserId = (userId || "").trim();

  if (!normalizedUserId) {
    const error = new Error("User is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      pr.id,
      pr.requester_id,
      pr.recipient_id,
      pr.project_id,
      pr.status,
      pr.requested_at,
      p.name AS project_name,
      u.first_name AS requester_first_name,
      u.last_name AS requester_last_name,
      u.email AS requester_email
    FROM project_requests pr
    JOIN projects p ON p.id = pr.project_id
    JOIN users u ON u.id = pr.requester_id
    WHERE pr.recipient_id = $1
      AND pr.status = 'pending'
    ORDER BY pr.requested_at DESC
    `,
    [normalizedUserId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    projectId: row.project_id,
    status: row.status,
    requestedAt: row.requested_at,
    projectName: row.project_name,
    senderFirstName: row.requester_first_name,
    senderLastName: row.requester_last_name,
    senderEmail: row.requester_email,
  }));
}

export async function acceptProjectInvitation({ requestId, userId }) {
  const normalizedRequestId = (requestId || "").trim();
  const normalizedUserId = (userId || "").trim();

  if (!normalizedRequestId) {
    const error = new Error("Request ID is required");
    error.code = "INVALID_REQUEST";
    throw error;
  }

  if (!normalizedUserId) {
    const error = new Error("User is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `
      SELECT id, project_id, recipient_id, status
      FROM project_requests
      WHERE id = $1 AND recipient_id = $2
      LIMIT 1
      `,
      [normalizedRequestId, normalizedUserId]
    );

    const request = requestResult.rows[0];

    if (!request) {
      const error = new Error("Project invitation not found");
      error.code = "REQUEST_NOT_FOUND";
      throw error;
    }

    if (request.status !== "pending") {
      const error = new Error("Only pending invitations can be accepted");
      error.code = "INVALID_REQUEST_STATUS";
      throw error;
    }

    const boardResult = await client.query(
      `
      SELECT id
      FROM board
      WHERE project_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [request.project_id]
    );

    const board = boardResult.rows[0];

    if (!board) {
      const error = new Error("Project board not found");
      error.code = "BOARD_NOT_FOUND";
      throw error;
    }

    const updateResult = await client.query(
      `
      UPDATE project_requests
      SET status = 'accepted', updated_at = now()
      WHERE id = $1
      RETURNING id, requester_id, recipient_id, project_id, status, requested_at, updated_at
      `,
      [normalizedRequestId]
    );

    await client.query(
      `
      INSERT INTO project_members (board_id, project_id, user_id, role)
      VALUES ($1, $2, $3, 'member')
      ON CONFLICT (project_id, user_id) DO NOTHING
      `,
      [board.id, request.project_id, normalizedUserId]
    );

    await client.query("COMMIT");
    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function declineProjectInvitation({ requestId, userId }) {
  const normalizedRequestId = (requestId || "").trim();
  const normalizedUserId = (userId || "").trim();

  if (!normalizedRequestId) {
    const error = new Error("Request ID is required");
    error.code = "INVALID_REQUEST";
    throw error;
  }

  if (!normalizedUserId) {
    const error = new Error("User is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const result = await pool.query(
    `
    UPDATE project_requests
    SET status = 'declined', updated_at = now()
    WHERE id = $1
      AND recipient_id = $2
      AND status = 'pending'
    RETURNING id, requester_id, recipient_id, project_id, status, requested_at, updated_at
    `,
    [normalizedRequestId, normalizedUserId]
  );

  if (result.rows.length === 0) {
    const existing = await pool.query(
      `
      SELECT id, status
      FROM project_requests
      WHERE id = $1 AND recipient_id = $2
      LIMIT 1
      `,
      [normalizedRequestId, normalizedUserId]
    );

    if (existing.rows.length === 0) {
      const error = new Error("Project invitation not found");
      error.code = "REQUEST_NOT_FOUND";
      throw error;
    }

    const error = new Error("Only pending invitations can be declined");
    error.code = "INVALID_REQUEST_STATUS";
    throw error;
  }

  return result.rows[0];
}

export async function getTaskCategories(projectId) {
  const normalizedId = (projectId || "").trim();

  if (!normalizedId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT
      tc.id,
      tc.project_id,
      tc.name,
      tc."position",
      COALESCE(
        json_agg(
          json_build_object(
            'id', t.id,
            'boardId', t.board_id,
            'categoryId', t.category_id,
            'title', t.title,
            'description', t.description,
            'priority', t.priority,
            'createdBy', t.created_by,
            'createdAt', t.created_at,
            'targetDate', t.target_date,
            'isPastDue', CASE
              WHEN t.target_date IS NOT NULL AND CURRENT_DATE > t.target_date THEN true
              ELSE false
            END,
            'position', t."position",
            'creator', json_build_object(
              'id', u.id,
              'firstName', u.first_name,
              'lastName', u.last_name,
              'email', u.email
            ),
            'assignees', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', au.id,
                    'firstName', au.first_name,
                    'lastName', au.last_name,
                    'email', au.email,
                    'profileImageBase64', au.profile_image_base64
                  ) ORDER BY au.first_name ASC, au.last_name ASC
                )
                FROM task_assignees ta
                JOIN users au ON ta.user_id = au.id
                WHERE ta.task_id = t.id
              ), '[]'::json
            ),
            'subtasks', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', st.id,
                    'title', st.title,
                    'createdBy', json_build_object(
                      'id', cu.id,
                      'firstName', cu.first_name,
                      'lastName', cu.last_name,
                      'email', cu.email
                    ),
                    'status', st.status,
                    'createdAt', st.created_at
                  ) ORDER BY st.created_at ASC
                )
                FROM subtasks st
                LEFT JOIN users cu ON st.created_by = cu.id
                WHERE st.task_id = t.id
              ), '[]'::json
            )
            ,
            'tags', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', tt.id,
                    'tagName', tt.tag_name,
                    'taskId', tt.task_id,
                    'projectId', tt.project_id
                  ) ORDER BY tt.tag_name ASC
                )
                FROM task_tags tt
                WHERE tt.task_id = t.id
              ), '[]'::json
            )
          )
          ORDER BY t."position" ASC, t.created_at ASC
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS tasks
    FROM tasks_categories tc
    LEFT JOIN LATERAL (
      SELECT b.id
      FROM board b
      WHERE b.project_id = tc.project_id
      ORDER BY b.created_at ASC
      LIMIT 1
    ) project_board ON true
    LEFT JOIN tasks t
      ON t.category_id = tc.id
      AND t.board_id = project_board.id
    LEFT JOIN users u
      ON t.created_by = u.id
    WHERE tc.project_id = $1::uuid
    GROUP BY tc.id, tc.project_id, tc.name, tc."position"
    ORDER BY tc."position" ASC
    `,
    [normalizedId]
  );

  return result.rows.map((r) => ({
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    position: r.position,
    tasks: r.tasks || [],
  }));
}

export async function createTaskCategory(input) {
  // Accept either createTaskCategory({ projectId, name, position, requesterId })
  // or createTaskCategory(projectIdString)
  let projectId = "";
  let name = "";
  let position = null;
  let requesterId = "";

  if (input && typeof input === "object") {
    projectId = (input.projectId || input.project_id || "").trim();
    name = (input.name || "").trim();
    requesterId = (input.requesterId || input.requester_id || "").trim();
    position = Number.isFinite(Number(input.position)) ? Number(input.position) : null;
  } else {
    projectId = (input || "").trim();
  }

  if (requesterId) {
    const access = await getProjectPermissionContext({ projectId, requesterId });
    if (!access.isOwner && !access.isAdmin && !access.settings.allow_member_add_board) {
      const error = new Error("Forbidden: task columns are disabled for members in this project");
      error.code = "PROJECT_FORBIDDEN";
      throw error;
    }
  }

  if (!projectId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  if (!name) {
    const error = new Error("name is required");
    error.code = "INVALID_NAME";
    throw error;
  }

  const boardResult = await pool.query(
    `
    SELECT id
    FROM board
    WHERE project_id = $1::uuid
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [projectId]
  );

  const board = boardResult.rows[0];

  if (!board) {
    const error = new Error("Board not found for this project");
    error.code = "BOARD_NOT_FOUND";
    throw error;
  }

  // determine position if not provided
  if (position === null) {
    const posRes = await pool.query(
      `SELECT COALESCE(MAX("position"), 0) AS maxpos FROM tasks_categories WHERE project_id = $1::uuid`,
      [projectId]
    );
    position = (posRes.rows[0]?.maxpos || 0) + 1;
  }

  const insertResult = await pool.query(
    `
    INSERT INTO tasks_categories (board_id, project_id, name, "position")
    VALUES ($1::uuid, $2::uuid, $3, $4)
    RETURNING id, project_id, name, "position"
    `,
    [board.id, projectId, name, position]
  );

  const row = insertResult.rows[0];
  return { id: row.id, projectId: row.project_id, name: row.name, position: row.position };
}

export async function assignTaskToOthers({ taskId, memberId, requesterId }) {
  const access = await getTaskPermissionContext({ taskId, requesterId });
  const isSelfAssignment = String(memberId || "") === String(requesterId || "");
  const canSelfTake = access.isOwner || access.isAdmin || access.settings.allow_member_take_task;
  const canAssignOthers = access.isOwner || access.isAdmin || access.isManager || (access.settings.allow_member_take_task && access.settings.allow_assign_task_to_member);

  if (isSelfAssignment && !canSelfTake) {
    const error = new Error("Forbidden: self-assigning tasks is disabled for your role in this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  if (!isSelfAssignment && !canAssignOthers) {
    const error = new Error("Forbidden: assigning members to tasks is disabled for your role in this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const assignTask = await pool.query(
    `
    INSERT INTO task_assignees (task_id, user_id)
    VALUES ($1, $2::uuid)
    RETURNING id, task_id, user_id
    `,
    [taskId, memberId]
  );

  const row = assignTask.rows[0];
  return {
    id: row.id,
    taskId: row.task_id,
    memberId: row.user_id
  };
}

export async function unassignTaskFromMember({ taskId, memberId, requesterId }) {
  const access = await getTaskPermissionContext({ taskId, requesterId });
  if (!access.isOwner && !access.isAdmin && !access.isManager) {
    const error = new Error("Forbidden: you do not have permission to unassign other members from this task");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const deleteResult = await pool.query(
    `
    DELETE FROM task_assignees
    WHERE task_id = $1
      AND user_id = $2::uuid
    RETURNING id, task_id, user_id
    `,
    [taskId, memberId]
  );

  const row = deleteResult.rows[0];
  if (!row) {
    const error = new Error("Task is not assigned to this member");
    error.code = "TASK_NOT_ASSIGNED";
    throw error;
  }

  return {
    id: row.id,
    taskId: row.task_id,
    memberId: row.user_id,
  };
}

export async function takeProjectTask({ taskId, userId }) {
  const access = await getTaskPermissionContext({ taskId, requesterId: userId });
  if (!access.isOwner && !access.isAdmin && !access.settings.allow_member_take_task) {
    const error = new Error("Forbidden: taking tasks is disabled for members in this project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const insertTakenTask = await pool.query(
    `
    INSERT INTO task_assignees (task_id, user_id)
    VALUES ($1, $2::uuid)
    RETURNING id, task_id, user_id
    `,
    [taskId, userId]
  );

  const row = insertTakenTask.rows[0];
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id
  };
}

export async function unassignTaskFromSelf({ taskId, userId }) {
  const deleteResult = await pool.query(
    `
    DELETE FROM task_assignees
    WHERE task_id = $1
      AND user_id = $2::uuid
    RETURNING id, task_id, user_id
    `,
    [taskId, userId]
  );

  const row = deleteResult.rows[0];
  if (!row) {
    const error = new Error("Task is not assigned to this user");
    error.code = "TASK_NOT_ASSIGNED";
    throw error;
  }

  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
  };
}

export async function deleteTask({ taskId, requesterId }) {
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

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (!access.isOwner) {
    if (access.isAdmin) {
      if (!access.settings.allow_admin_manage_tasks) {
        const error = new Error("Forbidden: deleting tasks is disabled for admins in this project");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    } else if (!access.settings.allow_member_delete_task) {
      const error = new Error("Forbidden: deleting tasks is disabled for members in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM reviews WHERE task_id = $1::int`,
      [normalizedTaskId]
    );

    await client.query(
      `DELETE FROM task_comments_replies WHERE task_id = $1::int`,
      [normalizedTaskId]
    );

    await client.query(
      `DELETE FROM task_comments WHERE task_id = $1::int`,
      [normalizedTaskId]
    );

    await client.query(
      `DELETE FROM task_assignees WHERE task_id = $1::int`,
      [normalizedTaskId]
    );

    await client.query(
      `DELETE FROM task_tags WHERE task_id = $1::int`,
      [normalizedTaskId]
    );

    await client.query(
      `DELETE FROM subtasks WHERE task_id = $1::int`,
      [normalizedTaskId]
    );

    const deleteResult = await client.query(
      `DELETE FROM tasks WHERE id = $1::int RETURNING id`,
      [normalizedTaskId]
    );

    if (deleteResult.rows.length === 0) {
      const error = new Error("Task not found");
      error.code = "TASK_NOT_FOUND";
      throw error;
    }

    await client.query("COMMIT");
    return { taskId: deleteResult.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getProjectTags(projectId) {
  const normalizedProjectId = (projectId || "").trim();

  if (!normalizedProjectId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT id, task_id, tag_name, project_id
    FROM task_tags
    WHERE project_id = $1::uuid
    ORDER BY tag_name ASC
    `,
    [normalizedProjectId]
  );

  return result.rows.map((r) => ({ id: r.id, taskId: r.task_id, tagName: r.tag_name, projectId: r.project_id }));
}

export async function getTaskTags(taskId) {
  const normalizedTaskId = Number(taskId);

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  const result = await pool.query(
    `
    SELECT id, task_id, tag_name, project_id
    FROM task_tags
    WHERE task_id = $1::int
    ORDER BY tag_name ASC
    `,
    [normalizedTaskId]
  );

  return result.rows.map((r) => ({ id: r.id, taskId: r.task_id, tagName: r.tag_name, projectId: r.project_id }));
}

export async function createTaskTag({ taskId, tagName, projectId, requesterId }) {
  const normalizedTaskId = Number(taskId);
  const normalizedTag = (tagName || "").trim();
  const normalizedProjectId = (projectId || "").trim();
  const normalizedRequesterId = (requesterId || "").trim();

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!normalizedTag) {
    const error = new Error("tagName is required");
    error.code = "INVALID_TAG";
    throw error;
  }

  if (!normalizedProjectId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (access.projectId !== normalizedProjectId) {
    const error = new Error("Tag does not belong to this project");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  if (!access.isOwner && !access.isAdmin) {
    if (!access.settings.allow_member_create_tag) {
      const error = new Error("Forbidden: members cannot create tags in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }

    const isCreatorOrAssignee = access.isCreator || access.isAssignee;
    if (!isCreatorOrAssignee) {
      const error = new Error("Forbidden: only the task creator or assignees can create tags");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const countRes = await pool.query(
    `SELECT COUNT(*) AS cnt FROM task_tags WHERE task_id = $1::int`,
    [normalizedTaskId]
  );
  const currentCount = Number(countRes.rows[0]?.cnt || 0);

  if (currentCount >= 5) {
    const error = new Error("A task may have up to 5 tags");
    error.code = "MAX_TAGS";
    throw error;
  }

  const dupRes = await pool.query(
    `SELECT id FROM task_tags WHERE task_id = $1::int AND LOWER(tag_name) = LOWER($2) LIMIT 1`,
    [normalizedTaskId, normalizedTag]
  );

  if (dupRes.rows.length > 0) {
    const error = new Error("Tag already exists for this task");
    error.code = "TAG_EXISTS";
    throw error;
  }

  const insertRes = await pool.query(
    `
    INSERT INTO task_tags (task_id, tag_name, project_id)
    VALUES ($1::int, $2, $3::uuid)
    RETURNING id, task_id, tag_name, project_id
    `,
    [normalizedTaskId, normalizedTag, normalizedProjectId]
  );

  const row = insertRes.rows[0];
  return { id: row.id, taskId: row.task_id, tagName: row.tag_name, projectId: row.project_id };
}

export async function deleteTaskTag({ tagId, requesterId }) {
  const normalizedTagId = Number(tagId);
  const normalizedRequesterId = (requesterId || "").trim();

  if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
    const error = new Error("tagId is required");
    error.code = "INVALID_TAG";
    throw error;
  }

  const tagAccessResult = await pool.query(
    `
    SELECT tt.task_id, tc.project_id
    FROM task_tags tt
    JOIN tasks t ON t.id = tt.task_id
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE tt.id = $1
    LIMIT 1
    `,
    [normalizedTagId]
  );

  const tagAccessRow = tagAccessResult.rows[0];
  if (!tagAccessRow) {
    const error = new Error("Tag not found");
    error.code = "TAG_NOT_FOUND";
    throw error;
  }

  const taskAccess = await getTaskPermissionContext({ taskId: tagAccessRow.task_id, requesterId: normalizedRequesterId });
  if (!taskAccess.isOwner && !taskAccess.isAdmin) {
    if (!taskAccess.settings.allow_member_create_tag) {
      const error = new Error("Forbidden: members cannot delete tags in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }

    const isCreatorOrAssignee = taskAccess.isCreator || taskAccess.isAssignee;
    if (!isCreatorOrAssignee) {
      const error = new Error("Forbidden: only the task creator or assignees can delete tags");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const result = await pool.query(
    `
    DELETE FROM task_tags
    WHERE id = $1
    RETURNING id, task_id, tag_name, project_id
    `,
    [normalizedTagId]
  );

  const row = result.rows[0];
  if (!row) {
    const error = new Error("Tag not found");
    error.code = "TAG_NOT_FOUND";
    throw error;
  }

  return { id: row.id, taskId: row.task_id, tagName: row.tag_name, projectId: row.project_id };
}

export async function updateSubtask({ taskId, subtaskId, requesterId, status, title }) {
  const normalizedTaskId = Number(taskId);
  const normalizedSubtaskId = Number(subtaskId);
  const normalizedRequesterId = (requesterId || "").toString();
  const rawStatus = status == null ? null : String(status || "").trim();
  const normalizedTitle = title == null ? null : String(title || "").trim();

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!Number.isInteger(normalizedSubtaskId) || normalizedSubtaskId <= 0) {
    const error = new Error("subtaskId is required");
    error.code = "INVALID_SUBTASK";
    throw error;
  }

  if (!normalizedRequesterId) {
    const error = new Error("requesterId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  if (rawStatus == null && normalizedTitle == null) {
    const error = new Error("No update fields provided");
    error.code = "INVALID_PAYLOAD";
    throw error;
  }

  // Permission check
  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (!access.isOwner) {
    if (access.isAdmin) {
      if (!access.settings.allow_admin_manage_tasks) {
        const error = new Error("Forbidden: editing tasks is disabled for admins in this project");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    } else if (!access.settings.allow_member_edit_task) {
      const error = new Error("Forbidden: editing subtasks is disabled for members in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const client = await pool.connect();
  try {
    // Determine allowed values for the status column (enum or check constraint)
    let allowedStatuses = null;

    try {
      // 1) If status column is enum, fetch enum labels
      const typeRes = await client.query(
        `
        SELECT t.typtype, t.oid
        FROM pg_attribute a
        JOIN pg_type t ON a.atttypid = t.oid
        WHERE a.attrelid = $1::regclass AND a.attname = $2
        LIMIT 1
        `,
        ["subtasks", "status"]
      );

      if (typeRes.rows && typeRes.rows[0]) {
        const typtype = typeRes.rows[0].typtype;
        const typeOid = typeRes.rows[0].oid;
        if (typtype === "e") {
          const enumRes = await client.query(
            `SELECT enumlabel FROM pg_enum WHERE enumtypid = $1 ORDER BY enumsortorder`,
            [typeOid]
          );
          allowedStatuses = enumRes.rows.map((r) => String(r.enumlabel));
        }
      }
    } catch (innerErr) {
      // ignore and try constraint parsing
    }

    if (!allowedStatuses) {
      try {
        const consRes = await client.query(
          `SELECT pg_get_constraintdef(c.oid) AS def FROM pg_constraint c WHERE c.conrelid = $1::regclass AND c.contype = 'c'`,
          ["subtasks"]
        );

        if (consRes.rows && consRes.rows.length) {
          for (const r of consRes.rows) {
            const def = String(r.def || "");
            // look for IN (...) pattern
            const m = def.match(/IN\s*\(([^)]+)\)/i);
            if (m && m[1]) {
              const parts = m[1].split(/\s*,\s*/).map((p) => {
                let v = String(p || "");
                // remove any ::type suffix like ::character varying
                v = v.replace(/::.*$/g, "");
                // strip surrounding single/double quotes
                v = v.replace(/^['"]+|['"]+$/g, "");
                return v.trim();
              });
              if (parts.length) {
                allowedStatuses = parts;
                break;
              }
            }

            // look for ARRAY[...] pattern
            const m2 = def.match(/ARRAY\s*\[([^\]]+)\]/i);
            if (m2 && m2[1]) {
              const parts = m2[1].split(/\s*,\s*/).map((p) => {
                let v = String(p || "");
                v = v.replace(/::.*$/g, "");
                v = v.replace(/^['"]+|['"]+$/g, "");
                return v.trim();
              });
              if (parts.length) {
                allowedStatuses = parts;
                break;
              }
            }
          }
        }
      } catch (innerErr) {
        // ignore
      }
    }

    // Fallback: read distinct values present in the table (helps infer allowed values)
    if (!allowedStatuses) {
      try {
        const distinctRes = await client.query(`SELECT DISTINCT status FROM subtasks WHERE status IS NOT NULL LIMIT 20`);
        if (distinctRes.rows && distinctRes.rows.length) {
          allowedStatuses = distinctRes.rows.map((r) => String(r.status));
        }
      } catch (innerErr) {
        // ignore
      }
    }

    // If we discovered allowed statuses, attempt to map common synonyms
    let chosenStatus = null;
    if (rawStatus != null) {
      const lowerRaw = rawStatus.toLowerCase();

      // Quick canonical mapping for the most common values to avoid false negatives
      const canonicalCompleted = new Set(["completed", "done", "finished", "complete", "closed"]);
      const canonicalUnfinished = new Set(["unfinished", "open", "todo", "incomplete", "not started", "not_started"]);

      if (canonicalCompleted.has(lowerRaw)) {
        // Prefer matching an allowedStatus that looks like 'finished'/'done'/etc., otherwise fall back to the canonical 'finished'
        if (allowedStatuses && allowedStatuses.length) {
          const found = allowedStatuses.find((s) => {
            const low = String(s).toLowerCase();
            return low === 'finished' || low.includes('fin') || low.includes('done') || low.includes('complete') || low.includes('closed');
          });
          if (found) chosenStatus = found;
          else chosenStatus = 'finished';
        } else {
          chosenStatus = 'finished';
        }
      } else if (canonicalUnfinished.has(lowerRaw)) {
        if (allowedStatuses && allowedStatuses.length) {
          const found = allowedStatuses.find((s) => {
            const low = String(s).toLowerCase();
            return low === 'unfinished' || low.includes('un') || low.includes('open') || low.includes('todo') || low.includes('incom') || low.includes('not');
          });
          if (found) chosenStatus = found;
          else chosenStatus = 'unfinished';
        } else {
          chosenStatus = 'unfinished';
        }
      }

      if (!chosenStatus) {
        if (allowedStatuses && allowedStatuses.length) {
          // direct match (case-insensitive)
          const direct = allowedStatuses.find((s) => String(s).toLowerCase() === lowerRaw);
          if (direct) chosenStatus = direct;

          if (!chosenStatus) {
            // Synonym mapping for other variants
            const synonyms = {
              completed: ["completed", "done", "finished", "complete", "closed"],
              unfinished: ["unfinished", "open", "todo", "incomplete", "not started", "not_started"],
            };

            for (const allowed of allowedStatuses) {
              const lowAllowed = String(allowed).toLowerCase();
              if (synonyms.completed.includes(lowAllowed) && synonyms.completed.includes(lowerRaw)) {
                chosenStatus = allowed;
                break;
              }
              if (synonyms.unfinished.includes(lowAllowed) && synonyms.unfinished.includes(lowerRaw)) {
                chosenStatus = allowed;
                break;
              }
              // match if allowed contains 'done' and raw is 'completed'
              if (lowerRaw === 'completed' && (lowAllowed.includes('done') || lowAllowed.includes('finish') || lowAllowed.includes('complete'))) {
                chosenStatus = allowed;
                break;
              }
              if ((lowerRaw === 'unfinished' || lowerRaw === 'open') && (lowAllowed.includes('un') || lowAllowed.includes('open') || lowAllowed.includes('todo') || lowAllowed.includes('incom') || lowAllowed.includes('not'))) {
                chosenStatus = allowed;
                break;
              }
            }
          }
        } else {
          // No allowedStatuses discovered; just use rawStatus
          chosenStatus = rawStatus;
        }
      }
    }

    if (rawStatus != null && chosenStatus == null) {
      const error = new Error(`Invalid status value: ${rawStatus}. Allowed: ${allowedStatuses ? allowedStatuses.join(',') : 'unknown'}`);
      error.code = 'INVALID_STATUS';
      throw error;
    }

    // enforce reasonable max lengths to avoid DB truncation errors (status column is varchar(20))
    if (chosenStatus != null) {
      chosenStatus = String(chosenStatus || "").trim();
      if (chosenStatus.length > 20) {
        console.warn(`updateSubtask: truncating status to 20 chars (was ${chosenStatus.length})`);
        chosenStatus = chosenStatus.slice(0, 20);
      }
    }

    if (normalizedTitle != null) {
      normalizedTitle = String(normalizedTitle || "").trim();
      // assume title column allows larger values; cap to 1024 to be safe
      if (normalizedTitle.length > 1024) {
        console.warn(`updateSubtask: truncating title to 1024 chars (was ${normalizedTitle.length})`);
        normalizedTitle = normalizedTitle.slice(0, 1024);
      }
    }

    let result;
    try {
      result = await client.query(
        `
        UPDATE subtasks
        SET
          status = COALESCE(NULLIF($3::text, ''), status),
          title = COALESCE(NULLIF($4::text, ''), title)
        WHERE id = $1::int AND task_id = $2::int
        RETURNING id, task_id, title, created_by, status, created_at;
        `,
        [normalizedSubtaskId, normalizedTaskId, chosenStatus, normalizedTitle]
      );
    } catch (dbErr) {
      // Check constraint violation (invalid status)
      if (dbErr && (dbErr.code === '23514' || String(dbErr.constraint || '').toLowerCase().includes('status'))) {
        const allowed = allowedStatuses && allowedStatuses.length ? allowedStatuses.join(',') : 'unknown';
        const e = new Error(`Invalid status value: ${rawStatus}. Allowed: ${allowed}`);
        e.code = 'INVALID_STATUS';
        throw e;
      }
      throw dbErr;
    }

    const row = result.rows[0];
    if (!row) {
      const error = new Error("Subtask not found");
      error.code = "SUBTASK_NOT_FOUND";
      throw error;
    }

    return {
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      createdBy: row.created_by,
      status: row.status,
      createdAt: row.created_at,
    };
  } finally {
    client.release();
  }
}

export async function updateTaskName({ taskId, requesterId, name }) {
  const normalizedTaskId = Number(taskId);
  const normalizedRequesterId = (requesterId || "").toString();
  const trimmedName = String(name || "").trim();

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

  if (!trimmedName) {
    const error = new Error("name is required");
    error.code = "INVALID_NAME";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (!access.isOwner) {
    if (access.isAdmin) {
      if (!access.settings.allow_admin_manage_tasks) {
        const error = new Error("Forbidden: editing tasks is disabled for admins in this project");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    } else if (!access.settings.allow_member_edit_task) {
      const error = new Error("Forbidden: editing tasks is disabled for members in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const updateResult = await pool.query(
    `
    UPDATE tasks
    SET title = $2
    WHERE id = $1::int
    RETURNING id, title
    `,
    [normalizedTaskId, trimmedName]
  );

  const updated = updateResult.rows[0];
  return { id: updated.id, title: updated.title };
}



export async function updateTaskDescription({ taskId, requesterId, description }) {
  const normalizedTaskId = Number(taskId);
  const normalizedRequesterId = (requesterId || "").trim();
  const trimmedDesc = String(description || "").trim();

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

  if (!trimmedDesc) {
    const error = new Error("description is required");
    error.code = "INVALID_DESCRIPTION";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (!access.isOwner) {
    if (access.isAdmin) {
      if (!access.settings.allow_admin_manage_tasks) {
        const error = new Error("Forbidden: editing tasks is disabled for admins in this project");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    } else if (!access.settings.allow_member_edit_task) {
      const error = new Error("Forbidden: editing tasks is disabled for members in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const updateResult = await pool.query(
    `
    UPDATE tasks
    SET description = $2
    WHERE id = $1::int
    RETURNING id, description
    `,
    [normalizedTaskId, trimmedDesc]
  );

  const updated = updateResult.rows[0];
  return { id: updated.id, description: updated.description };
}

export async function updateTaskPriority({ taskId, requesterId, priority }) {
  const normalizedTaskId = Number(taskId);
  const normalizedRequesterId = (requesterId || "").toString();
  const normalizedPriority = String(priority || "").trim().toLowerCase();

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

  const allowedPriorities = new Set(["unset", "low", "medium", "high", "urgent", "critical"]);
  let priorityValue = normalizedPriority || "unset";
  if (!allowedPriorities.has(priorityValue)) {
    const error = new Error("priority must be one of: unset, low, medium, high, urgent");
    error.code = "INVALID_PRIORITY";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (!access.isOwner) {
    if (access.isAdmin) {
      if (!access.settings.allow_admin_manage_tasks) {
        const error = new Error("Forbidden: editing tasks is disabled for admins in this project");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    } else if (!access.settings.allow_member_edit_task) {
      const error = new Error("Forbidden: editing tasks is disabled for members in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const dbPriority = priorityValue === "urgent" ? "critical" : priorityValue;

  const result = await pool.query(
    `
    UPDATE tasks
    SET priority = $2
    WHERE id = $1::int
    RETURNING id, priority
    `,
    [normalizedTaskId, dbPriority]
  );

  const row = result.rows[0];
  if (!row) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  return {
    id: row.id,
    priority: row.priority === "critical" ? "urgent" : row.priority,
  };
}

export async function updateTaskTargetDate({ taskId, requesterId, targetDate }) {
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

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedRequesterId });
  if (!access.isOwner) {
    if (access.isAdmin) {
      if (!access.settings.allow_admin_manage_tasks) {
        const error = new Error("Forbidden: editing tasks is disabled for admins in this project");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    } else if (!access.settings.allow_member_edit_task) {
      const error = new Error("Forbidden: editing tasks is disabled for members in this project");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }
  }

  const normalizedTargetDate = targetDate === null ? null : String(targetDate || "").trim();

  const result = await pool.query(
    `
    UPDATE tasks
    SET
      target_date = $2::date,
      is_past_due = CASE
        WHEN $2::date IS NOT NULL AND CURRENT_DATE > $2::date THEN true
        ELSE false
      END
    WHERE id = $1
    RETURNING id, target_date, is_past_due
    `,
    [normalizedTaskId, normalizedTargetDate]
  );

  const row = result.rows[0];
  if (!row) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  return {
    id: row.id,
    targetDate: row.target_date,
    isPastDue: row.is_past_due,
  };
}

export async function updateTaskStatus({ taskId, userId, categoryId }) {
  const normalizedUserId = (userId || "").trim();
  const normalizedTaskId = Number(taskId);
  const normalizedCategoryId = Number(categoryId);

  if (!normalizedUserId) {
    const error = new Error("userId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
    const error = new Error("taskId is required");
    error.code = "INVALID_TASK";
    throw error;
  }

  if (!Number.isInteger(normalizedCategoryId) || normalizedCategoryId <= 0) {
    const error = new Error("categoryId is required");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  const taskResult = await pool.query(
    `
    SELECT t.id, t.category_id, tc.project_id, tc.name AS category_name
    FROM tasks t
    JOIN tasks_categories tc ON tc.id = t.category_id
    WHERE t.id = $1
    LIMIT 1
    `,
    [normalizedTaskId]
  );

  const taskRow = taskResult.rows[0];
  if (!taskRow) {
    const error = new Error("Task not found");
    error.code = "TASK_NOT_FOUND";
    throw error;
  }

  // Prevent tasks in Done from being moved to another column
  const currentCategoryName = String(taskRow.category_name || "").trim().toLowerCase();
  if (currentCategoryName === "done") {
    const error = new Error("Tasks in Done cannot be moved to another status");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  const access = await getTaskPermissionContext({ taskId: normalizedTaskId, requesterId: normalizedUserId });
  if (access.isAdmin && !access.settings.allow_admin_manage_tasks) {
    const error = new Error("Forbidden: editing tasks is disabled for admins in this project");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  if (!access.isOwner && !access.isAdmin && !access.isManager && !access.isAssignee) {
    const error = new Error("Forbidden: only assigned users can move this task");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  const targetCategoryResult = await pool.query(
    `
    SELECT id, name
    FROM tasks_categories
    WHERE id = $1
      AND project_id = $2::uuid
    LIMIT 1
    `,
    [normalizedCategoryId, taskRow.project_id]
  );

  if (targetCategoryResult.rows.length === 0) {
    const error = new Error("Target category not found in this project");
    error.code = "INVALID_CATEGORY";
    throw error;
  }

  const targetCategory = targetCategoryResult.rows[0];
  const targetCategoryName = String(targetCategory.name || "").trim().toLowerCase();
  const isDoneCategory = targetCategoryName === "done";
  const isToDoSource = currentCategoryName === "to_do" || currentCategoryName === "todo";
  const isToReviewSource = currentCategoryName === "to_review" || currentCategoryName === "to review";
  const isInProgressSource = currentCategoryName === "in_progress" || currentCategoryName === "in progress";
  const isToDoTarget = targetCategoryName === "to_do" || targetCategoryName === "todo";

  if (!access.isOwner && !access.isAdmin && !access.isManager && access.isAssignee) {
    if (isDoneCategory && (isToDoSource || isInProgressSource)) {
      const error = new Error("Members cannot move tasks directly to Done. Tasks must be reviewed first.");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }

    // Check if moving FROM in progress TO done (always restricted for members)
    if (isInProgressSource && isDoneCategory) {
      const error = new Error("Members cannot move tasks directly from In Progress to Done. Tasks must be reviewed first.");
      error.code = "TASK_FORBIDDEN";
      throw error;
    }

    // Check if moving FROM to_review to done or todo (needs allow_member_review permission)
    if (isToReviewSource && (isDoneCategory || isToDoTarget)) {
      const canApproveReview = access.settings && access.settings.allow_member_review === true;
      if (!canApproveReview) {
        const error = new Error("You don't have permission to approve or reject tasks.");
        error.code = "TASK_FORBIDDEN";
        throw error;
      }
    }
  }

  const movedTaskResult = await pool.query(
    `
    UPDATE tasks
    SET category_id = $2
    WHERE id = $1
    RETURNING id, category_id
    `,
    [normalizedTaskId, normalizedCategoryId]
  );

  const movedTask = movedTaskResult.rows[0];
  if (!movedTask) {
    const error = new Error("Failed to move task");
    error.code = "MOVE_FAILED";
    throw error;
  }

  return {
    id: movedTask.id,
    categoryId: movedTask.category_id,
  };
}

// export async function getSubtasksByTask(taskId) {
//   const client = await pool.connect();

//   try {
//     const normalizedTaskId = Number(taskId);
//     if (!Number.isInteger(normalizedTaskId) || normalizedTaskId <= 0) {
//       const error = new Error("taskId is required");
//       error.code = "INVALID_TASK";
//       throw error;
//     }

//     const result = await client.query(
//       `
//       SELECT id, task_id, title, created_by, status, created_at
//       FROM subtasks
//       WHERE task_id = $1::int
//       ORDER BY created_at ASC
//       `,
//       [normalizedTaskId]
//     );

//     return result.rows.map((row) => ({
//       id: row.id,
//       taskId: row.task_id,
//       title: row.title,
//       createdBy: row.created_by,
//       status: row.status,
//       createdAt: row.created_at,
//     }));
//   } finally {
//     client.release();
//   }
// }

// New methods for project deletion and member role management

export async function deleteProject({ projectId, requesterId }) {
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

  const projectResult = await pool.query(
    `
    SELECT id, owner
    FROM projects
    WHERE id = $1::uuid
    LIMIT 1
    `,
    [normalizedProjectId]
  );

  if (projectResult.rows.length === 0) {
    const error = new Error("Project not found");
    error.code = "PROJECT_NOT_FOUND";
    throw error;
  }

  const project = projectResult.rows[0];

  // Only project owner can delete
  if (project.owner !== normalizedRequesterId) {
    const error = new Error("Forbidden: only project owner can delete the project");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  const client = await pool.connect();

  try {
    // Just delete the project - CASCADE will handle related tables
    const deleteResult = await client.query(
      `DELETE FROM projects WHERE id = $1::uuid RETURNING id`,
      [normalizedProjectId]
    );

    if (deleteResult.rows.length === 0) {
      const error = new Error("Project not found");
      error.code = "PROJECT_NOT_FOUND";
      throw error;
    }

    return { id: deleteResult.rows[0].id };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

export async function removeMemberFromProject({ projectId, memberId, requesterId }) {
  const normalizedProjectId = (projectId || "").trim();
  const normalizedMemberId = (memberId || "").trim();
  const normalizedRequesterId = (requesterId || "").trim();

  if (!normalizedProjectId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  if (!normalizedMemberId) {
    const error = new Error("memberId is required");
    error.code = "INVALID_MEMBER";
    throw error;
  }

  if (!normalizedRequesterId) {
    const error = new Error("requesterId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const access = await getProjectPermissionContext({
    projectId: normalizedProjectId,
    requesterId: normalizedRequesterId,
  });

  // Check if requester has permission to remove members
  const canRemove =
    access.isOwner ||
    (access.isAdmin && access.settings.allow_admin_remove_member);

  if (!canRemove) {
    const error = new Error("Forbidden: you do not have permission to remove members");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  // Cannot remove owner
  const memberResult = await pool.query(
    `
    SELECT pm.role
    FROM project_members pm
    WHERE pm.project_id = $1::uuid
      AND pm.user_id = $2::uuid
    LIMIT 1
    `,
    [normalizedProjectId, normalizedMemberId]
  );

  if (memberResult.rows.length === 0) {
    const error = new Error("Member not found in this project");
    error.code = "MEMBER_NOT_FOUND";
    throw error;
  }

  const member = memberResult.rows[0];

  if (member.role === "owner") {
    const error = new Error("Cannot remove the project owner");
    error.code = "CANNOT_REMOVE_OWNER";
    throw error;
  }

  // Cannot remove yourself
  if (normalizedMemberId === normalizedRequesterId) {
    const error = new Error("Cannot remove yourself from the project");
    error.code = "CANNOT_REMOVE_SELF";
    throw error;
  }

  const deleteResult = await pool.query(
    `
    DELETE FROM project_members
    WHERE project_id = $1::uuid AND user_id = $2::uuid
    RETURNING project_id, user_id
    `,
    [normalizedProjectId, normalizedMemberId]
  );

  return { projectId: normalizedProjectId, memberId: normalizedMemberId };
}

export async function updateMemberRole({ projectId, memberId, newRole, requesterId }) {
  const normalizedProjectId = (projectId || "").trim();
  const normalizedMemberId = (memberId || "").trim();
  const normalizedNewRole = (newRole || "").trim().toLowerCase();
  const normalizedRequesterId = (requesterId || "").trim();

  if (!normalizedProjectId) {
    const error = new Error("projectId is required");
    error.code = "INVALID_PROJECT";
    throw error;
  }

  if (!normalizedMemberId) {
    const error = new Error("memberId is required");
    error.code = "INVALID_MEMBER";
    throw error;
  }

  if (!["owner", "admin", "member"].includes(normalizedNewRole)) {
    const error = new Error("newRole must be 'owner', 'admin', or 'member'");
    error.code = "INVALID_ROLE";
    throw error;
  }

  if (!normalizedRequesterId) {
    const error = new Error("requesterId is required");
    error.code = "INVALID_USER";
    throw error;
  }

  const access = await getProjectPermissionContext({
    projectId: normalizedProjectId,
    requesterId: normalizedRequesterId,
  });

  // Only owner can promote/demote
  if (!access.isOwner) {
    const error = new Error("Forbidden: only project owner can change member roles");
    error.code = "PROJECT_FORBIDDEN";
    throw error;
  }

  // Cannot change the project owner
  if (normalizedMemberId === access.ownerId) {
    const error = new Error("Cannot change the project owner's role");
    error.code = "CANNOT_CHANGE_OWNER";
    throw error;
  }

  const memberResult = await pool.query(
    `
    SELECT pm.role
    FROM project_members pm
    WHERE pm.project_id = $1::uuid
      AND pm.user_id = $2::uuid
    LIMIT 1
    `,
    [normalizedProjectId, normalizedMemberId]
  );

  if (memberResult.rows.length === 0) {
    const error = new Error("Member not found in this project");
    error.code = "MEMBER_NOT_FOUND";
    throw error;
  }

  const updateResult = await pool.query(
    `
    UPDATE project_members
    SET role = $3
    WHERE project_id = $1::uuid AND user_id = $2::uuid
    RETURNING project_id, user_id, role
    `,
    [normalizedProjectId, normalizedMemberId, normalizedNewRole]
  );

  const row = updateResult.rows[0];
  return {
    projectId: row.project_id,
    memberId: row.user_id,
    role: row.role,
  };
}