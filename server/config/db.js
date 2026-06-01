// database connection
import pkg from 'pg';
const { Pool } = pkg;

import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool ({
    connectionString: process.env.DATABASE_URL,
});

console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("DATABASE_URL length:", process.env.DATABASE_URL?.length);
console.log(
  "DATABASE_URL start:",
  process.env.DATABASE_URL?.substring(0, 50)
);

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

//non-env
// import pkg from "pg";
// const { Pool } = pkg;

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// pool.on("connect", () => {
//   console.log("Connected to PostgreSQL");
// });