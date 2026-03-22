import express from "express";
import { pool } from "../config/db.js";
import { authenticateToken, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const query = "SELECT id, first_name, last_name, email, role, created_at FROM users where id = $1";
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'User not found.'
            });
        }

        const user = result.rows[0];

        res.json({
            message: "Profile retrieved",
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
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;