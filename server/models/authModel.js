import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";

const EMAIL_VERIFICATION_PURPOSES = new Set(["registration", "email_change"]);
const EMAIL_VERIFICATION_MAX_ATTEMPTS = 5;
const EMAIL_VERIFICATION_EXPIRES_MS = 10 * 60 * 1000;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

export function sanitizeName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Find user by email
export async function findByEmail(email) {
  const query = "SELECT * FROM users WHERE email = $1";
  const values = [normalizeEmail(email)];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function logUser(email) {
  const login_query = 
    `SELECT * FROM users WHERE email = $1;`

  const login_result = await pool.query(login_query, [normalizeEmail(email)]);
  
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
  const values = [sanitizeName(first_name), sanitizeName(last_name), role, normalizeEmail(email), password_hash];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Find or create user by Google ID.
export async function findOrCreateGoogleUser(googleId, email, firstName, lastName, profilePictureUrl) {
  try {
    // First, check if user exists by google_id
    const googleQuery = "SELECT * FROM users WHERE google_id = $1";
    const googleResult = await pool.query(googleQuery, [googleId]);

    if (googleResult.rows.length > 0) {
      return googleResult.rows[0]; // Existing OAuth user
    }

    // Check if user exists by email (account linking scenario)
    const emailQuery = "SELECT * FROM users WHERE email = $1";
    const emailResult = await pool.query(emailQuery, [email]);

    if (emailResult.rows.length > 0) {
      // Link existing email-based account to Google
      const updateQuery = `
        UPDATE users 
        SET google_id = $1,
            oauth_provider = $2,
            profile_picture_url = $3
        WHERE email = $4
        RETURNING id, first_name, last_name, email, role, profile_picture_url, google_id, oauth_provider
      `;
      const updateResult = await pool.query(updateQuery, [
        googleId,
        "google",
        profilePictureUrl,
        email
      ]);
      console.log("Google account linked to existing user:", email);
      return updateResult.rows[0];
    }

    // Create new user for Google OAuth
    const createQuery = `
      INSERT INTO users (first_name, last_name, email, google_id, oauth_provider, profile_picture_url, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
      RETURNING id, first_name, last_name, email, role, profile_picture_url, google_id, oauth_provider
    `;

    const createResult = await pool.query(createQuery, [
      firstName,
      lastName,
      email,
      googleId,
      "google",
      profilePictureUrl,
      "user", // Default role for new OAuth users
    ]);

    console.log("New OAuth user created:", email);
    return createResult.rows[0];
  } catch (error) {
    console.error("Error in findOrCreateGoogleUser:", error);
    throw error;
  }
}

function generatePasswordResetOtp() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

function generateEmailVerificationOtp() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

function getOtpHmacSecret() {
  return process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || "development-otp-secret";
}

function hashEmailVerificationOtp({ email, purpose, otp }) {
  return createHmac("sha256", getOtpHmacSecret())
    .update(`${purpose}:${normalizeEmail(email)}:${otp}`)
    .digest("hex");
}

function constantTimeHexEqual(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");

  if (left.length !== right.length || left.length === 0) {
    const dummy = Buffer.alloc(32);
    timingSafeEqual(dummy, dummy);
    return false;
  }

  return timingSafeEqual(left, right);
}

function assertEmailVerificationPurpose(purpose) {
  const normalizedPurpose = String(purpose || "").trim().toLowerCase();
  if (!EMAIL_VERIFICATION_PURPOSES.has(normalizedPurpose)) {
    throw new Error("Invalid verification request");
  }
  return normalizedPurpose;
}

export function validateEmailVerificationToken(token, { email, purpose, userId = null } = {}) {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("Invalid or expired verification code.");
  }

  const normalizedPurpose = assertEmailVerificationPurpose(purpose);
  const normalizedEmail = normalizeEmail(email);

  if (
    !decoded ||
    decoded.purpose !== "email_verification" ||
    decoded.verificationPurpose !== normalizedPurpose ||
    normalizeEmail(decoded.email) !== normalizedEmail
  ) {
    throw new Error("Invalid or expired verification code.");
  }

  if (userId && String(decoded.userId || "") !== String(userId)) {
    throw new Error("Invalid or expired verification code.");
  }

  return decoded;
}

export async function requestEmailVerificationOtp({ email, purpose = "registration", userId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = assertEmailVerificationPurpose(purpose);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Invalid email format");
  }

  if (normalizedPurpose === "registration") {
    const existingUser = await findByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error("Email is already taken");
    }
  }

  if (normalizedPurpose === "email_change" && !userId) {
    throw new Error("User not authenticated");
  }

  if (normalizedPurpose === "email_change") {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [normalizedEmail, userId]
    );
    if (existingUser.rows.length > 0) {
      throw new Error("Email already in use");
    }
  }

  const otp = generateEmailVerificationOtp();
  const otpHash = hashEmailVerificationOtp({ email: normalizedEmail, purpose: normalizedPurpose, otp });
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_MS);

  await pool.query(
    `
      INSERT INTO email_verification_otps (email, purpose, user_id, otp_hash, expires_at, attempts, consumed_at)
      VALUES ($1, $2, $3, $4, $5, 0, NULL)
      ON CONFLICT (email, purpose)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        otp_hash = EXCLUDED.otp_hash,
        expires_at = EXCLUDED.expires_at,
        attempts = 0,
        consumed_at = NULL,
        created_at = NOW()
    `,
    [normalizedEmail, normalizedPurpose, userId || null, otpHash, expiresAt]
  );

  return {
    email: normalizedEmail,
    purpose: normalizedPurpose,
    otp,
    expiresAt,
  };
}

