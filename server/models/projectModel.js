import { pool } from "../config/db.js";

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
        'role', pm.role
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
                'role', pmr.role
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


export async function createTask(taskData) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const projectId = (taskData?.projectId || taskData?.project_id || "").trim();
    const categoryIdRaw = taskData?.categoryId ?? taskData?.category_id;
    const categoryId = Number(categoryIdRaw);
    const title = (taskData?.taskName || taskData?.title || "").trim();
    const description = (taskData?.taskDescription || taskData?.description || "").trim();
    const createdBy = (taskData?.createdBy || taskData?.created_by || "").trim();

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
    const priority = "unset";

    const newTaskResult = await client.query(
      `
      INSERT INTO tasks (board_id, category_id, title, description, priority, created_by, position)
      VALUES ($1::uuid, $2, $3, $4, $5, $6::uuid, $7)
      RETURNING id, board_id, category_id, title, description, priority, created_by, position
      `,
      [board.id, categoryId, title, description || null, priority, createdBy, position]
    );

    await client.query("COMMIT");

    const row = newTaskResult.rows[0];
    return {
      id: row.id,
      boardId: row.board_id,
      categoryId: row.category_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
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
        projectData.description || null,
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
        allow_member_add_member
      )
      VALUES ($1, true, true, true, true, true, true)
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
      INSERT INTO tasks_categories (project_id, name, "position")
      VALUES
        ($1, 'todo', 1),
        ($1, 'in_progress', 2),
        ($1, 'done', 3)
      RETURNING id, project_id, name, "position"
      `,
      [project.id]
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
    SELECT
      COALESCE(allow_member_create_task, true) AS allow_member_create_task,
      COALESCE(allow_member_take_task, true) AS allow_member_take_task,
      COALESCE(allow_member_edit_task, true) AS allow_member_edit_task,
      COALESCE(allow_member_delete_task, true) AS allow_member_delete_task,
      COALESCE(allow_member_add_board, true) AS allow_member_add_board,
      COALESCE(allow_member_add_member, true) AS allow_member_add_member,
      COALESCE(allow_assign_task_to_member, false) AS allow_assign_task_to_member
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
      allow_assign_task_to_member: false
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
    "allow_assign_task_to_member"
  ];

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
      allow_assign_task_to_member
    `,
    [normalizedProjectId, value]
  );

  return result.rows[0];
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
      AND p.owner = $1::uuid
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
                    'email', au.email
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
  // Accept either createTaskCategory({ projectId, name, position })
  // or createTaskCategory(projectIdString)
  let projectId = "";
  let name = "";
  let position = null;

  if (input && typeof input === "object") {
    projectId = (input.projectId || input.project_id || "").trim();
    name = (input.name || "").trim();
    position = Number.isFinite(Number(input.position)) ? Number(input.position) : null;
  } else {
    projectId = (input || "").trim();
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
    INSERT INTO tasks_categories (project_id, name, "position")
    VALUES ($1::uuid, $2, $3)
    RETURNING id, project_id, name, "position"
    `,
    [projectId, name, position]
  );

  const row = insertResult.rows[0];
  return { id: row.id, projectId: row.project_id, name: row.name, position: row.position };
}

export async function assignTaskToOthers({ taskId, memberId }) {
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

export async function unassignTaskFromMember({ taskId, memberId }) {
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

export async function createTaskTag({ taskId, tagName, projectId }) {
  const normalizedTaskId = Number(taskId);
  const normalizedTag = (tagName || "").trim();
  const normalizedProjectId = (projectId || "").trim();

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

export async function deleteTaskTag(tagId) {
  const normalizedTagId = Number(tagId);

  if (!Number.isInteger(normalizedTagId) || normalizedTagId <= 0) {
    const error = new Error("tagId is required");
    error.code = "INVALID_TAG";
    throw error;
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
    SELECT t.id, t.category_id, tc.project_id
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

  const assignmentResult = await pool.query(
    `
    SELECT 1
    FROM task_assignees
    WHERE task_id = $1
      AND user_id = $2::uuid
    LIMIT 1
    `,
    [normalizedTaskId, normalizedUserId]
  );

  if (assignmentResult.rows.length === 0) {
    const error = new Error("Forbidden: you can only move tasks assigned to you");
    error.code = "TASK_FORBIDDEN";
    throw error;
  }

  const targetCategoryResult = await pool.query(
    `
    SELECT id
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