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
} from "../models/authModel.js";  
import { generateToken } from "../utils/jwt.js";
import { sendPasswordResetOtpEmail } from "../utils/mailer.js";


export async function login(req, res) {
  const { email, password } = req.body;

  try {  
    const user = await logUser(email);
    
    if (!user) {
      // throw new Error("User not found");
      return res.status(401).json(
        {
          message: "Invalid Credentials"
        }
      );
    }

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      // throw new error ("Invalid Credentials");
      return res.status(401).json(
        {
          message: "Invalid Credentials"
        }
      );
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = generateToken(payload);

    return res.status(200).json(
      {
        message: "Login Successful",
        token: token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
          profileImageBase64: user.profile_image_base64,
        }
      }
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error"
    });
  }

}


export async function register(req, res) {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const existingUser = await findByEmail(email);
    if (existingUser) {
      console.log("User already exists: ", email);
      return res.status(409).json({ message: "User already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await createUser(first_name, last_name, "user", email, password_hash);

    console.log("User created: ", email, " | ID: ", newUser.id);

    const payload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role || "user"
    };

    const token = generateToken(payload);

    res.status(201).json({
      message: "Account created successfully",
      token: token,  // ← NEW: Send token immediately after registration
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        role: newUser.role || "user",
        profileImageBase64: newUser.profile_image_base64 || null,
      }
    });
    
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error" });
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
    console.error("❌ Change password error:", err);
    
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

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const resetRequest = await requestPasswordResetOtp(email);

    if (resetRequest) {
      try {
        await sendPasswordResetOtpEmail({
          to: resetRequest.email,
          otp: resetRequest.otp,
          expiresAt: resetRequest.expiresAt,
        });
      } catch (mailErr) {
        const masked = (email || "").replace(/(^.{2})(.*)(@.*$)/, (m, a, b, c) => a + "***" + c);
        console.error("❌ Failed to send password reset email", {
          email: masked,
          mailError: mailErr && (mailErr.message || String(mailErr)),
          stack: mailErr && mailErr.stack,
        });
        // Re-throw so outer catch will return 500 and we capture DB vs mail issues together
        throw mailErr;
      }
    }

    return res.status(200).json({
      message: "If the email exists, a password reset code has been sent.",
    });
  } catch (err) {
    const masked = (email || "").replace(/(^.{2})(.*)(@.*$)/, (m, a, b, c) => a + "***" + c);
    console.error("❌ Password reset OTP request error:", {
      email: masked,
      message: err && (err.message || String(err)),
      stack: err && err.stack,
    });
    return res.status(500).json({ message: "Server error" });
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
    await resetPasswordWithOtp(email, otp, newPassword);

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("❌ Password reset error:", err);

    if (err.message === "New password must be different from the current password") {
      return res.status(400).json({ message: err.message });
    }

    if (err.message === "Invalid OTP" || err.message === "Invalid or expired OTP") {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateProfileController(req, res) {
  const { firstName, lastName, email, profileImageBase64 } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  if (!firstName && !lastName && !email && !profileImageBase64) {
    return res.status(400).json({ message: "At least one field must be provided" });
  }

  try {
    const updated = await updateUserProfile(userId, firstName, lastName, email, profileImageBase64);
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
      }
    });
  } catch (err) {
    console.error("❌ Update profile error:", err);
    
    if (err.message === "Email already in use") {
      return res.status(409).json({ message: "Email already in use" });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: "User not found" });
    }

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
      console.error("❌ Test email failed:", {
        message: err && (err.message || String(err)),
        stack: err && err.stack,
      });
      res.status(500).json({ message: "Failed to send test email" });
    });
  } catch (err) {
    console.error("❌ Test email error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