export async function verifyEmailVerificationOtp({ email, otp, purpose = "registration", userId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || "").trim();
  const normalizedPurpose = assertEmailVerificationPurpose(purpose);

  if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(normalizedOtp)) {
    throw new Error("Invalid or expired verification code.");
  }

  const verificationResult = await pool.query(
    `
      SELECT email, purpose, user_id, otp_hash, expires_at, attempts, consumed_at
      FROM email_verification_otps
      WHERE email = $1 AND purpose = $2
      LIMIT 1
    `,
    [normalizedEmail, normalizedPurpose]
  );

  if (verificationResult.rows.length === 0) {
    throw new Error("Invalid or expired verification code.");
  }

  const row = verificationResult.rows[0];

  if (
    row.consumed_at ||
    new Date(row.expires_at).getTime() < Date.now() ||
    Number(row.attempts || 0) >= EMAIL_VERIFICATION_MAX_ATTEMPTS ||
    (userId && String(row.user_id || "") !== String(userId))
  ) {
    throw new Error("Invalid or expired verification code.");
  }

  const candidateHash = hashEmailVerificationOtp({
    email: normalizedEmail,
    purpose: normalizedPurpose,
    otp: normalizedOtp,
  });

  if (!constantTimeHexEqual(candidateHash, row.otp_hash)) {
    const nextAttempts = Number(row.attempts || 0) + 1;
    await pool.query(
      `
        UPDATE email_verification_otps
        SET attempts = $3::int,
            consumed_at = CASE WHEN $3::int >= $4::int THEN NOW() ELSE consumed_at END
        WHERE email = $1 AND purpose = $2
      `,
      [normalizedEmail, normalizedPurpose, nextAttempts, EMAIL_VERIFICATION_MAX_ATTEMPTS]
    );

    throw new Error("Invalid or expired verification code.");
  }

  await pool.query(
    `
      UPDATE email_verification_otps
      SET consumed_at = NOW()
      WHERE email = $1 AND purpose = $2
    `,
    [normalizedEmail, normalizedPurpose]
  );

  const payload = {
    purpose: "email_verification",
    verificationPurpose: normalizedPurpose,
    email: normalizedEmail,
    userId: userId || row.user_id || null,
  };

  const verificationToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN || "15m",
  });

  return { verificationToken };
}

export async function clearEmailVerificationOtp({ email, purpose = "registration" }) {
  await pool.query(
    "DELETE FROM email_verification_otps WHERE email = $1 AND purpose = $2",
    [normalizeEmail(email), assertEmailVerificationPurpose(purpose)]
  );
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
  const normalizedEmail = email ? normalizeEmail(email) : null;

  // Validate email if provided
  if (normalizedEmail) {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [normalizedEmail, userId]
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
    normalizedEmail || null,
    profileImageBase64 === undefined ? null : profileImageBase64,
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
