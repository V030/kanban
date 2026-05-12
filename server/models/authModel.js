import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

// Find user by email
export async function findByEmail(email) {
  const query = "SELECT * FROM users WHERE email = $1";
  const values = [email];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function logUser(email) {
  const login_query = 
    `SELECT * FROM users WHERE email = $1;`

  const login_result = await pool.query(login_query, [email]);
  
  return login_result.rows[0] || null;
}

// Create new user
export async function createUser(first_name, last_name, role, email, password_hash) {
  // Check if user already exists
  // const existingUser = await findByEmail(email);
  // if (existingUser) {
  //   throw new Error("User already exists");
  // }

  const query = `
    INSERT INTO users (first_name, last_name, role, email, password_hash)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, first_name, last_name, role, email, created_at, profile_image_base64
  `;
  const values = [first_name, last_name, role, email, password_hash];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Change user password
export async function changePassword(userId, currentPassword, newPassword) {
  // Fetch user to get current password hash
  const query = "SELECT password_hash FROM users WHERE id = $1";
  const result = await pool.query(query, [userId]);

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new Error("Current password is incorrect");
  }

  // Hash new password and update
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  const updateQuery = "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email";
  const updateResult = await pool.query(updateQuery, [newPasswordHash, userId]);

  return updateResult.rows[0];
}

// Update user profile (first_name, last_name, email)
export async function updateUserProfile(userId, firstName, lastName, email, profileImageBase64) {
  // Validate email if provided
  if (email) {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, userId]
    );
    if (existingUser.rows.length > 0) {
      throw new Error("Email already in use");
    }
  }

  const query = `
    UPDATE users 
    SET first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        profile_image_base64 = COALESCE($4, profile_image_base64)
    WHERE id = $5
    RETURNING id, first_name, last_name, email, role, created_at, profile_image_base64
  `;
  const result = await pool.query(query, [
    firstName || null,
    lastName || null,
    email || null,
    profileImageBase64 || null,
    userId,
  ]);

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  return result.rows[0];
}