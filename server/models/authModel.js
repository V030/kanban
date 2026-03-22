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
    RETURNING id, first_name, last_name, role, email, created_at
  `;
  const values = [first_name, last_name, role, email, password_hash];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}