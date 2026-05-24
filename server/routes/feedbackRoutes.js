import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { feedbackLimiter } from "../middleware/rateLimiter.js";
import { submitFeedback } from "../controllers/feedbackController.js";

const router = express.Router();

router.post("/", authenticateToken, feedbackLimiter, submitFeedback);

export default router;