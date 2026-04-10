import { pool } from "../config/db.js";

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
    SELECT id, name, description, owner, created_by, created_at
    FROM projects
    WHERE owner = $1 
    ORDER BY created_at DESC
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
      pm.joined_at
    FROM users u
    JOIN project_members pm ON pm.user_id = u.id
    JOIN projects p ON p.id = pm.project_id
    WHERE u.id = $1
      AND p.owner <> $1
    ORDER BY pm.joined_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
}



export async function inviteMemberToProject(inviteData) {
  const inviterId = (inviteData?.inviter_id || "").trim();
  const inviteeId = (inviteData?.invitee_id || "").trim();
  const projectId = (inviteData?.project_id || "").trim();

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
          AND pr.requester_id = $1::uuid
          AND pr.recipient_id = u.id
          AND pr.status = 'pending'
      )
    RETURNING id, requester_id, recipient_id, project_id, status, requested_at
    `,
    [inviterId, inviteeId, projectId]
  );

  if (insertResult.rows.length === 0) {
    const duplicateResult = await pool.query(
      `
      SELECT id
      FROM project_requests
      WHERE project_id = $1
        AND requester_id = $2
        AND recipient_id = $3
        AND status = 'pending'
      LIMIT 1
      `,
      [projectId, inviterId, inviteeId]
    );

    if (duplicateResult.rows.length > 0) {
      const error = new Error("A pending invite already exists for this user in this project");
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

