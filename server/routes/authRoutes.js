import express from "express";
import { login } from "../controllers/authController.js";
import { register } from "../controllers/authController.js";
import {
	createProject,
	getProjects,
	getMemberProjects,
	getProjectMembers,
	inviteMemberToProject,
	getProjectInvitations,
	acceptProjectInvitation,
	declineProjectInvitation,
	getTaskCategories,
	createTaskCategory,
	createNewTask,
	getProjectSettings,
	updateProjectSettings,
	takeProjectTask,
	updateTaskStatus,
	updateTaskPriority,
	assignTaskToOthers,
	unassignTaskFromMember,
	unassignTaskFromSelf,
	createSubtask,
	updateSubtask,
	deleteSubtask,
	getTaskComments,
	createTaskComment,
	createTaskCommentReply,
	getProjectTags,
	getTaskTags,
	createTaskTag,
	deleteTaskTag,
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
router.get("/projects/:projectId/members", authenticateToken, getProjectMembers);
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
router.get("/projects/:projectId/get-task-categories", authenticateToken, getTaskCategories);
router.post("/projects/:projectId/create-task-category", authenticateToken, createTaskCategory);
router.post("/projects/:projectId/:categoryId/create-new-task", authenticateToken, createNewTask);
router.get("/project-settings/:projectId", authenticateToken, getProjectSettings);
router.patch("/project-settings", authenticateToken, updateProjectSettings);
router.post("/project/take-task/:taskId/", authenticateToken, takeProjectTask);
router.patch("/project/tasks/:taskId/status", authenticateToken, updateTaskStatus);
router.patch("/project/tasks/:taskId/priority", authenticateToken, updateTaskPriority);
router.post("/project/tasks/assign-task/:memberId/:taskId/", authenticateToken, assignTaskToOthers);
router.delete("/project/tasks/assign-task/:memberId/:taskId/", authenticateToken, unassignTaskFromMember);
router.delete("/project/tasks/unassign-task/:taskId/", authenticateToken, unassignTaskFromSelf);
router.post("/project/tasks/:taskId/subtasks", authenticateToken, createSubtask);

router.patch("/project/tasks/:taskId/subtasks/:subtaskId", authenticateToken, updateSubtask);
router.delete("/project/tasks/:taskId/subtasks/:subtaskId", authenticateToken, deleteSubtask);
router.get("/api/tasks/:taskId/comments", authenticateToken, getTaskComments);
router.post("/api/tasks/:taskId/comments/:userId", authenticateToken, createTaskComment);
router.post("/api/tasks/:taskId/comments/:commentId/:userId", authenticateToken, createTaskCommentReply);
router.get("/projects/:projectId/tags", authenticateToken, getProjectTags);
router.get("/api/tasks/:taskId/tags", authenticateToken, getTaskTags);
router.post("/api/tasks/:taskId/tags", authenticateToken, createTaskTag);
router.delete("/api/tasks/:taskId/tags/:tagId", authenticateToken, deleteTaskTag);
export default router;
