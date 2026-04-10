import express from "express";
import { login } from "../controllers/authController.js";
import { register } from "../controllers/authController.js";
import {
	createProject,
	getProjects,
	getMemberProjects,
	inviteMemberToProject,
	getProjectInvitations,
	acceptProjectInvitation,
	declineProjectInvitation,
} from "../controllers/projectController.js";
import {
	addFriend,
	getFriends,
	getSentFriendRequests,
	getIncomingFriendRequests,
	acceptFriendRequest,
	declineFriendRequest,
	cancelFriendRequest,
} from "../controllers/friendController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";


const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/create-project", authenticateToken, createProject);
router.get("/projects/my-projects", authenticateToken, getProjects);
router.get("/projects/other-projects", authenticateToken, getMemberProjects);
router.post("/friends", authenticateToken, addFriend);
router.get("/friends", authenticateToken, getFriends);
router.get("/friends/sent", authenticateToken, getSentFriendRequests);
router.get("/friends/incoming", authenticateToken, getIncomingFriendRequests);
router.patch("/friends/requests/:requestId/accept", authenticateToken, acceptFriendRequest);
router.patch("/friends/requests/:requestId/decline", authenticateToken, declineFriendRequest);
router.patch("/friends/requests/:requestId/cancel", authenticateToken, cancelFriendRequest);
router.post("/projects/send-invite/", authenticateToken, inviteMemberToProject);
router.get("/projects/get-invites/", authenticateToken, getProjectInvitations);
router.patch("/projects/invitations/:requestId/accept", authenticateToken, acceptProjectInvitation);
router.patch("/projects/invitations/:requestId/decline", authenticateToken, declineProjectInvitation);

export default router;
