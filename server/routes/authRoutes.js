import express from "express";
import { login, register } from "../controllers/authController.js";
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
	getTaskById,
	getTaskReviews,
	approveTaskReview,
	rejectTaskReview,
	createTaskCategory,
	createNewTask,
	getProjectSettings,
	updateProjectSettings,
	takeProjectTask,
	getMyTasks,
	updateTaskStatus,
	updateTaskPriority,
	updateTaskTargetDate,
	updateTaskName,
	updateProjectName,
	updateTaskDescription,
	updateProjectDescription,
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
	deleteTask,
	deleteProject,
	removeMemberFromProject,
	updateMemberRole,
	getProjectMetrics,
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
router.get("/project/tasks/:taskId", authenticateToken, getTaskById);
router.get("/project/tasks/:taskId/reviews", authenticateToken, getTaskReviews);
router.post("/project/tasks/:taskId/review/approve", authenticateToken, approveTaskReview);
router.post("/project/tasks/:taskId/review/reject", authenticateToken, rejectTaskReview);
router.post("/projects/:projectId/create-task-category", authenticateToken, createTaskCategory);
router.post("/projects/:projectId/:categoryId/create-new-task", authenticateToken, createNewTask);
router.get("/project-settings/:projectId", authenticateToken, getProjectSettings);
router.patch("/project-settings", authenticateToken, updateProjectSettings);
router.patch("/projects/:projectId/name", authenticateToken, updateProjectName);
router.patch("/projects/:projectId/description", authenticateToken, updateProjectDescription);
router.delete("/projects/:projectId", authenticateToken, deleteProject);
router.delete("/projects/:projectId/members/:memberId", authenticateToken, removeMemberFromProject);
router.patch("/projects/:projectId/members/:memberId/role", authenticateToken, updateMemberRole);
router.post("/project/take-task/:taskId/", authenticateToken, takeProjectTask);
	router.get("/tasks/my-tasks", authenticateToken, getMyTasks);
router.patch("/project/tasks/:taskId/status", authenticateToken, updateTaskStatus);
router.patch("/project/tasks/:taskId/priority", authenticateToken, updateTaskPriority);
router.patch("/project/tasks/:taskId/name", authenticateToken, updateTaskName);
router.patch("/project/tasks/:taskId/description", authenticateToken, updateTaskDescription);
router.patch("/project/tasks/:taskId/target-date", authenticateToken, updateTaskTargetDate);
router.post("/project/tasks/assign-task/:memberId/:taskId/", authenticateToken, assignTaskToOthers);
router.delete("/project/tasks/assign-task/:memberId/:taskId/", authenticateToken, unassignTaskFromMember);
router.delete("/project/tasks/unassign-task/:taskId/", authenticateToken, unassignTaskFromSelf);
router.delete("/project/tasks/:taskId", authenticateToken, deleteTask);
router.post("/project/tasks/:taskId/subtasks", authenticateToken, createSubtask);

router.patch("/project/tasks/:taskId/subtasks/:subtaskId", authenticateToken, updateSubtask);
router.delete("/project/tasks/:taskId/subtasks/:subtaskId", authenticateToken, deleteSubtask);
router.get("/api/tasks/:taskId/comments", authenticateToken, getTaskComments);
router.post("/api/tasks/:taskId/comments/:userId", authenticateToken, createTaskComment);
router.post("/api/tasks/:taskId/comments/:commentId/:userId", authenticateToken, createTaskCommentReply);
router.get("/projects/:projectId/tags", authenticateToken, getProjectTags);
router.get("/projects/:projectId/metrics", authenticateToken, getProjectMetrics);
router.get("/api/tasks/:taskId/tags", authenticateToken, getTaskTags);
router.post("/api/tasks/:taskId/tags", authenticateToken, createTaskTag);
router.delete("/api/tasks/:taskId/tags/:tagId", authenticateToken, deleteTaskTag);
export default router;
