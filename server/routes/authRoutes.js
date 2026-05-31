import express from "express";
import {
	login,
	register,
	checkEmailController,
	requestPasswordResetController,
	resetPasswordController,
	verifyPasswordResetController,
	completePasswordResetController,
	requestEmailVerificationController,
	verifyEmailVerificationController,
	testEmailController,
} from "../controllers/authController.js";
import { googleAuth } from "../controllers/googleAuthController.js";
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
	getTaskFiles,
	uploadTaskFile,
	deleteTaskFile,
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
	removeFriend,
} from "../controllers/friendController.js";

import {
	getNotifications,
	getUnreadNotificationsCount,
	markNotificationAsRead,
	markAllNotificationsAsRead,
	streamNotifications,
} from "../controllers/notificationController.js";

import { authenticateToken } from "../middleware/authMiddleware.js";
import { uploadTaskFile as uploadTaskFileMiddleware, cleanupUploadedFile } from "../middleware/taskFileUpload.js";
import {
	authLimiter,
	passwordResetRequestLimiter,
	passwordResetConfirmLimiter,
	authenticatedLimiter,
	inviteLimiter,
	projectActionLimiter,
	taskWriteLimiter,
} from "../middleware/rateLimiter.js";


const router = express.Router();

function taskFileUploadMiddleware(req, res, next) {
	uploadTaskFileMiddleware(req, res, (error) => {
		if (!error) return next();
		cleanupUploadedFile(req.file);
		if (error?.code === "LIMIT_FILE_SIZE") {
			return res.status(413).json({
				success: false,
				error: "File is too large. Please choose a smaller file.",
				code: "INVALID_FILE_SIZE",
			});
		}
		return res.status(400).json({
			success: false,
			error: error?.message || "Unable to upload file",
			code: error?.code || "INVALID_FILE",
		});
	});
}

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);
router.post("/check-email", authLimiter, checkEmailController);
router.post("/google", authLimiter, googleAuth);
router.post("/email-verification/request", passwordResetRequestLimiter, requestEmailVerificationController);
router.post("/email-verification/verify", passwordResetConfirmLimiter, verifyEmailVerificationController);
router.post("/forgot-password/request-otp", passwordResetRequestLimiter, requestPasswordResetController);
router.post("/forgot-password/verify-otp", passwordResetConfirmLimiter, verifyPasswordResetController);
router.post("/forgot-password/complete", passwordResetConfirmLimiter, completePasswordResetController);
router.post("/forgot-password/reset-password", passwordResetConfirmLimiter, resetPasswordController);
router.post("/test-email", authLimiter, testEmailController);
router.post("/create-project", authenticateToken, projectActionLimiter, createProject);
router.get("/projects/my-projects", authenticateToken, authenticatedLimiter, getProjects);
router.get("/projects/other-projects", authenticateToken, authenticatedLimiter, getMemberProjects);
router.get("/projects/:projectId/members", authenticateToken, authenticatedLimiter, getProjectMembers);
router.post("/friends", authenticateToken, inviteLimiter, addFriend);
router.get("/friends", authenticateToken, authenticatedLimiter, getFriends);
router.delete("/friends/:friendshipId", authenticateToken, authenticatedLimiter, removeFriend);
router.get("/friends/sent", authenticateToken, authenticatedLimiter, getSentFriendRequests);
router.get("/friends/incoming", authenticateToken, authenticatedLimiter, getIncomingFriendRequests);
router.patch("/friends/requests/:requestId/accept", authenticateToken, inviteLimiter, acceptFriendRequest);
router.patch("/friends/requests/:requestId/decline", authenticateToken, inviteLimiter, declineFriendRequest);
router.patch("/friends/requests/:requestId/cancel", authenticateToken, inviteLimiter, cancelFriendRequest);
router.get("/notifications/stream", streamNotifications);
router.get("/notifications", authenticateToken, authenticatedLimiter, getNotifications);
router.get("/notifications/unread-count", authenticateToken, authenticatedLimiter, getUnreadNotificationsCount);
router.patch("/notifications/:notificationId/read", authenticateToken, authenticatedLimiter, markNotificationAsRead);
router.patch("/notifications/mark-all-read", authenticateToken, authenticatedLimiter, markAllNotificationsAsRead);
router.post("/projects/send-invite/", authenticateToken, inviteLimiter, inviteMemberToProject);
router.get("/projects/get-invites/", authenticateToken, authenticatedLimiter, getProjectInvitations);
router.patch("/projects/invitations/:requestId/accept", authenticateToken, inviteLimiter, acceptProjectInvitation);
router.patch("/projects/invitations/:requestId/decline", authenticateToken, inviteLimiter, declineProjectInvitation);
router.get("/projects/:projectId/get-task-categories", authenticateToken, authenticatedLimiter, getTaskCategories);
router.get("/project/tasks/:taskId", authenticateToken, authenticatedLimiter, getTaskById);
router.get("/project/tasks/:taskId/reviews", authenticateToken, authenticatedLimiter, getTaskReviews);
router.post("/project/tasks/:taskId/review/approve", authenticateToken, taskWriteLimiter, approveTaskReview);
router.post("/project/tasks/:taskId/review/reject", authenticateToken, taskWriteLimiter, rejectTaskReview);
router.post("/projects/:projectId/create-task-category", authenticateToken, taskWriteLimiter, createTaskCategory);
router.post("/projects/:projectId/:categoryId/create-new-task", authenticateToken, taskWriteLimiter, createNewTask);
router.get("/project-settings/:projectId", authenticateToken, authenticatedLimiter, getProjectSettings);
router.patch("/project-settings", authenticateToken, projectActionLimiter, updateProjectSettings);
router.patch("/projects/:projectId/name", authenticateToken, projectActionLimiter, updateProjectName);
router.patch("/projects/:projectId/description", authenticateToken, projectActionLimiter, updateProjectDescription);
router.delete("/projects/:projectId", authenticateToken, projectActionLimiter, deleteProject);
router.delete("/projects/:projectId/members/:memberId", authenticateToken, projectActionLimiter, removeMemberFromProject);
router.patch("/projects/:projectId/members/:memberId/role", authenticateToken, projectActionLimiter, updateMemberRole);
router.post("/project/take-task/:taskId/", authenticateToken, taskWriteLimiter, takeProjectTask);
	router.get("/tasks/my-tasks", authenticateToken, authenticatedLimiter, getMyTasks);
