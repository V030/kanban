// server/controllers/authController.ts
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

import {
  createUser,
  logUser,
  findByEmail,
  changePassword,
  updateUserProfile,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
  completePasswordReset,
  normalizeEmail,
  sanitizeName,
  isValidEmail,
  requestEmailVerificationOtp,
  verifyEmailVerificationOtp,
  validateEmailVerificationToken,
  clearEmailVerificationOtp,
} from "../models/authModel.js";
import { generateToken } from "../utils/jwt.js";
import { sendEmailVerificationOtpEmail, sendPasswordResetOtpEmail } from "../utils/mailer.js";

function sanitizeErrorForClient(err, fallback) {
  const msg = err && (err.message || String(err)) || "";

  const business = [
    "Invalid OTP",
    "Invalid or expired OTP",
    "New password must be different from the current password",
    "Current password is incorrect",
    "User not found",
    "Invalid or expired reset token",
    "Invalid reset token",
    "Invalid email format",
    "Invalid or expired verification code.",
    "Email is already taken",
    "Email already in use",
    "Email verification is required",
    "Password must be at least 8 characters",
  ];
  if (business.includes(msg)) return msg;

  const technicalPatterns = [
    "inconsistent types",
    "parameter $",
    "syntax error",
    "invalid input",
    "duplicate key",
    "relation \"",
  ];

  for (const p of technicalPatterns) {
    if (msg.toLowerCase().includes(p)) {
      return fallback || "Invalid or expired reset code. Please request a new one.";
    }
  }

  return fallback || "Server error";
}

