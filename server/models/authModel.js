import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import { randomInt } from "node:crypto";
import jwt from "jsonwebtoken";

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

function generatePasswordResetOtp() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

async function assertPasswordIsDifferent(passwordHash, newPassword) {
  const isSamePassword = await bcrypt.compare(newPassword, passwordHash);

  if (isSamePassword) {
    throw new Error("New password must be different from the current password");
  }
}

async function updateUserPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updateQuery = "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email";
  const updateResult = await pool.query(updateQuery, [passwordHash, userId]);

  return updateResult.rows[0];
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

  await assertPasswordIsDifferent(user.password_hash, newPassword);

  return updateUserPassword(userId, newPassword);
}

export async function requestPasswordResetOtp(email) {
  const user = await findByEmail(email);

  if (!user) {
    return null;
  }

  const otp = generatePasswordResetOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `
      INSERT INTO password_reset_otps (user_id, email, otp_hash, expires_at, attempts, consumed_at)
      VALUES ($1, $2, $3, $4, 0, NULL)
      ON CONFLICT (user_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        otp_hash = EXCLUDED.otp_hash,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        consumed_at = NULL
    `,
    [user.id, user.email, otpHash, expiresAt]
  );

  return {
    userId: user.id,
    email: user.email,
    otp,
    expiresAt,
  };
}

export async function resetPasswordWithOtp(email, otp, newPassword) {
  const user = await findByEmail(email);

  if (!user) {
    throw new Error("Invalid OTP");
  }

  const resetResult = await pool.query(
    `
      SELECT user_id, otp_hash, expires_at, attempts, consumed_at
      FROM password_reset_otps
      WHERE user_id = $1::uuid
    `,
    [user.id]
  );

  if (resetResult.rows.length === 0) {
    throw new Error("Invalid OTP");
  }

  const resetRow = resetResult.rows[0];
  const maxAttempts = 5;

  if (resetRow.consumed_at || new Date(resetRow.expires_at).getTime() < Date.now() || resetRow.attempts >= maxAttempts) {
    throw new Error("Invalid or expired OTP");
  }

  const otpMatches = await bcrypt.compare(otp, resetRow.otp_hash);

  if (!otpMatches) {
    const nextAttempts = resetRow.attempts + 1;

    await pool.query(
      `
        UPDATE password_reset_otps
        SET attempts = $2::int,
            consumed_at = CASE WHEN $2::int >= $3::int THEN NOW() ELSE consumed_at END
        WHERE user_id = $1::uuid
      `,
      [user.id, nextAttempts, maxAttempts]
    );

    throw new Error("Invalid OTP");
  }

  await assertPasswordIsDifferent(user.password_hash, newPassword);

  const updatedUser = await updateUserPassword(user.id, newPassword);

  await pool.query(
    `
      UPDATE password_reset_otps
      SET consumed_at = NOW()
      WHERE user_id = $1::uuid
    `,
    [user.id]
  );

  return updatedUser;
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

export async function verifyPasswordResetOtp(email, otp) {
  const user = await findByEmail(email);

  if (!user) {
    throw new Error("Invalid OTP");
  }

  const resetResult = await pool.query(
    `
      SELECT user_id, otp_hash, expires_at, attempts, consumed_at
      FROM password_reset_otps
      WHERE user_id = $1
    `,
    [user.id]
  );

  if (resetResult.rows.length === 0) {
    throw new Error("Invalid OTP");
  }

  const resetRow = resetResult.rows[0];
  const maxAttempts = 5;

  if (resetRow.consumed_at || new Date(resetRow.expires_at).getTime() < Date.now() || resetRow.attempts >= maxAttempts) {
    throw new Error("Invalid or expired OTP");
  }

  const otpMatches = await bcrypt.compare(otp, resetRow.otp_hash);

  if (!otpMatches) {
    const nextAttempts = resetRow.attempts + 1;

    await pool.query(
      `
        UPDATE password_reset_otps
        SET attempts = $2,
            consumed_at = CASE WHEN $2 >= $3 THEN NOW() ELSE consumed_at END
        WHERE user_id = $1
      `,
      [user.id, nextAttempts, maxAttempts]
    );

    throw new Error("Invalid OTP");
  }

  // OTP is valid — issue a short-lived reset token (JWT)
  const payload = { userId: user.id, email: user.email, purpose: "password_reset" };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || "15m",
  });

  return { resetToken: token };
}

export async function completePasswordReset(resetToken, newPassword) {
  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("Invalid or expired reset token");
  }

  if (!decoded || decoded.purpose !== "password_reset") {
    throw new Error("Invalid reset token");
  }

  const userQuery = await pool.query("SELECT id, password_hash FROM users WHERE id = $1", [decoded.userId]);
  if (userQuery.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = userQuery.rows[0];

  await assertPasswordIsDifferent(user.password_hash, newPassword);

  const updatedUser = await updateUserPassword(user.id, newPassword);

  await pool.query(
    `
      UPDATE password_reset_otps
      SET consumed_at = NOW()
      WHERE user_id = $1
    `,
    [user.id]
  );

  return updatedUser;
}