router.patch("/project/tasks/:taskId/status", authenticateToken, taskWriteLimiter, updateTaskStatus);
router.patch("/project/tasks/:taskId/priority", authenticateToken, taskWriteLimiter, updateTaskPriority);
router.patch("/project/tasks/:taskId/name", authenticateToken, taskWriteLimiter, updateTaskName);
router.patch("/project/tasks/:taskId/description", authenticateToken, taskWriteLimiter, updateTaskDescription);
router.patch("/project/tasks/:taskId/target-date", authenticateToken, taskWriteLimiter, updateTaskTargetDate);
router.post("/project/tasks/assign-task/:memberId/:taskId/", authenticateToken, taskWriteLimiter, assignTaskToOthers);
router.delete("/project/tasks/assign-task/:memberId/:taskId/", authenticateToken, taskWriteLimiter, unassignTaskFromMember);
router.delete("/project/tasks/unassign-task/:taskId/", authenticateToken, taskWriteLimiter, unassignTaskFromSelf);
router.delete("/project/tasks/:taskId", authenticateToken, taskWriteLimiter, deleteTask);
router.post("/project/tasks/:taskId/subtasks", authenticateToken, taskWriteLimiter, createSubtask);

router.patch("/project/tasks/:taskId/subtasks/:subtaskId", authenticateToken, taskWriteLimiter, updateSubtask);
router.delete("/project/tasks/:taskId/subtasks/:subtaskId", authenticateToken, taskWriteLimiter, deleteSubtask);
router.get("/api/tasks/:taskId/comments", authenticateToken, authenticatedLimiter, getTaskComments);
router.post("/api/tasks/:taskId/comments/:userId", authenticateToken, taskWriteLimiter, createTaskComment);
router.post("/api/tasks/:taskId/comments/:commentId/:userId", authenticateToken, taskWriteLimiter, createTaskCommentReply);
router.get("/projects/:projectId/tags", authenticateToken, authenticatedLimiter, getProjectTags);
router.get("/projects/:projectId/metrics", authenticateToken, authenticatedLimiter, getProjectMetrics);
router.get("/api/tasks/:taskId/tags", authenticateToken, authenticatedLimiter, getTaskTags);
router.post("/api/tasks/:taskId/tags", authenticateToken, taskWriteLimiter, createTaskTag);
router.delete("/api/tasks/:taskId/tags/:tagId", authenticateToken, taskWriteLimiter, deleteTaskTag);
router.get("/tasks/:taskId/files", authenticateToken, authenticatedLimiter, getTaskFiles);
router.post("/tasks/:taskId/files", authenticateToken, taskWriteLimiter, taskFileUploadMiddleware, uploadTaskFile);
router.delete("/tasks/:taskId/files/:fileId", authenticateToken, taskWriteLimiter, deleteTaskFile);
export default router;
