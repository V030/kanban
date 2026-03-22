// server/controllers/authController.ts
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

import { createUser, logUser, findByEmail } from "../models/authModel.js";  
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
        role: newUser.role || "user"
      }
    });
    
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error" });
  }
}