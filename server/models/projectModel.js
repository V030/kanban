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