function maskEmail(email) {
  return String(email || "").replace(/(^.{2})(.*)(@.*$)/, (_m, a, _b, c) => `${a}***${c}`);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await logUser(normalizedEmail);

    if (!user) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Credentials" });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = generateToken(payload);

    return res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        profileImageBase64: user.profile_image_base64,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    console.error("[login] error:", {
      email: maskEmail(normalizedEmail),   
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function register(req, res) {
  const { first_name, last_name, email, password, emailVerificationToken } = req.body;
  const cleanFirstName = sanitizeName(first_name);
  const cleanLastName = sanitizeName(last_name);
  const normalizedEmail = normalizeEmail(email);

  if (!cleanFirstName || !cleanLastName || !normalizedEmail || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (!emailVerificationToken) {
    return res.status(400).json({ message: "Email verification is required" });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    validateEmailVerificationToken(emailVerificationToken, {
      email: normalizedEmail,
      purpose: "registration",
    });

    const existingUser = await findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await createUser(cleanFirstName, cleanLastName, "user", normalizedEmail, passwordHash);

    console.info("[registration] User created", { userId: newUser.id });

    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role || "user",
    });

    await clearEmailVerificationOtp({ email: normalizedEmail, purpose: "registration" });

    return res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        role: newUser.role || "user",
        profileImageBase64: newUser.profile_image_base64 || null,
      },
    });
  } catch (err) {
    console.error("Registration error:", {
      email: maskEmail(normalizedEmail),
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    const clientMsg = sanitizeErrorForClient(err, "Server error");
    const status = clientMsg === "User already exists" ? 409 : 400;
    return res.status(status).json({ message: clientMsg });
  }
}

export async function requestEmailVerificationController(req, res) {
  const { email, purpose = "registration" } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const request = await requestEmailVerificationOtp({
      email: normalizedEmail,
      purpose,
      userId: req.user?.userId || null,
    });

    await sendEmailVerificationOtpEmail({
      to: request.email,
      otp: request.otp,
      expiresAt: request.expiresAt,
    });

    console.info("[email-verification] OTP requested", {
      purpose: request.purpose,
      authenticated: !!req.user?.userId,
    });

    return res.status(200).json({
      message: "Verification code sent.",
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
    });
  } catch (err) {
    console.error("[email-verification] OTP request error:", {
      email: maskEmail(normalizedEmail),
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    const clientMsg = sanitizeErrorForClient(err, "Unable to send verification code.");
    const status = clientMsg.includes("already") ? 409 : 400;
    return res.status(status).json({ message: clientMsg });
  }
}

export async function verifyEmailVerificationController(req, res) {
  const { email, otp, purpose = "registration" } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || "").trim();

  if (!normalizedEmail || !normalizedOtp) {
    return res.status(400).json({ message: "Email and verification code are required" });
  }

  try {
    const result = await verifyEmailVerificationOtp({
      email: normalizedEmail,
      otp: normalizedOtp,
      purpose,
      userId: req.user?.userId || null,
    });

    console.info("[email-verification] OTP verified", {
      purpose: String(purpose || "").toLowerCase(),
      authenticated: !!req.user?.userId,
    });

    return res.status(200).json({
      message: "Email verified.",
      verificationToken: result.verificationToken,
    });
  } catch (err) {
    console.warn("[email-verification] OTP verify failed", {
      email: maskEmail(normalizedEmail),
      message: err && (err.message || String(err)),
    });
    return res.status(400).json({ message: "Invalid or expired verification code." });
  }
}

export async function changePasswordController(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Current and new passwords are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  try {
    await changePassword(userId, currentPassword, newPassword);
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);

    if (err.message === "Current password is incorrect") {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

export async function requestPasswordResetController(req, res) {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const resetRequest = await requestPasswordResetOtp(normalizedEmail);

    if (resetRequest) {
      try {
        await sendPasswordResetOtpEmail({
          to: resetRequest.email,
          otp: resetRequest.otp,
          expiresAt: resetRequest.expiresAt,
        });
      } catch (mailErr) {
        console.error("Failed to send password reset email", {
          email: maskEmail(normalizedEmail),
          mailError: mailErr && (mailErr.message || String(mailErr)),
          stack: mailErr && mailErr.stack,
        });
        throw mailErr;
      }
    }

    return res.status(200).json({
      message: "If the email exists, a password reset code has been sent.",
    });
  } catch (err) {
    console.error("Password reset OTP request error:", {
      email: maskEmail(normalizedEmail),
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    return res.status(500).json({ message: "Server error" });
  }
}

export async function verifyPasswordResetController(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  try {
    const result = await verifyPasswordResetOtp(normalizeEmail(email), String(otp).trim());
    return res.status(200).json({ message: "OTP verified", resetToken: result.resetToken });
  } catch (err) {
    console.error("Verify OTP error:", {
      email: maskEmail(email),
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    const clientMsg = sanitizeErrorForClient(err, "Invalid or expired OTP");
    return res.status(400).json({ message: clientMsg });
  }
}

export async function resetPasswordController(req, res) {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: "Email, OTP, and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  try {
    await resetPasswordWithOtp(normalizeEmail(email), String(otp).trim(), newPassword);

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Password reset error:", err);

    if (err.message === "New password must be different from the current password") {
      return res.status(400).json({ message: err.message });
    }

    if (err.message === "Invalid OTP" || err.message === "Invalid or expired OTP") {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

export async function completePasswordResetController(req, res) {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: "Reset token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }

  try {
    await completePasswordReset(resetToken, newPassword);
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Complete password reset error:", {
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    const clientMsg = sanitizeErrorForClient(err, "Failed to reset password");
    return res.status(400).json({ message: clientMsg });
  }
}

export async function updateProfileController(req, res) {
  const { firstName, lastName, email, profileImageBase64, emailVerificationToken } = req.body;
  const userId = req.user?.userId;
  const normalizedEmail = email ? normalizeEmail(email) : null;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!firstName && !lastName && !normalizedEmail && profileImageBase64 === undefined) {
    return res.status(400).json({ message: "At least one field must be provided" });
  }

  try {
    if (normalizedEmail) {
      const currentUserResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
      const currentEmail = normalizeEmail(currentUserResult.rows[0]?.email);

      if (normalizedEmail !== currentEmail) {
        if (!emailVerificationToken) {
          return res.status(400).json({ message: "Email verification is required" });
        }

        validateEmailVerificationToken(emailVerificationToken, {
          email: normalizedEmail,
          purpose: "email_change",
          userId,
        });
      }
    }

    const updated = await updateUserProfile(
      userId,
      firstName ? sanitizeName(firstName) : firstName,
      lastName ? sanitizeName(lastName) : lastName,
      normalizedEmail,
      profileImageBase64
    );

    if (normalizedEmail) {
      await clearEmailVerificationOtp({ email: normalizedEmail, purpose: "email_change" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updated.id,
        firstName: updated.first_name,
        lastName: updated.last_name,
        email: updated.email,
        role: updated.role,
        createdAt: updated.created_at,
        profileImageBase64: updated.profile_image_base64,
      },
    });
  } catch (err) {
    console.error("Update profile error:", {
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });

    if (err.message === "Email already in use") {
      return res.status(409).json({ message: "Email already in use" });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: "User not found" });
    }
    if (err.message === "Invalid or expired verification code.") {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

export async function checkEmailController(req, res) {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ message: "Email is required" });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const existingUser = await findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ available: false, message: "Email is already taken" });
    }

    return res.status(200).json({ available: true, message: "Email is available" });
  } catch (err) {
    console.error("Check email error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function testEmailController(req, res) {
  const { to, subject, text } = req.body;

  if (!to) {
    return res.status(400).json({ message: "Recipient email is required" });
  }

  try {
    import("nodemailer").then(async (nodemailerModule) => {
      const nodemailer = nodemailerModule.default;
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });

      const info = await transporter.sendMail({
        from: '"Test" <test@example.com>',
        to,
        subject: subject || "Test Email",
        text: text || "This is a test email",
        html: `<p>${(text || "This is a test email").replace(/\n/g, "<br>")}</p>`,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.info("[test-email] Email sent", { to, messageId: info.messageId, previewUrl });

      return res.status(200).json({
        message: "Test email sent successfully",
        previewUrl,
        messageId: info.messageId,
      });
    }).catch((err) => {
      console.error("Test email failed:", {
        message: err && (err.message || String(err)),
        stack: err && err.stack,
      });
      res.status(500).json({ message: "Failed to send test email" });
    });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
