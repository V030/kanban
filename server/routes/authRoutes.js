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
