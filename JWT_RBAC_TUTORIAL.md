# Complete JWT Authentication with RBAC Tutorial for PERN Stack
## A Step-by-Step Guide Using JavaScript Only

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [JWT Concepts](#jwt-concepts)
3. [RBAC Concepts](#rbac-concepts)
4. [Backend Setup](#backend-setup)
5. [Database Schema](#database-schema)
6. [JWT Utility Functions](#jwt-utility-functions)
7. [Authentication Middleware](#authentication-middleware)
8. [Authorization Middleware (RBAC)](#authorization-middleware)
9. [Updated Auth Controller](#updated-auth-controller)
10. [Protected Routes](#protected-routes)
11. [Frontend Implementation](#frontend-implementation)
12. [Complete Usage Flow](#complete-usage-flow)
13. [Security Explanation](#security-explanation)
14. [Common Mistakes](#common-mistakes)

---

## Project Overview

### Current Architecture Analysis

Your project currently has:
```
server/
├── config/
│   └── db.js              ✅ PostgreSQL connection
├── controllers/
│   └── authController.js  ✅ Login/Register logic (but NO JWT yet)
├── models/
│   └── authModel.js       ✅ Database queries
├── routes/
│   └── authRoutes.js      ✅ Auth endpoints
├── middleware/            ⚠️  EMPTY - We'll add JWT middleware here
├── utils/                 ⚠️  EMPTY - We'll add JWT utilities here
└── server.js              ✅ Express server

client/
├── src/
│   ├── services/
│   │   └── authService.js ✅ Login/Register API calls (but NO token handling)
│   ├── components/
│   │   ├── LoginForm.jsx
│   │   └── RegisterForm.jsx
│   └── pages/
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       └── MainPage.jsx
```

**What's Missing:**
- ❌ JWT token generation after login
- ❌ JWT token verification middleware
- ❌ Role-based access control (RBAC)
- ❌ Protected routes on backend
- ❌ Token storage on frontend
- ❌ Sending tokens with requests from frontend

We'll implement ALL of these step-by-step.

---

## 1. JWT Concepts

### What is JWT (JSON Web Token)?

**Simple Explanation:**
A JWT is like a **digital passport**. When you log in successfully, the server gives you this "passport" (a long string). Every time you visit a protected page, you show this passport to prove who you are without logging in again.

### How JWT Works

```
┌─────────────┐                          ┌─────────────┐
│   CLIENT    │                          │   SERVER    │
│  (Browser)  │                          │  (Express)  │
└─────────────┘                          └─────────────┘
      │                                         │
      │  1. POST /login                         │
      │    { email, password }                  │
      │────────────────────────────────────────>│
      │                                         │
      │                                         │ 2. Verify password
      │                                         │    ✓ Password correct
      │                                         │
      │                                         │ 3. Generate JWT token
      │                                         │    token = sign({ userId, role })
      │                                         │
      │  4. Return token                        │
      │<────────────────────────────────────────│
      │    { token: "eyJhbGc..." }              │
      │                                         │
      │  5. Store token                         │
      │    localStorage.setItem(...)            │
      │                                         │
      │  6. GET /protected-route                │
      │    Headers: {                           │
      │      Authorization: "Bearer eyJhbGc..." │
      │    }                                    │
      │────────────────────────────────────────>│
      │                                         │
      │                                         │ 7. Verify token
      │                                         │    decoded = verify(token)
      │                                         │    ✓ Valid!
      │                                         │
      │  8. Return protected data               │
      │<────────────────────────────────────────│
      │    { data: [...] }                      │
      │                                         │
```

### JWT Structure

A JWT has 3 parts separated by dots (`.`):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
│                                    │ │                                  │ │                                                              │
│          HEADER                    │ │           PAYLOAD                │ │                    SIGNATURE                                 │
│   (Algorithm & Token Type)         │ │     (User Data: id, role)        │ │            (Verification Code)                               │
└────────────────────────────────────┘ └──────────────────────────────────┘ └──────────────────────────────────────────────────────────────┘
```

1. **Header**: Describes the algorithm (usually HS256)
2. **Payload**: Contains your data (userId, role, email, etc.)
3. **Signature**: Proves the token hasn't been tampered with

**IMPORTANT:** The payload is NOT encrypted, just encoded. Anyone can decode and read it. The signature prevents tampering.

---

## 2. RBAC Concepts

### What is RBAC (Role-Based Access Control)?

**Simple Explanation:**
RBAC is like having different **key levels** in a building:
- **User** = Basic key (can enter common areas)
- **Admin** = Master key (can enter restricted areas)

### Authentication vs Authorization

| Concept | Question | Example |
|---------|----------|---------|
| **Authentication** | "Who are you?" | Checking if the user is logged in |
| **Authorization** | "What can you do?" | Checking if the user has admin role |

```javascript
// Authentication: Is the user logged in?
if (token is valid) {
  // User is authenticated ✓
}

// Authorization: Does the user have permission?
if (user.role === 'admin') {
  // User is authorized to access admin dashboard ✓
}
```

### RBAC Flow

```
User Login
    ↓
Token Generated with Role
    ↓
Token Contains: { userId: 1, role: "admin" }
    ↓
User Requests Admin Route
    ↓
Middleware Checks Token → Authentication ✓
    ↓
Middleware Checks Role → Authorization ✓
    ↓
Access Granted
```

---

## 3. Backend Setup

### Step 1: Install Dependencies

**Explanation:**
We need two packages:
- `jsonwebtoken`: Create and verify JWT tokens
- `bcrypt`: Hash and compare passwords (you already have this)

```bash
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

**You already ran this command** ✓

### Step 2: Environment Variables

**Concept First:**
The JWT needs a **secret key** to sign tokens. This must be:
- **Secret** (never share it)
- **Strong** (long random string)
- **Stored in .env** (not in code)

**Create or update your `.env` file:**

```env
# Database
DATABASE_URL=your_database_url_here

# Server
PORT=5000

# JWT Secret (CHANGE THIS TO A STRONG RANDOM STRING!)
JWT_SECRET=your_super_secret_key_change_this_in_production_minimum_32_characters
JWT_EXPIRES_IN=7d
```

**Why JWT_SECRET is needed:**
When creating a token, the server signs it with this secret. When verifying the token later, the server uses the SAME secret to check if the token is legitimate.

**Think of it like:**
- Creating token = Signing a document with your signature
- JWT_SECRET = Your unique signature style
- Verifying token = Checking if the signature matches your style

---

## 4. Database Schema

### Concept: Adding Roles to Users

**Current Problem:**
Your users table doesn't have a `role` column yet. We need to add it.

### Step 1: Check Current Schema

Your current `users` table likely looks like this:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Add Role Column

**Run this SQL in your PostgreSQL database:**

```sql
-- Add role column with default value 'user'
ALTER TABLE users 
ADD COLUMN role VARCHAR(50) DEFAULT 'user';

-- Optional: Add check constraint to ensure only valid roles
ALTER TABLE users 
ADD CONSTRAINT check_role 
CHECK (role IN ('user', 'admin', 'moderator'));
```

**How this works:**
- Every new user gets role = 'user' by default
- You can manually change a user to 'admin' in the database
- The constraint prevents invalid roles like 'superuser123'

### Step 3: Create an Admin User (For Testing)

```sql
-- First, create a regular user through your app's register endpoint
-- Then, manually upgrade them to admin:

UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Updated Database Structure

```
users table:
┌────┬────────────┬───────────┬──────────────────────┬───────────────┬──────┬─────────────────────┐
│ id │ first_name │ last_name │ email                │ password_hash │ role │ created_at          │
├────┼────────────┼───────────┼──────────────────────┼───────────────┼──────┼─────────────────────┤
│ 1  │ John       │ Doe       │ john@example.com     │ $2b$10$...   │ user │ 2026-02-18 10:00:00 │
│ 2  │ Jane       │ Admin     │ admin@example.com    │ $2b$10$...   │ admin│ 2026-02-18 10:05:00 │
└────┴────────────┴───────────┴──────────────────────┴───────────────┴──────┴─────────────────────┘
```

---

## 5. JWT Utility Functions

### Concept: Centralized Token Management

**Why we need this:**
Instead of writing JWT code in multiple places, we create ONE file with reusable functions:
- `generateToken()`: Create a token when user logs in
- `verifyToken()`: Check if a token is valid

**Where it fits:**
```
Utility File → Used by Controller (login) → Used by Middleware (verify)
```

### Create: `server/utils/jwt.js`

```javascript
// server/utils/jwt.js
import jwt from "jsonwebtoken";

/**
 * CONCEPT: Generate JWT Token
 * 
 * This function creates a "digital passport" for the user.
 * 
 * @param {Object} payload - Data to store in token (userId, role, email)
 * @returns {String} - The JWT token string
 * 
 * HOW IT WORKS:
 * 1. Takes user data (payload)
 * 2. Signs it with secret key from .env
 * 3. Sets expiration time
 * 4. Returns encoded token
 * 
 * WHY NEEDED:
 * - Called after successful login
 * - Gives user a token to use for future requests
 */
export function generateToken(payload) {
  // jwt.sign() creates the token
  // Parameters:
  // 1. payload: data to encode (userId, role, email)
  // 2. secret: from .env (used to sign the token)
  // 3. options: expiresIn sets when token becomes invalid
  
  const token = jwt.sign(
    payload,                          // What data to put in the token
    process.env.JWT_SECRET,           // Secret key to sign with
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }  // Token valid for 7 days
  );
  
  console.log("✅ Token generated for user:", payload.userId);
  return token;
}

/**
 * CONCEPT: Verify JWT Token
 * 
 * This function checks if a token is legitimate and not expired.
 * 
 * @param {String} token - The JWT token to verify
 * @returns {Object} - Decoded token data (userId, role, email)
 * @throws {Error} - If token is invalid or expired
 * 
 * HOW IT WORKS:
 * 1. Takes the token string
 * 2. Verifies signature using secret key
 * 3. Checks if expired
 * 4. Returns decoded data OR throws error
 * 
 * WHY NEEDED:
 * - Called by middleware on protected routes
 * - Ensures token hasn't been tampered with
 * - Checks token hasn't expired
 */
export function verifyToken(token) {
  try {
    // jwt.verify() checks the token
    // Parameters:
    // 1. token: the token string to verify
    // 2. secret: same secret used to create the token
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // decoded now contains: { userId, role, email, iat, exp }
    // iat = issued at (timestamp)
    // exp = expiration (timestamp)
    
    console.log("✅ Token verified for user:", decoded.userId);
    return decoded;
    
  } catch (error) {
    // Token verification failed
    console.log("❌ Token verification failed:", error.message);
    
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw error;
  }
}
```

**LINE-BY-LINE EXPLANATION:**

**generateToken():**
```javascript
const token = jwt.sign(payload, secret, options);
```
- `jwt.sign()` = Create a new token
- `payload` = Data to store (like putting items in a suitcase)
- `secret` = Lock to seal the suitcase
- `options.expiresIn` = Set a timer on the lock

**verifyToken():**
```javascript
const decoded = jwt.verify(token, secret);
```
- `jwt.verify()` = Open and check the suitcase
- `token` = The sealed suitcase
- `secret` = Key to unlock it
- `decoded` = Items inside (user data)

**WHY THIS ARCHITECTURE:**
- **Separation of Concerns**: JWT logic separate from business logic
- **Reusability**: Use same functions in controller and middleware
- **Testability**: Easy to test these functions independently
- **Maintainability**: Change JWT library? Only update this one file

---

## 6. Authentication Middleware

### Concept: What is Middleware?

**Simple Explanation:**
Middleware is like a **security guard** that checks people before they enter a building.

```
Request → Middleware (Security Check) → Route Handler (Enter Building)
```

If the guard says "OK, you can pass", you reach the route.
If the guard says "Stop!", you get an error.

### How Express Middleware Works

```javascript
// Normal route (NO protection)
app.get("/public", (req, res) => {
  res.json({ data: "Anyone can see this" });
});

// Protected route (WITH authentication middleware)
app.get("/protected", authenticateToken, (req, res) => {
  //                    ↑ This runs FIRST
  // If authenticateToken says "OK", then this handler runs
  res.json({ data: "Only logged-in users see this" });
});
```

### Create: `server/middleware/authMiddleware.js`

```javascript
// server/middleware/authMiddleware.js
import { verifyToken } from "../utils/jwt.js";

/**
 * CONCEPT: Authentication Middleware
 * 
 * This middleware checks if the user is logged in by verifying their JWT token.
 * 
 * HOW IT WORKS:
 * 1. Extract token from request header
 * 2. Verify token is valid
 * 3. Attach user data to request object
 * 4. Allow request to continue OR send error
 * 
 * WHY NEEDED:
 * - Protects routes that require login
 * - Runs BEFORE route handler
 * - Adds user info to req.user for next functions
 */
export function authenticateToken(req, res, next) {
  console.log("🔐 Authentication middleware running...");
  
  // STEP 1: Get the Authorization header
  // Header format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  const authHeader = req.headers["authorization"];
  
  console.log("📨 Authorization header:", authHeader);
  
  // STEP 2: Extract the token
  // authHeader = "Bearer TOKEN_HERE"
  // We split by space and take the second part
  const token = authHeader && authHeader.split(" ")[1];
  //             ↑ Check header exists
  //                              ↑ Split "Bearer TOKEN" and take TOKEN
  
  // STEP 3: Check if token exists
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ 
      message: "Access denied. No token provided." 
    });
    // 401 = Unauthorized (not logged in)
  }
  
  // STEP 4: Verify the token
  try {
    const decoded = verifyToken(token);
    // decoded = { userId: 1, role: "user", email: "john@example.com", iat: ..., exp: ... }
    
    console.log("✅ User authenticated:", decoded);
    
    // STEP 5: Attach user data to request object
    // Now any route handler after this middleware can access req.user
    req.user = decoded;
    
    // STEP 6: Pass control to next middleware or route handler
    next();
    // next() says "authentication succeeded, continue to next function"
    
  } catch (error) {
    console.log("❌ Token verification failed:", error.message);
    return res.status(403).json({ 
      message: "Invalid or expired token." 
    });
    // 403 = Forbidden (token is invalid/expired)
  }
}
```

**LINE-BY-LINE BREAKDOWN:**

```javascript
const authHeader = req.headers["authorization"];
```
- `req.headers` = Object containing all HTTP headers sent by client
- `authorization` = Specific header where frontend sends the token
- Value looks like: `"Bearer eyJhbGc..."`

```javascript
const token = authHeader && authHeader.split(" ")[1];
```
- `authHeader &&` = If authHeader exists (prevents error if undefined)
- `.split(" ")` = Splits "Bearer TOKEN" into ["Bearer", "TOKEN"]
- `[1]` = Take second element (the actual token)

```javascript
req.user = decoded;
```
- Adds a NEW property `user` to the request object
- Now ALL functions after this middleware can use `req.user`
- Example: `req.user.userId`, `req.user.role`

```javascript
next();
```
- Tells Express: "I'm done, move to the next function"
- If you DON'T call `next()`, the request hangs forever!

**WHY THIS ARCHITECTURE:**
```
Client Request
    ↓
✓ Has token in header → authenticateToken → Verify → Success → next() → Route Handler
✗ No token           → authenticateToken → Error → Send 401
✗ Invalid token      → authenticateToken → Verify → Error → Send 403
```

**WHAT HAPPENS NEXT:**
After `next()` is called, Express moves to the route handler:
```javascript
app.get("/profile", authenticateToken, (req, res) => {
  // authenticateToken already ran
  // req.user is now available!
  res.json({ user: req.user });
});
```

---

## 7. Authorization Middleware (RBAC)

### Concept: Checking User Roles

**Authentication vs Authorization:**
- **Authentication**: "Are you logged in?" (Done by `authenticateToken`)
- **Authorization**: "Do you have permission?" (Done by `authorizeRole`)

**How RBAC Works:**
```
User logs in → Token contains role → Middleware checks role → Grant/Deny access
```

### Create: `server/middleware/authMiddleware.js` (Add to same file)

```javascript
// server/middleware/authMiddleware.js (continued...)

/**
 * CONCEPT: Authorization Middleware (RBAC)
 * 
 * This middleware checks if the user has the required role to access a route.
 * 
 * HOW IT WORKS:
 * 1. Expects authenticateToken to have already run (req.user exists)
 * 2. Checks if user's role is in allowed roles list
 * 3. Allow request OR send error
 * 
 * WHY NEEDED:
 * - Restrict routes to specific roles (admin-only, etc.)
 * - Runs AFTER authenticateToken
 * 
 * @param {Array<String>} allowedRoles - List of roles that can access the route
 * @returns {Function} - Middleware function
 */
export function authorizeRole(...allowedRoles) {
  // This is a HIGHER-ORDER FUNCTION
  // It returns a middleware function
  // Usage: authorizeRole("admin", "moderator")
  
  return (req, res, next) => {
    console.log("🔑 Authorization middleware running...");
    console.log("   Allowed roles:", allowedRoles);
    console.log("   User role:", req.user?.role);
    
    // STEP 1: Check if user is authenticated
    // authenticateToken should have run before this and added req.user
    if (!req.user) {
      console.log("❌ No user found in request. Did you forget authenticateToken?");
      return res.status(401).json({ 
        message: "Authentication required." 
      });
    }
    
    // STEP 2: Check if user's role is in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ Access denied. User role '${req.user.role}' not in allowed roles.`);
      return res.status(403).json({ 
        message: "Access denied. Insufficient permissions." 
      });
      // 403 = Forbidden (logged in but not authorized)
    }
    
    // STEP 3: Role is authorized, continue
    console.log("✅ User authorized");
    next();
  };
}
```

**LINE-BY-LINE EXPLANATION:**

```javascript
export function authorizeRole(...allowedRoles) {
```
- `...allowedRoles` = REST parameter (collects all arguments into array)
- Example: `authorizeRole("admin", "moderator")` → `allowedRoles = ["admin", "moderator"]`

```javascript
return (req, res, next) => {
```
- This is a **higher-order function** (function that returns a function)
- Returns the actual middleware function
- Why? So we can pass parameters to the middleware

```javascript
if (!allowedRoles.includes(req.user.role)) {
```
- `allowedRoles.includes()` = Check if user's role is in the allowed list
- Example: If `allowedRoles = ["admin"]` and `req.user.role = "user"`, access denied

**HOW TO USE THIS MIDDLEWARE:**

```javascript
// Example 1: Admin only
app.get("/admin/dashboard", 
  authenticateToken,           // First: Check if logged in
  authorizeRole("admin"),      // Second: Check if admin
  (req, res) => {              // Third: Handle request
    res.json({ data: "Admin dashboard" });
  }
);

// Example 2: Admin OR Moderator
app.post("/moderate/content",
  authenticateToken,
  authorizeRole("admin", "moderator"),  // Multiple roles allowed
  (req, res) => {
    res.json({ message: "Content moderated" });
  }
);

// Example 3: Any authenticated user (no role check)
app.get("/profile",
  authenticateToken,  // Only check if logged in
  (req, res) => {
    res.json({ user: req.user });
  }
);
```

**MIDDLEWARE EXECUTION ORDER:**

```
1. Request arrives
   ↓
2. authenticateToken runs
   ├─ Verifies JWT token
   ├─ Adds req.user = { userId, role, email }
   └─ Calls next()
   ↓
3. authorizeRole runs
   ├─ Checks req.user.role
   ├─ Compares with allowedRoles
   └─ Calls next() if authorized
   ↓
4. Route handler runs
   └─ Returns response
```

**WHY THIS ARCHITECTURE:**
- **Composable**: Stack multiple middleware in order
- **Reusable**: Use same middleware on many routes
- **Flexible**: Different routes can require different roles
- **Secure**: Even if frontend hides UI, backend enforces permissions

---

## 8. Updated Auth Controller

### Concept: Generating Tokens on Login

**Current Problem:**
Your login controller verifies passwords but doesn't return a JWT token.

**What We'll Change:**
```
Before: Login → Verify password → Return success message
After:  Login → Verify password → Generate JWT token → Return token
```

### Update: `server/controllers/authController.js`

```javascript
// server/controllers/authController.js
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import { createUser, logUser, findByEmail } from "../models/authModel.js";
import { generateToken } from "../utils/jwt.js";  // ← NEW: Import JWT utility

/**
 * CONCEPT: Login Controller
 * 
 * Handles user login and JWT token generation.
 * 
 * FLOW:
 * 1. Receive email and password from client
 * 2. Find user in database
 * 3. Verify password with bcrypt
 * 4. Generate JWT token with user data
 * 5. Return token to client
 */
export async function login(req, res) {
  const { email, password } = req.body;
  
  console.log("🔑 Login attempt for:", email);

  try {
    // STEP 1: Find user by email
    const user = await logUser(email, password);

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // STEP 2: Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    console.log("✅ Password verified for:", email);

    // STEP 3: Generate JWT token
    // Create payload with user data
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role  // ← IMPORTANT: Include role for RBAC
    };
    
    const token = generateToken(payload);
    
    console.log("✅ Login successful for:", email, "| Role:", user.role);

    // STEP 4: Return token and user info
    return res.status(200).json({
      message: "Login successful",
      token: token,  // ← NEW: Send token to client
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role  // ← NEW: Send role to client
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    return res.status(500).json({
      message: "Server error"
    });
  }
}

/**
 * CONCEPT: Register Controller
 * 
 * Handles user registration with automatic token generation.
 * 
 * FLOW:
 * 1. Receive user data from client
 * 2. Hash password
 * 3. Create user in database (default role: "user")
 * 4. Generate JWT token
 * 5. Return token to client
 */
export async function register(req, res) {
  const { first_name, last_name, email, password } = req.body;

  console.log("📝 Registration attempt for:", email);

  // STEP 1: Validation
  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // STEP 2: Check if user already exists
    const existingUser = await findByEmail(email);
    if (existingUser) {
      console.log("❌ User already exists:", email);
      return res.status(409).json({ message: "User already exists" });
    }

    // STEP 3: Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // STEP 4: Create user
    const newUser = await createUser(first_name, last_name, email, password_hash);
    
    console.log("✅ User created:", email, "| ID:", newUser.id);

    // STEP 5: Generate JWT token
    const payload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role || "user"  // Default role is "user"
    };
    
    const token = generateToken(payload);

    console.log("✅ Registration successful for:", email);

    // STEP 6: Return token and user info
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
```

**WHAT CHANGED:**

**Before:**
```javascript
return res.status(200).json({
  message: "Login successful",
  id: user.id
});
```

**After:**
```javascript
const payload = { userId: user.id, email: user.email, role: user.role };
const token = generateToken(payload);

return res.status(200).json({
  message: "Login successful",
  token: token,           // ← NEW
  user: { ... }           // ← NEW
});
```

**WHY THIS MATTERS:**
- Frontend now receives the token after login/register
- Frontend can store this token and use it for future requests
- Token contains user's role for RBAC on backend
- User doesn't need to log in again until token expires

---

## 9. Protected Routes

### Concept: Routes That Require Authentication

**Types of Routes:**
1. **Public routes**: Anyone can access (login, register)
2. **Protected routes**: Must be logged in (profile, user dashboard)
3. **Role-protected routes**: Must have specific role (admin dashboard)

### Create: `server/routes/protectedRoutes.js`

```javascript
// server/routes/protectedRoutes.js
import express from "express";
import { pool } from "../config/db.js";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * EXAMPLE 1: Protected Route (Any Logged-In User)
 * 
 * GET /api/protected/profile
 * 
 * MIDDLEWARE USED:
 * - authenticateToken: Ensures user is logged in
 * 
 * WHO CAN ACCESS:
 * - Any authenticated user (user, admin, moderator)
 */
router.get("/profile", authenticateToken, async (req, res) => {
  console.log("📋 Profile request from user:", req.user.userId);
  
  try {
    // req.user is available because authenticateToken added it
    const userId = req.user.userId;
    
    // Get user details from database
    const query = "SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = $1";
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = result.rows[0];
    
    res.json({
      message: "Profile retrieved successfully",
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * EXAMPLE 2: Role-Protected Route (Admin Only)
 * 
 * GET /api/protected/admin/users
 * 
 * MIDDLEWARE USED:
 * - authenticateToken: Ensures user is logged in
 * - authorizeRole("admin"): Ensures user is admin
 * 
 * WHO CAN ACCESS:
 * - Only users with role = "admin"
 */
router.get("/admin/users", 
  authenticateToken,           // First: Check if logged in
  authorizeRole("admin"),      // Second: Check if admin
  async (req, res) => {
    console.log("👤 Admin fetching all users");
    
    try {
      // Get all users from database
      const query = "SELECT id, first_name, last_name, email, role, created_at FROM users ORDER BY created_at DESC";
      const result = await pool.query(query);
      
      res.json({
        message: "Users retrieved successfully",
        count: result.rows.length,
        users: result.rows
      });
      
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * EXAMPLE 3: Role-Protected Route (Admin or Moderator)
 * 
 * DELETE /api/protected/admin/user/:id
 * 
 * MIDDLEWARE USED:
 * - authenticateToken: Ensures user is logged in
 * - authorizeRole("admin", "moderator"): Ensures user is admin OR moderator
 * 
 * WHO CAN ACCESS:
 * - Users with role = "admin" OR "moderator"
 */
router.delete("/admin/user/:id",
  authenticateToken,
  authorizeRole("admin", "moderator"),
  async (req, res) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user.userId;
    
    console.log(`🗑️ User ${currentUserId} attempting to delete user ${targetUserId}`);
    
    // Prevent users from deleting themselves
    if (parseInt(targetUserId) === currentUserId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    
    try {
      const query = "DELETE FROM users WHERE id = $1 RETURNING id, email";
      const result = await pool.query(query, [targetUserId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`✅ User ${targetUserId} deleted by ${currentUserId}`);
      
      res.json({
        message: "User deleted successfully",
        deletedUser: result.rows[0]
      });
      
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * EXAMPLE 4: Protected Route with User's Own Data
 * 
 * GET /api/protected/my-todos
 * 
 * Returns todos belonging to the logged-in user only
 */
router.get("/my-todos", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  
  console.log(`📝 Fetching todos for user ${userId}`);
  
  try {
    // This assumes you have a todos table with user_id column
    // Adjust the query based on your actual schema
    const query = `
      SELECT * FROM todos 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    
    res.json({
      message: "Todos retrieved successfully",
      count: result.rows.length,
      todos: result.rows
    });
    
  } catch (error) {
    console.error("❌ Error fetching todos:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
```

### Update: `server/server.js`

Add the protected routes to your server:

```javascript
// server/server.js
import expressPkg from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";  // ← NEW

dotenv.config();

const express = expressPkg;
const app = express();

app.use(cors());
app.use(express.json());

// Public routes (no authentication required)
app.use("/auth", authRoutes);

// Protected routes (authentication required)
app.use("/api/protected", protectedRoutes);  // ← NEW

app.get("/", (req, res) => {
  res.redirect("http://localhost:3000/login");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**ROUTE STRUCTURE NOW:**

```
Public Routes (No Auth):
├─ POST /auth/login
└─ POST /auth/register

Protected Routes (Auth Required):
├─ GET /api/protected/profile (Any logged-in user)
├─ GET /api/protected/my-todos (Any logged-in user)
├─ GET /api/protected/admin/users (Admin only)
└─ DELETE /api/protected/admin/user/:id (Admin or Moderator)
```

---

## 10. Frontend Implementation

### Concept: Frontend's Role in JWT Authentication

**Important Security Note:**
- Frontend token storage is NOT secure (anyone can access localStorage)
- Frontend role checks are for UI/UX only (hide/show elements)
- **Real security happens on the backend** with middleware

**Frontend Responsibilities:**
1. Store token after login
2. Send token with every request
3. Handle token expiration
4. Clear token on logout
5. Show/hide UI based on role (for user experience)

### Step 1: Update Auth Service

**Update: `client/src/services/authService.js`**

```javascript
// client/src/services/authService.js

const API_URL = "http://localhost:5000";

/**
 * CONCEPT: Login Function
 * 
 * Sends credentials to backend and stores token on success.
 * 
 * FLOW:
 * 1. Send POST request with email and password
 * 2. Receive token and user data
 * 3. Store token in localStorage
 * 4. Store user data in localStorage
 * 5. Return response
 */
export async function login(email, password) {
  console.log("🔑 Attempting login for:", email);
  
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.log("❌ Login failed:", error.message);
    throw new Error(error.message || "Login failed");
  }

  const data = await response.json();
  // data = { message, token, user: { id, firstName, lastName, email, role } }
  
  console.log("✅ Login successful. Storing token...");
  
  // Store token in localStorage
  localStorage.setItem("token", data.token);
  
  // Store user data in localStorage
  localStorage.setItem("user", JSON.stringify(data.user));
  
  console.log("📦 Token stored. User role:", data.user.role);
  
  return data;
}

/**
 * CONCEPT: Register Function
 * 
 * Creates new account and stores token on success.
 */
export async function register(first_name, last_name, email, password) {
  console.log("📝 Attempting registration for:", email);
  
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name, last_name, email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.log("❌ Registration failed:", error.message);
    throw new Error(error.message || "Registration failed");
  }

  const data = await response.json();
  
  console.log("✅ Registration successful. Storing token...");
  
  // Store token and user data
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  
  return data;
}

/**
 * CONCEPT: Logout Function
 * 
 * Clears token and user data from localStorage.
 */
export function logout() {
  console.log("🚪 Logging out...");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  console.log("✅ Token cleared");
}

/**
 * CONCEPT: Get Current User
 * 
 * Retrieves stored user data from localStorage.
 */
export function getCurrentUser() {
  const userJson = localStorage.getItem("user");
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error("❌ Error parsing user data:", error);
    return null;
  }
}

/**
 * CONCEPT: Get Token
 * 
 * Retrieves stored token from localStorage.
 */
export function getToken() {
  return localStorage.getItem("token");
}

/**
 * CONCEPT: Check if User is Authenticated
 * 
 * Checks if token exists in localStorage.
 * 
 * NOTE: This is NOT secure! Backend still needs to verify the token.
 * This is only for UI purposes (showing/hiding elements).
 */
export function isAuthenticated() {
  return !!getToken();  // !! converts to boolean
}

/**
 * CONCEPT: Check User Role
 * 
 * Checks if user has a specific role.
 * 
 * NOTE: This is NOT secure! Backend enforces actual authorization.
 * This is only for UI purposes (showing/hiding admin features).
 */
export function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

/**
 * CONCEPT: Fetch with Authentication
 * 
 * Makes an authenticated request by including the JWT token in headers.
 * 
 * HOW IT WORKS:
 * 1. Get token from localStorage
 * 2. Add "Authorization: Bearer TOKEN" header
 * 3. Make request
 * 4. Handle token expiration
 */
export async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  
  if (!token) {
    throw new Error("No token found. Please log in.");
  }
  
  console.log("🔐 Making authenticated request to:", url);
  
  // Add Authorization header
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
    "Authorization": `Bearer ${token}`  // ← CRITICAL: Send token to backend
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    console.log("❌ Token invalid or expired. Logging out...");
    logout();
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Request failed");
  }
  
  return response.json();
}

/**
 * EXAMPLE USAGE OF fetchWithAuth:
 * 
 * Get user profile:
 */
export async function getProfile() {
  return fetchWithAuth(`${API_URL}/api/protected/profile`);
}

/**
 * Get all users (admin only):
 */
export async function getAllUsers() {
  return fetchWithAuth(`${API_URL}/api/protected/admin/users`);
}
```

**KEY FUNCTIONS EXPLAINED:**

**localStorage:**
```javascript
localStorage.setItem("token", "eyJhbGc...");  // Save
localStorage.getItem("token");                 // Get
localStorage.removeItem("token");              // Delete
```
- `localStorage` = Browser storage (persists even after closing browser)
- Stores strings only (use JSON.stringify for objects)

**fetchWithAuth:**
```javascript
const headers = {
  "Authorization": `Bearer ${token}`
};
```
- `Authorization` header = Where backend expects the token
- `Bearer` = Standard prefix for JWT tokens
- Format: `"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`

---

### Step 2: Protected Route Component (React)

**Create: `client/src/components/ProtectedRoute.jsx`**

```javascript
// client/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated, getCurrentUser } from "../services/authService";

/**
 * CONCEPT: Protected Route Component
 * 
 * Wrapper component that protects routes from unauthenticated users.
 * 
 * HOW IT WORKS:
 * 1. Check if user is authenticated (has token)
 * 2. Optionally check if user has required role
 * 3. If authorized, render the child component
 * 4. If not, redirect to login
 * 
 * USAGE:
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, requiredRole }) {
  console.log("🔒 ProtectedRoute checking authentication...");
  
  // Check if user is logged in
  if (!isAuthenticated()) {
    console.log("❌ Not authenticated. Redirecting to login...");
    return <Navigate to="/login" replace />;
  }
  
  // If a specific role is required, check it
  if (requiredRole) {
    const user = getCurrentUser();
    console.log("🔑 Checking role. Required:", requiredRole, "| User role:", user?.role);
    
    if (!user || user.role !== requiredRole) {
      console.log("❌ Insufficient permissions. Redirecting...");
      return <Navigate to="/" replace />;
    }
  }
  
  console.log("✅ Access granted");
  
  // User is authorized, render the protected component
  return children;
}
```

**LINE-BY-LINE EXPLANATION:**

```javascript
if (!isAuthenticated()) {
  return <Navigate to="/login" replace />;
}
```
- `isAuthenticated()` = Check if token exists in localStorage
- `<Navigate>` = React Router component that redirects
- `replace` = Replace current history entry (can't go back with browser button)

```javascript
if (requiredRole) {
  if (!user || user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
}
```
- Check if component requires a specific role
- If user doesn't have that role, redirect to home

**IMPORTANT SECURITY NOTE:**
This component is for **user experience only**. Even if a user bypasses this and accesses a protected page, the backend middleware will still block the API request if they don't have the correct token/role.

---

### Step 3: Update App Routing

**Update: `client/src/App.js`**

```javascript
// client/src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./services/authService";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import ProfilePage from "./pages/ProfilePage";  // ← NEW
import AdminDashboard from "./pages/AdminDashboard";  // ← NEW

// Components
import { ProtectedRoute } from "./components/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          isAuthenticated() ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated() ? <Navigate to="/" replace /> : <RegisterPage />
        } />
        
        {/* Protected Routes (Any Authenticated User) */}
        <Route path="/" element={
          <ProtectedRoute>
            <MainPage />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Role-Protected Routes (Admin Only) */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### Step 4: Example Page Using Protected Data

**Create: `client/src/pages/ProfilePage.jsx`**

```javascript
// client/src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProfile, logout } from "../services/authService";

/**
 * CONCEPT: Profile Page
 * 
 * Displays user profile by fetching data from protected backend route.
 * 
 * FLOW:
 * 1. Component mounts
 * 2. Call getProfile() which uses fetchWithAuth()
 * 3. Backend receives request with Authorization header
 * 4. authenticateToken middleware verifies token
 * 5. Backend returns user data
 * 6. Display data in UI
 */
function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("📋 ProfilePage mounted. Fetching profile...");
    
    async function fetchProfile() {
      try {
        // This sends token in Authorization header
        const data = await getProfile();
        console.log("✅ Profile received:", data);
        setProfile(data.user);
      } catch (err) {
        console.error("❌ Error fetching profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      {profile && (
        <div>
          <p><strong>Name:</strong> {profile.firstName} {profile.lastName}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Account Created:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
      )}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default ProfilePage;
```

---

### Step 5: Role-Based UI Example

**Create: `client/src/pages/AdminDashboard.jsx`**

```javascript
// client/src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { getAllUsers, logout, getCurrentUser } from "../services/authService";
import { useNavigate } from "react-router-dom";

/**
 * CONCEPT: Admin Dashboard
 * 
 * Admin-only page that displays all users.
 * 
 * PROTECTION LAYERS:
 * 1. ProtectedRoute component (frontend UI protection)
 * 2. authenticateToken middleware (backend verifies token)
 * 3. authorizeRole("admin") middleware (backend verifies role)
 * 
 * Even if user bypasses layer 1, layers 2 & 3 will block the request.
 */
function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    console.log("👤 AdminDashboard mounted. Fetching all users...");
    
    async function fetchUsers() {
      try {
        // This sends token in Authorization header
        // Backend middleware checks: 1) Valid token 2) Role = admin
        const data = await getAllUsers();
        console.log("✅ Users received:", data.count);
        setUsers(data.users);
      } catch (err) {
        console.error("❌ Error fetching users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {currentUser?.firstName}! (Role: {currentUser?.role})</p>
      
      <h2>All Users ({users.length})</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.first_name} {user.last_name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default AdminDashboard;
```

---

### Step 6: Update Login/Register Forms to Handle Tokens

**Update: `client/src/pages/LoginPage.jsx`**

```javascript
// client/src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getCurrentUser } from "../services/authService";
import LoginForm from "../components/LoginForm";

function LoginPage() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (email, password) => {
    console.log("🔑 Login form submitted");
    
    try {
      // Login function stores token and user data automatically
      await login(email, password);
      
      const user = getCurrentUser();
      console.log("✅ Login successful. User role:", user.role);
      
      // Navigate based on role (optional)
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
      
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>Login</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <LoginForm onSubmit={handleLogin} />
    </div>
  );
}

export default LoginPage;
```

---

## 11. Complete Usage Flow

### End-to-End Example with Console Logs

Let's trace a complete flow from login to accessing a protected route.

### Scenario: User Logs In and Views Profile

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: User Submits Login Form                                │
└─────────────────────────────────────────────────────────────────┘

Frontend (Browser Console):
🔑 Login form submitted
🔑 Attempting login for: john@example.com

Backend (Server Console):
🔑 Login attempt for: john@example.com
✅ Password verified for: john@example.com
✅ Token generated for user: 1
✅ Login successful for: john@example.com | Role: user

Frontend (Browser Console):
✅ Login successful. Storing token...
📦 Token stored. User role: user
✅ Login successful. User role: user

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Browser Stores Token                                   │
└─────────────────────────────────────────────────────────────────┘

localStorage now contains:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzAxMTAwMDAwLCJleHAiOjE3MDE3MDQ4MDB9.abc123...",
  "user": "{\"id\":1,\"firstName\":\"John\",\"lastName\":\"Doe\",\"email\":\"john@example.com\",\"role\":\"user\"}"
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: User Navigates to Profile Page                         │
└─────────────────────────────────────────────────────────────────┘

Frontend (Browser Console):
🔒 ProtectedRoute checking authentication...
✅ Access granted
📋 ProfilePage mounted. Fetching profile...
🔐 Making authenticated request to: http://localhost:5000/api/protected/profile

HTTP Request Sent:
GET /api/protected/profile
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Backend Receives Request                               │
└─────────────────────────────────────────────────────────────────┘

Backend (Server Console):
🔐 Authentication middleware running...
📨 Authorization header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ Token verified for user: 1
✅ User authenticated: { userId: 1, email: 'john@example.com', role: 'user', iat: 1701100000, exp: 1701704800 }
📋 Profile request from user: 1

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Backend Returns Profile Data                           │
└─────────────────────────────────────────────────────────────────┘

HTTP Response:
Status: 200 OK
Body: {
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2026-02-18T10:00:00.000Z"
  }
}

Frontend (Browser Console):
✅ Profile received: { message: "Profile retrieved successfully", user: {...} }

UI displays:
┌─────────────────────────┐
│ Profile                 │
│                         │
│ Name: John Doe          │
│ Email: john@example.com │
│ Role: user              │
│ Account Created: 2/18/26│
│                         │
│ [Logout]                │
└─────────────────────────┘
```

---

### What Happens If Token is Invalid?

```
Frontend Request:
GET /api/protected/profile
Headers: {
  "Authorization": "Bearer INVALID_TOKEN_123"
}

Backend Console:
🔐 Authentication middleware running...
📨 Authorization header: Bearer INVALID_TOKEN_123
❌ Token verification failed: invalid signature
❌ Token verification failed: Invalid token

HTTP Response:
Status: 403 Forbidden
Body: {
  "message": "Invalid or expired token."
}

Frontend Console:
❌ Token invalid or expired. Logging out...
(User redirected to /login)
```

---

### What Happens If User Tries to Access Admin Route?

```
User: role = "user"
Attempts to access: /admin/users

Backend Console:
🔐 Authentication middleware running...
✅ User authenticated: { userId: 1, role: 'user' }
🔑 Authorization middleware running...
   Allowed roles: ["admin"]
   User role: user
❌ Access denied. User role 'user' not in allowed roles.

HTTP Response:
Status: 403 Forbidden
Body: {
  "message": "Access denied. Insufficient permissions."
}

Frontend Console:
Error: Access denied. Insufficient permissions.
```

---

## 12. Security Explanation

### Authentication vs Authorization (Detailed)

**Authentication = WHO you are**
```javascript
// Backend checks: "Is this a valid token from a logged-in user?"
app.get("/profile", authenticateToken, (req, res) => {
  // If we reach here, user is authenticated (logged in)
});
```

**Authorization = WHAT you can do**
```javascript
// Backend checks: "Does this user have permission to do this?"
app.get("/admin/users", authenticateToken, authorizeRole("admin"), (req, res) => {
  // If we reach here, user is authenticated AND authorized (is admin)
});
```

### Why Frontend Checks Are NOT Security

**Frontend checks are for USER EXPERIENCE only:**

```javascript
// client/src/App.js
{currentUser.role === "admin" && (
  <Link to="/admin">Admin Dashboard</Link>
)}
```

**This hides the link from non-admin users**, BUT:
- A user can open browser DevTools
- Change `localStorage` to say they're admin
- Manually type `/admin` in the address bar
- See the admin page in UI

**BUT the API request will STILL FAIL:**
```
Frontend: "I'm an admin!" (lying)
Backend: "Show me your admin token"
Frontend: (sends token with role="user")
Backend: "This token says you're a user. Access denied."
```

**Conclusion:**
- Frontend: Show/hide UI elements for better UX
- Backend: ENFORCE actual security with middleware

### Token Expiration Concept

**Why tokens expire:**
- If someone steals your token, they can't use it forever
- Forces users to re-login periodically
- Limits damage from leaked tokens

**How expiration works:**

```javascript
// Generate token with 7-day expiration
const token = jwt.sign(payload, secret, { expiresIn: "7d" });

// Token contains:
{
  userId: 1,
  role: "user",
  iat: 1701100000,  // Issued at: Feb 18, 2026, 10:00 AM
  exp: 1701704800   // Expires: Feb 25, 2026, 10:00 AM
}

// On Feb 26, token verification fails:
jwt.verify(token, secret) // throws TokenExpiredError
```

**Handling expired tokens:**

```javascript
// Frontend automatically logs out and redirects
if (response.status === 401 || response.status === 403) {
  logout();
  window.location.href = "/login";
}
```

### Where Is Data Stored?

```
┌─────────────┬──────────────────┬─────────────┬──────────────┐
│ Location    │ What's Stored    │ Secure?     │ Who Sees It? │
├─────────────┼──────────────────┼─────────────┼──────────────┤
│ Frontend    │ Token            │ ❌ NO       │ Anyone       │
│ localStorage│ User data        │ ❌ NO       │ Anyone       │
│             │ (id, role, etc.) │             │              │
├─────────────┼──────────────────┼─────────────┼──────────────┤
│ JWT Token   │ userId, role     │ ⚠️ VISIBLE  │ Anyone can   │
│ (payload)   │ email, iat, exp  │ but SIGNED  │ decode &     │
│             │                  │             │ read, but    │
│             │                  │             │ can't modify │
├─────────────┼──────────────────┼─────────────┼──────────────┤
│ Database    │ password_hash    │ ✅ YES      │ Only backend │
│             │ user data        │ (hashed)    │              │
├─────────────┼──────────────────┼─────────────┼──────────────┤
│ .env file   │ JWT_SECRET       │ ✅ YES      │ Only backend │
│             │ DATABASE_URL     │ (if secure) │              │
└─────────────┴──────────────────┴─────────────┴──────────────┘
```

**NEVER put sensitive data in JWT payload:**
```javascript
// ❌ BAD
const payload = {
  userId: 1,
  password: "secret123",  // NEVER!
  creditCard: "1234..."   // NEVER!
};

// ✅ GOOD
const payload = {
  userId: 1,
  email: "user@example.com",
  role: "user"
};
```

### Why bcrypt for Passwords?

**The Problem:**
```sql
-- Never do this!
CREATE TABLE users (
  email VARCHAR(255),
  password VARCHAR(255)  -- Storing plain text = DISASTER
);

-- If database is hacked:
john@example.com | password123  ← Attacker can login as John!
```

**The Solution:**
```javascript
// Registration
const password = "password123";
const hashed = await bcrypt.hash(password, 10);
// hashed = "$2b$10$eJ8F5Hq5.H5H.H5.H5.H5.H.H5H5H5H5H5H5H5H5H5H5H"

// Save hashed password to database
await pool.query("INSERT INTO users (email, password_hash) VALUES ($1, $2)", [email, hashed]);

// Login
const isMatch = await bcrypt.compare("password123", hashed);
// isMatch = true ✓
```

**Why this is secure:**
- Even if database is stolen, attacker can't reverse the hash
- Each hash is unique (even for same password, due to salt)
- bcrypt is slow on purpose (prevents brute-force attacks)

---

## 13. Common Mistakes Beginners Make with JWT in PERN

### Mistake 1: Not Sending Token in Authorization Header

**❌ Wrong:**
```javascript
// Frontend
fetch("/api/protected/profile", {
  method: "GET",
  // No Authorization header!
});
```

**✅ Correct:**
```javascript
const token = localStorage.getItem("token");
fetch("/api/protected/profile", {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`  // Must include this!
  }
});
```

---

### Mistake 2: Storing Sensitive Data in JWT

**❌ Wrong:**
```javascript
const payload = {
  userId: 1,
  password: user.password,  // NEVER!
  creditCard: "1234..."     // NEVER!
};
```

**✅ Correct:**
```javascript
const payload = {
  userId: 1,
  email: user.email,
  role: user.role
};
```

**Remember:** Anyone can decode a JWT and read the payload!

---

### Mistake 3: Not Checking Token on Backend

**❌ Wrong:**
```javascript
// Backend route with no middleware
app.get("/admin/users", async (req, res) => {
  // Anyone can access this!
  const users = await pool.query("SELECT * FROM users");
  res.json(users.rows);
});
```

**✅ Correct:**
```javascript
app.get("/admin/users", 
  authenticateToken,      // Check token first!
  authorizeRole("admin"), // Then check role!
  async (req, res) => {
    const users = await pool.query("SELECT * FROM users");
    res.json(users.rows);
  }
);
```

---

### Mistake 4: Trusting Frontend Role Checks

**❌ Wrong:**
```javascript
// Backend trusting frontend data
app.get("/admin/users", async (req, res) => {
  const { role } = req.body;  // User sent this from frontend!
  
  if (role === "admin") {
    // BAD! User can just send { role: "admin" } from frontend
    return res.json(await getAllUsers());
  }
});
```

**✅ Correct:**
```javascript
app.get("/admin/users", authenticateToken, async (req, res) => {
  // Role comes from verified JWT token, not from user input
  if (req.user.role === "admin") {
    return res.json(await getAllUsers());
  }
});

// Or even better:
app.get("/admin/users", 
  authenticateToken, 
  authorizeRole("admin"),  // Middleware handles it!
  async (req, res) => {
    return res.json(await getAllUsers());
  }
);
```

---

### Mistake 5: Forgetting to Call next() in Middleware

**❌ Wrong:**
```javascript
export function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }
  
  const decoded = verifyToken(token);
  req.user = decoded;
  
  // Forgot to call next()! Request hangs forever!
}
```

**✅ Correct:**
```javascript
export function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }
  
  const decoded = verifyToken(token);
  req.user = decoded;
  
  next();  // ← CRITICAL! Continue to next middleware/route
}
```

---

### Mistake 6: Not Handling Token Expiration on Frontend

**❌ Wrong:**
```javascript
export async function fetchWithAuth(url) {
  const token = getToken();
  
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  return response.json();  // What if token expired?
}
```

**✅ Correct:**
```javascript
export async function fetchWithAuth(url) {
  const token = getToken();
  
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  // Handle token expiration
  if (response.status === 401 || response.status === 403) {
    logout();  // Clear invalid token
    window.location.href = "/login";  // Redirect to login
    throw new Error("Session expired");
  }
  
  return response.json();
}
```

---

### Mistake 7: Using Weak JWT Secret

**❌ Wrong:**
```env
JWT_SECRET=secret
```

**✅ Correct:**
```env
JWT_SECRET=8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### Mistake 8: Not Using HTTPS in Production

**⚠️ Warning:**
- JWT tokens in HTTP headers are visible to anyone on the network
- ALWAYS use HTTPS in production
- Never send tokens over unsecured connections

```
HTTP:  ❌ Token visible to network sniffers
HTTPS: ✅ Token encrypted in transit
```

---

### Mistake 9: Putting JWT_SECRET in Frontend Code

**❌ DISASTER:** ```javascript
// client/src/utils/jwt.js
const JWT_SECRET = "my_secret_key";  // NEVER DO THIS!!

// Anyone can view frontend source code and see the secret!
```

**✅ Correct:**
- JWT_SECRET stays on backend ONLY
- Frontend never knows the secret
- Frontend only receives and stores tokens

---

### Mistake 10: Not Validating Inputs

**❌ Wrong:**
```javascript
export async function register(req, res) {
  const { email, password } = req.body;
  
  // No validation! What if email is invalid? Password too short?
  const hash = await bcrypt.hash(password, 10);
  await createUser(email, hash);
}
```

**✅ Correct:**
```javascript
export async function register(req, res) {
  const { email, password } = req.body;
  
  // Validate inputs
  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Invalid email" });
  }
  
  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }
  
  const hash = await bcrypt.hash(password, 10);
  await createUser(email, hash);
}
```

---

## 14. Quick Reference

### Backend Files Checklist

```
✅ server/utils/jwt.js
   - generateToken()
   - verifyToken()

✅ server/middleware/authMiddleware.js
   - authenticateToken()
   - authorizeRole()

✅ server/controllers/authController.js
   - login() - returns token
   - register() - returns token

✅ server/routes/protectedRoutes.js
   - Protected routes with middleware

✅ server/server.js
   - Import and use protected routes

✅ .env
   - JWT_SECRET
   - JWT_EXPIRES_IN
```

### Frontend Files Checklist

```
✅ client/src/services/authService.js
   - login() - stores token
   - register() - stores token
   - logout() - clears token
   - fetchWithAuth() - sends token in header
   - getToken()
   - getCurrentUser()
   - isAuthenticated()
   - hasRole()

✅ client/src/components/ProtectedRoute.jsx
   - Protects routes from unauthenticated users

✅ client/src/App.js
   - Use ProtectedRoute for protected pages
```

### Middleware Usage Patterns

```javascript
// Pattern 1: Public route (anyone can access)
app.post("/auth/login", login);

// Pattern 2: Protected route (logged-in users only)
app.get("/profile", authenticateToken, getProfile);

// Pattern 3: Role-protected route (specific role required)
app.get("/admin/users", 
  authenticateToken, 
  authorizeRole("admin"), 
  getAllUsers
);

// Pattern 4: Multiple roles allowed
app.post("/moderate", 
  authenticateToken, 
  authorizeRole("admin", "moderator"), 
  moderateContent
);
```

---

## 🎓 Congratulations!

You now understand:
- ✅ How JWT works conceptually
- ✅ How to generate and verify tokens
- ✅ How to create authentication middleware
- ✅ How to implement RBAC with authorization middleware
- ✅ How to protect backend routes
- ✅ How to store and send tokens from frontend
- ✅ The complete authentication flow
- ✅ Security best practices
- ✅ Common mistakes to avoid

**Next Steps:**
1. Add the migration SQL to your database
2. Create the utility and middleware files
3. Update your controllers and routes
4. Update your frontend services
5. Test the complete flow
6. Deploy with HTTPS!

---

## Need Help?

Common debugging steps:
1. Check browser console for frontend errors
2. Check server console for backend errors
3. Verify token is being sent in Authorization header (Network tab)
4. Verify JWT_SECRET is in .env and loaded correctly
5. Check database has role column
6. Verify middleware order (authenticateToken before authorizeRole)

Happy coding! 🚀
