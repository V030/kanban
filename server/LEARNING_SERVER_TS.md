# Understanding server.ts - Complete Learning Module

## Table of Contents
1. [The Big Picture: PHP vs Node.js](#the-big-picture)
2. [Line-by-Line Breakdown](#line-by-line-breakdown)
3. [Core Concepts Explained](#core-concepts-explained)
4. [Common Use Cases](#common-use-cases)
5. [Practice Exercises](#practice-exercises)

---

## The Big Picture: PHP vs Node.js

### How PHP Works (What You Know)
```
Browser Request → Apache Server → Finds PHP file → Executes PHP → Returns Response
```

**Example in PHP:**
```php
// login.php
<?php
  echo "Welcome to login page";
?>
```
- Apache sees the request to `login.php`
- Runs the file automatically
- Returns the output

### How Node.js/Express Works (What You're Learning)
```
Browser Request → Node.js Server → Matches Route → Executes Handler Function → Returns Response
```

**Key Difference:** 
- PHP: Files = Routes (login.php is automatically a route)
- Express: You manually define routes in code

---

## Line-by-Line Breakdown

Let's go through your `server.ts` file step by step:

### Lines 1-4: Importing Dependencies

```typescript
import expressPkg from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/db.ts";
```

**What is `import`?**
- In PHP: You use `require 'file.php'` or `include 'file.php'`
- In Node.js: You use `import` to bring in code from other files or packages

**Breaking it down:**

1. **`import expressPkg from "express";`**
   - **What:** Brings in the Express framework
   - **PHP equivalent:** Like including a framework like Laravel or Symfony
   - **Why:** Express makes building web servers easier (routing, middleware, etc.)
   
2. **`import cors from "cors";`**
   - **What:** CORS = Cross-Origin Resource Sharing
   - **Why you need it:** Your React app (port 3000) needs to talk to your API (port 5000)
   - **Without CORS:** Browser blocks requests between different ports for security
   - **Think of it as:** A security guard that says "Yes, port 3000 is allowed to make requests here"

3. **`import dotenv from "dotenv";`**
   - **What:** Loads environment variables from a `.env` file
   - **PHP equivalent:** Like using `getenv()` or `$_ENV`
   - **Why:** Store secrets (database passwords, API keys) outside your code
   - **Example .env file:**
     ```
     PORT=5000
     DB_PASSWORD=mysecret123
     ```

4. **`import { pool } from "./config/db.ts";`**
   - **What:** Imports database connection pool
   - **Notice the curly braces `{ }`:** This is a "named import" (we'll explain later)
   - **PHP equivalent:** Like `require 'database.php';` where you have DB connection code

---

### Line 6: Initialize Environment Variables

```typescript
dotenv.config();
```

**What it does:** Reads the `.env` file and makes variables available

**PHP equivalent:**
```php
// PHP
$port = getenv('PORT');
```

**In Node.js after dotenv.config():**
```typescript
// Now you can use:
process.env.PORT  // Gets PORT value from .env file
```

---

### Lines 8-11: Setting Up Express

```typescript
const express = expressPkg;
import type { Request, Response } from "express";
const app = express();
```

**Breaking it down:**

1. **`const express = expressPkg;`**
   - Just renaming for clarity (optional)
   
2. **`import type { Request, Response } from "express";`**
   - **What:** TypeScript type definitions (for autocomplete and error checking)
   - **Not actual code:** Just tells TypeScript what types to expect
   - **You can ignore this for now** - it's just for helping your editor

3. **`const app = express();`**
   - **IMPORTANT:** This creates your web server!
   - **PHP equivalent:** This is like starting Apache, but in code
   - **`app` object:** Will be used to define routes, middleware, etc.

---

### Lines 13-14: Middleware Setup

```typescript
app.use(cors());
app.use(express.json());
```

**What is Middleware?**
- Functions that run BEFORE your route handlers
- Like a "pre-processor" for ALL requests

**PHP equivalent:**
```php
// PHP - you might check authentication before every page
if (!isLoggedIn()) {
    header('Location: login.php');
    exit;
}
```

**Breaking it down:**

1. **`app.use(cors());`**
   - **When:** Runs on EVERY request
   - **What it does:** Adds headers to allow cross-origin requests
   - **Allows:** Your React app (localhost:3000) to call this API (localhost:5000)

2. **`app.use(express.json());`**
   - **What it does:** Parses JSON from request body
   - **Example:** When your React app sends `{"email": "user@test.com", "password": "123"}`
   - **After this middleware:** You can access `req.body.email` in your code
   - **PHP equivalent:** Like `json_decode(file_get_contents('php://input'))`

---

### Lines 16-19: Defining a Route

```typescript
app.get("/", (req, res) => {
  res.redirect("http://localhost:5000/login");
});
```

**This is THE most important concept!**

**Breaking it down:**

```typescript
app.get(  path  ,  handler function  )
```

1. **`app.get`**: Handles HTTP GET requests
   - **Other options:** `app.post`, `app.put`, `app.delete`, etc.

2. **`"/"`**: The path/route (root URL)
   - When someone visits `http://localhost:5000/`
   - This function runs

3. **`(req, res) => { ... }`**: This is an arrow function (new syntax for you!)
   - **`req`**: Request object (contains data FROM the client)
   - **`res`**: Response object (used to send data BACK to client)

**Arrow Function Syntax:**

PHP:
```php
function handler($req, $res) {
    // code
}
```

JavaScript (old way):
```javascript
function(req, res) {
    // code
}
```

JavaScript (arrow function - new way):
```javascript
(req, res) => {
    // code
}
```
They're the same thing, just shorter syntax!

4. **`res.redirect(...)`**: Sends a redirect response to the browser
   - **PHP equivalent:** `header('Location: ...');`

**PHP vs Express Comparison:**

PHP:
```php
// index.php
<?php
  header('Location: http://localhost:5000/login');
?>
```

Express:
```javascript
app.get("/", (req, res) => {
  res.redirect("http://localhost:5000/login");
});
```

---

### Line 21: Environment Variables in Action

```typescript
const PORT = process.env.PORT || 5000;
```

**What this does:**
- Try to get `PORT` from environment variables
- If it doesn't exist, use `5000` as default

**The `||` operator:**
- Means "OR"
- "Use process.env.PORT, OR if it's undefined, use 5000"

**PHP equivalent:**
```php
$port = getenv('PORT') ?: 5000;
```

---

### Lines 23-25: Starting the Server

```typescript
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Breaking it down:**

1. **`app.listen(PORT, callback)`**
   - **What:** Starts the web server on the specified port
   - **PHP equivalent:** Like running `php -S localhost:5000` in command line
   - **Difference:** In Node.js, the server keeps running until you stop it

2. **`() => { console.log(...) }`**
   - **What:** Callback function (runs AFTER server starts)
   - **Purpose:** Confirms the server is running

3. **Template Literals (Backticks):**
   ```javascript
   `Server running on port ${PORT}`
   ```
   - **New syntax!** Backticks (`) allow embedding variables
   - **PHP equivalent:**
     ```php
     echo "Server running on port $port";
     ```

---

## Core Concepts Explained

### 1. The Request-Response Cycle

```
Client → Request → Server → Response → Client
```

**Example:**
```javascript
app.get("/hello", (req, res) => {
  res.send("Hello World");
});
```

When browser visits `localhost:5000/hello`:
1. Express matches the route `/hello`
2. Runs the handler function
3. `res.send("Hello World")` sends response back
4. Browser receives "Hello World"

---

### 2. Route Parameters (req object)

The `req` (request) object contains:

```javascript
app.get("/user", (req, res) => {
  // URL: localhost:5000/user?name=John&age=25
  
  console.log(req.query);  // { name: 'John', age: 25 }
  console.log(req.body);   // Data from POST request
  console.log(req.params); // URL parameters
});
```

**PHP equivalent:**
```php
$_GET['name'];   // John
$_POST['email']; // POST data
```

---

### 3. Response Methods (res object)

```javascript
// Send text
res.send("Hello");

// Send JSON
res.json({ message: "Success" });

// Redirect
res.redirect("/login");

// Set status code
res.status(404).send("Not found");

// Send HTML
res.send("<h1>Welcome</h1>");
```

**PHP equivalents:**
```php
echo "Hello";                          // res.send()
echo json_encode(['message' => 'hi']); // res.json()
header('Location: /login');            // res.redirect()
http_response_code(404);               // res.status(404)
```

---

### 4. Route Methods (HTTP Verbs)

```javascript
// GET - Retrieve data (like viewing a page)
app.get("/users", (req, res) => {
  res.json({ users: [] });
});

// POST - Create new data (like submitting a form)
app.post("/users", (req, res) => {
  // req.body contains the form data
  const { name, email } = req.body;
  // Save to database...
  res.json({ message: "User created" });
});

// PUT - Update data
app.put("/users/:id", (req, res) => {
  const userId = req.params.id;
  // Update user...
});

// DELETE - Delete data
app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;
  // Delete user...
});
```

**When to use each:**
- **GET:** Fetching/reading data (safe, no changes)
- **POST:** Creating new resources
- **PUT:** Updating existing resources
- **DELETE:** Removing resources

---

## Common Use Cases

### Use Case 1: Returning JSON (API Endpoint)

```javascript
app.get("/api/todos", (req, res) => {
  const todos = [
    { id: 1, title: "Learn Node.js", completed: false },
    { id: 2, title: "Build API", completed: true }
  ];
  
  res.json(todos);
});
```

**What happens:**
- Browser/React visits `localhost:5000/api/todos`
- Gets back JSON data
- React can display this in the UI

**PHP equivalent:**
```php
// todos.php
<?php
header('Content-Type: application/json');
$todos = [
  ['id' => 1, 'title' => 'Learn Node.js', 'completed' => false]
];
echo json_encode($todos);
?>
```

---

### Use Case 2: Handling Form Submission

```javascript
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  // Validate credentials (simplified)
  if (email === "test@test.com" && password === "password123") {
    res.json({ success: true, token: "abc123" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});
```

**What the destructuring syntax `{ email, password }` means:**

Instead of:
```javascript
const email = req.body.email;
const password = req.body.password;
```

You can write:
```javascript
const { email, password } = req.body;
```
Both do the exact same thing!

---

### Use Case 3: Using Route Parameters

```javascript
// URL: localhost:5000/api/users/123
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id; // "123"
  
  // Fetch user from database
  // const user = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
  
  res.json({ id: userId, name: "John Doe" });
});
```

**PHP equivalent:**
```php
// user.php?id=123
$userId = $_GET['id'];
```

---

### Use Case 4: Middleware for Authentication

```javascript
// Middleware function
function requireAuth(req, res, next) {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  
  // If valid, continue to next handler
  next();
}

// Protected route
app.get("/api/protected", requireAuth, (req, res) => {
  res.json({ message: "You are authenticated!" });
});
```

**What `next()` does:**
- Tells Express to move to the next middleware/handler
- Without `next()`, the request hangs forever

---

## Practice Exercises

Try adding these to your `server.ts`:

### Exercise 1: Simple GET Route
Add a route that returns your name:
```javascript
app.get("/api/myname", (req, res) => {
  // Return JSON with your name
});
```

### Exercise 2: POST Route
Add a route that receives data:
```javascript
app.post("/api/greet", (req, res) => {
  const { name } = req.body;
  // Return a greeting message using the name
});
```

### Exercise 3: Route Parameters
Add a route with parameters:
```javascript
app.get("/api/multiply/:num1/:num2", (req, res) => {
  // Get num1 and num2 from params
  // Multiply them
  // Return result
});
```

---

## Key Takeaways

1. **Express is NOT like PHP files** - You define routes in code, not via files
2. **Middleware runs before routes** - Use for authentication, parsing, logging
3. **`req` = incoming data, `res` = outgoing data**
4. **Arrow functions `() => {}`** - Just shorter function syntax
5. **Template literals use backticks** - `` `Hello ${name}` ``
6. **Destructuring** - `{ email } = req.body` extracts properties
7. **Import/Export** - Node.js way of including code

---

## Next Steps

1. Understand how routes work
2. Learn about controllers (organizing route logic)
3. Connect to database using the `pool` import
4. Implement authentication with JWT tokens
5. Handle errors properly

---

## Questions to Test Understanding

1. What's the difference between `app.get()` and `app.post()`?
2. What does `app.use()` do?
3. Why do we need CORS?
4. What's inside the `req` object?
5. What's inside the `res` object?
6. How is Express routing different from PHP files?

If you can answer these, you understand the basics! 🎉
