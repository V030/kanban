# GET Projects Flow Guide (PERN + MVC)

This guide gives you a complete follow-along implementation for fetching projects from PostgreSQL and rendering them in your React UI.

It follows your current structure and naming:
- Backend: routes -> controllers -> models
- Frontend: services -> pages/components
- Auth: JWT via `fetchWithAuth`

---

## 1) Current Data Flow (What You Already Have)

For create project, your app already uses this path:

Frontend modal -> frontend service -> Express route -> controller -> model -> PostgreSQL

You will do the same for GET projects.

---

## 2) Goal

Implement and use:
- Backend endpoint: `GET /auth/projects`
- DB query: only projects owned by logged-in user
- Frontend fetch: `getProjects()` in service
- Frontend state + render in `Projects.jsx`

Why `GET /auth/projects` and not `/projects`?
Because in `server.js`, routes are mounted with:
- `app.use("/auth", authRoutes);`

So route path in `authRoutes.js` + `/auth` prefix = final URL.

---

## 3) Backend Changes

### Step A: Model query (PostgreSQL read)

File: `server/models/projectModel.js`

Add this function to the same file (keep `createProject` as is):

```js
export async function getProjectsByOwner(ownerId) {
  const query = `
    SELECT id, name, description, owner, created_by, created_at
    FROM projects
    WHERE owner = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [ownerId]);
  return result.rows;
}
```

Why this step matters:
- Model should contain DB logic only.
- `$1` parameterization prevents SQL injection.
- Filtering by `owner` enforces user isolation in the backend.

---

### Step B: Controller handler

File: `server/controllers/projectController.js`

Use this full controller content:

```js
import {
  createProject as createProjectModel,
  getProjectsByOwner,
} from "../models/projectModel.js";

export async function createProject(req, res) {
  const projectName = (req.body?.project_name || req.body?.name || "").trim();
  const projectDescription = (req.body?.project_description || req.body?.description || "").trim();

  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!projectName) {
    return res.status(400).json({ message: "Project name is required" });
  }

  if (projectName.length > 255) {
    return res.status(400).json({ message: "Project name is too long" });
  }

  try {
    const createdProject = await createProjectModel({
      name: projectName,
      description: projectDescription,
      created_by: req.user.userId,
    });

    return res.status(201).json({
      message: "Project created successfully",
      project: createdProject.project,
      board: createdProject.board,
      categories: createdProject.categories,
    });
  } catch (error) {
    console.error("Project creation error:", error);
    return res.status(500).json({ message: "Unable to create project" });
  }
}

export async function getProjects(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const projects = await getProjectsByOwner(req.user.userId);
    return res.status(200).json({ projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({ message: "Unable to fetch projects" });
  }
}
```

Why this step matters:
- Controller handles HTTP concerns: auth check, status codes, response format.
- Controller should not contain SQL.

---

### Step C: Route wiring

File: `server/routes/authRoutes.js`

Use this route setup:

```js
import express from "express";
import { login } from "../controllers/authController.js";
import { register } from "../controllers/authController.js";
import { createProject, getProjects } from "../controllers/projectController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/create-project", authenticateToken, createProject);
router.get("/projects", authenticateToken, getProjects);

export default router;
```

Why this step matters:
- Route is the API contract layer.
- `authenticateToken` ensures only logged-in users can fetch their projects.

---

## 4) Frontend Changes

### Step D: Service function

File: `client/src/services/projectService.js`

Use this:

```js
import { fetchWithAuth } from "./authService";

const API_URL = "http://localhost:5000";

export async function createProject(projectData) {
  return fetchWithAuth(`${API_URL}/auth/create-project`, {
    method: "POST",
    body: JSON.stringify(projectData),
  });
}

export async function getProjects() {
  return fetchWithAuth(`${API_URL}/auth/projects`, {
    method: "GET",
  });
}
```

Why this step matters:
- Keeps API calls in one place.
- Reuses your existing auth/token logic.

---

### Step E: Optional refresh hook after create

File: `client/src/components/common/CreateProjectModal.jsx`

Change component signature and submit logic:

```jsx
export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  // ...existing state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!projectData.name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      await createProject({
        name: projectData.name.trim(),
        description: projectData.description.trim(),
      });

      setProjectData({ name: "", description: "" });

      if (onCreated) {
        await onCreated();
      }

      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "Project creation failed");
    }
  };

  // ...rest of component unchanged
}
```

Why this step matters:
- Lets parent page refresh projects immediately after successful create.

---

### Step F: Fetch + state + render projects

File: `client/src/pages/Projects.jsx`

Use this full page:

```jsx
import React, { useEffect, useState } from "react";
import CreateProjectModal from "../components/common/CreateProjectModal";
import { getProjects } from "../services/projectService";
import "../components/common/CreateProjectModal.css";

function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProjects = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div>
      <h1>Projects</h1>
      <p>Manage and organize all your projects</p>

      <button className="add-project-btn" onClick={() => setIsModalOpen(true)}>
        + Create Project
      </button>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadProjects}
      />

      {loading && <p>Loading projects...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && projects.length === 0 && <p>No projects yet.</p>}

      {!loading && !error && projects.length > 0 && (
        <div>
          {projects.map((project) => (
            <div key={project.id} style={{ border: "1px solid #ddd", padding: "12px", marginTop: "12px" }}>
              <h3>{project.name}</h3>
              <p>{project.description || "No description"}</p>
              <small>Created: {new Date(project.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
```

Why this step matters:
- `useState` stores async data + UI status.
- `useEffect` triggers fetch on first render.
- conditional rendering prevents undefined/null UI errors.

---

## 5) Common Mistakes to Avoid

1. Wrong endpoint path:
- If you call `/projects` from frontend but route is mounted under `/auth`, you get 404.

2. Missing token:
- If you use raw `fetch` instead of `fetchWithAuth`, GET may return 401.

3. Wrong response shape:
- Backend returns `{ projects: [...] }`, so frontend should use `data.projects`.

4. Async state issues:
- Always use `try/catch/finally` so loading state resets on errors.

5. SQL/user isolation mistake:
- Never trust user id from frontend body for GET filtering.
- Always use `req.user.userId` from JWT middleware.

---

## 6) Quick Verification Checklist

1. Login in app.
2. Open Projects page.
3. Confirm you see loading -> list (or empty state).
4. Create a project in modal.
5. Confirm list refreshes automatically.
6. Confirm only your own projects appear.

---

## 7) Mental Model You Can Reuse for Other Features

For any feature (tasks, notes, assignments), repeat this exact pattern:

1. Model: DB query function
2. Controller: HTTP + validation + call model
3. Route: endpoint + auth middleware
4. Frontend service: API call helper
5. Frontend page/component: state + effect + render

If you keep this flow consistent, your app stays maintainable as features grow.
