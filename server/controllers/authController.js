// server/controllers/authController.ts
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

import { createUser, logUser, findByEmail, changePassword, updateUserProfile } from "../models/authModel.js";  
import { generateToken } from "../utils/jwt.js";


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
