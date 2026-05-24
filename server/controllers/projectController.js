import { createProject as createProjectModel,
         getProjectsByOwner,
         getProjectsByMember,
         getProjectMembers as getProjectMembersModel,
         inviteMemberToProject as inviteMemberToProjectModel,
         getProjectInvitations as getProjectInvitationsModel,
         acceptProjectInvitation as acceptProjectInvitationModel,
         declineProjectInvitation as declineProjectInvitationModel,
         getTaskCategories as getTaskCategoriesModel,
         getTaskById as getTaskByIdModel,
         createTaskCategory as createTaskCategoryModel,
         createTask as createTaskModel,
         getProjectSettings as getProjectSettingsModel,
         updateProjectSettings as updateProjectSettingsModel,
         updateProjectName as updateProjectNameModel,
         updateProjectDescription as updateProjectDescriptionModel,
         takeProjectTask as takeProjectTaskModel,
         getMyTasks as getMyTasksModel,
         mapMyTasksRows,
         updateTaskStatus as updateTaskStatusModel,
         createReview as createReviewModel,
         getReviewsByTask as getReviewsByTaskModel,
         approveTaskReview as approveTaskReviewModel,
         rejectTaskReview as rejectTaskReviewModel,
         updateTaskPriority as updateTaskPriorityModel,
         updateTaskTargetDate as updateTaskTargetDateModel,
         updateTaskName as updateTaskNameModel,
         updateTaskDescription as updateTaskDescriptionModel,
         assignTaskToOthers as assignTaskToOthersModel,
         unassignTaskFromMember as unassignTaskFromMemberModel,
         unassignTaskFromSelf as unassignTaskFromSelfModel,
         createSubtask as createSubtaskModel,
         deleteSubtask as deleteSubtaskModel,
         createTaskComment as createTaskCommentModel,
         createTaskCommentReply as createTaskCommentReplyModel,
         getTaskComments as getTaskCommentsModel,
         getProjectTags as getProjectTagsModel,
         getTaskTags as getTaskTagsModel,
         createTaskTag as createTaskTagModel,
         deleteTaskTag as deleteTaskTagModel,
         deleteTask as deleteTaskModel,
         deleteProject as deleteProjectModel,
         removeMemberFromProject as removeMemberFromProjectModel,
         updateMemberRole as updateMemberRoleModel,
         } from "../models/projectModel.js";

import { getProjectMetrics as getProjectMetricsController } from "./metricsController.js";
import { createNotification, getUserSummary, getProjectSummary, getTaskContext } from "../models/notificationModel.js";
import { getTaskPermissionContext } from "../utils/projectPermissions.js";
import { broadcastProjectEvent, broadcastToastEvent } from "../utils/realtimeBroadcaster.js";

export { getProjectMetricsController as getProjectMetrics };

function truncateNotificationText(value, maxLength = 140) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function buildTaskNotificationUrl(taskContext) {
  const projectId = String(taskContext?.projectId || "").trim();
  const taskId = taskContext?.taskId;

  if (!projectId || taskId == null) {
    return "/main-page/projects";
  }

  return `/main-page/projects/${projectId}/kanban/tasks/${taskId}`;
}

function buildNotificationRecipients({ creatorId, assigneeIds = [], actorId }) {
  const ids = new Set([creatorId, ...(assigneeIds || [])].filter(Boolean));
  if (actorId) ids.delete(actorId);
  return Array.from(ids);
}

function getMemberIds(members = []) {
  return Array.from(
    new Set(
      (Array.isArray(members) ? members : [])
        .map((member) => String(member?.id || member?.userId || member?.user_id || "").trim())
        .filter(Boolean)
    )
  );
}

async function broadcastProjectMembersEvent({ projectId, requesterId, payload }) {
  if (!projectId || !requesterId) return;

  try {
    const members = await getProjectMembersModel({ projectId, requesterId });
    const recipientIds = getMemberIds(members);
    if (recipientIds.length === 0) return;

    broadcastProjectEvent(recipientIds, payload);
  } catch (error) {
    console.error("Project realtime broadcast error:", error);
  }
}

function broadcastForbiddenToast(userId, payload = {}) {
  if (!userId) return;

  broadcastToastEvent(userId, {
    message: payload.message || "You do not have permission to perform this action.",
    toastType: "forbidden",
    projectId: payload.projectId || null,
    taskId: payload.taskId || null,
    userRole: payload.userRole || null,
    reason: payload.reason || null,
    actorId: userId,
  });
}

export async function createProject(req, res) {
  const projectName = (req.body?.project_name || req.body?.name || "").trim();
  const projectDescription = (req.body?.project_description || req.body?.description || "").trim();

  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!projectName) {
    return res.status(400).json({ message: "Project name is required" });
  }

  if (!projectDescription) {
    return res.status(400).json({ message: "Project description is required" });
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

    if (error?.code === "INVALID_PROJECT" || error?.code === "INVALID_NAME" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "23505") {
      return res.status(409).json({ message: error.detail || error.message || "Project already exists" });
    }

    if (error?.code === "23502") {
      return res.status(400).json({ message: error.detail || error.message || "Missing required project data" });
    }

    if (error?.code === "23503") {
      return res.status(400).json({ message: error.detail || error.message || "Invalid project reference" });
    }

    return res.status(500).json({ message: error.message || "Unable to create project" });
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

export async function getMemberProjects(req, res) {
    if (!req.user?.userId) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const projects = await getProjectsByMember(req.user.userId);
      return res.status(200).json({ projects });
    } catch (error) {
      console.error("Get member projects error:", error);
      return res.status(500).json({ message: "Unable to fetch member projects" });
    }
}

export async function getProjectMembers(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  try {
    const members = await getProjectMembersModel({
      projectId,
      requesterId: req.user.userId,
    });

    return res.status(200).json({ members });
  } catch (error) {
    if (error?.code === "INVALID_PROJECT") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Get project members error:", error);
    return res.status(500).json({ message: "Unable to fetch project members" });
  }
}

export async function inviteMemberToProject(req, res) {
  const projectId = (req.body?.project || req.body?.projectId || "").trim();
  const inviteeId = (req.body?.friend || req.body?.friendId || "").trim();
  
  const inviteeEmail = (req.body?.email || "").trim();

  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (inviteeId) {
    if(!projectId) {
      return res.status(400).json({ message: "A project is required."});
    }

    try {
      const inviteRequest = await inviteMemberToProjectModel({
        inviter_id: req.user.userId,
        invitee_id: inviteeId,
        project_id: projectId,
      });

      try {
        const inviter = await getUserSummary(req.user.userId);
        const project = await getProjectSummary(projectId);
        const inviteeUserId = inviteRequest?.recipient_id || inviteRequest?.recipientId || inviteeId;
        if (inviter && project && inviteeUserId) {
          await createNotification({
            type: "project_invitation",
            message: `${inviter.displayName} invited you to join ${project.name}.`,
            payload: {
              projectId,
              requestId: inviteRequest?.id || null,
              inviterId: inviter.id,
            },
            recipientUserId: inviteeUserId,
            url: "/main-page/projects",
          });
        }
      } catch (notifyError) {
        console.error("Project invite notification error:", notifyError);
      }

      return res.status(201).json({ message: "Invite sent", inviteRequest });
    } catch (error) {
        if (error?.code === "ALREADY_PENDING" || error?.code === "ALREADY_MEMBER") {
          return res.status(409).json({ message: error.message });
        }

        return res.status(500).json({ message: error.message || "Failed to send invite" });
      }
  }

  if (inviteeEmail) {
    if(!projectId) {
      return res.status(400).json({ message: "A project is required."});
    }

    try {
      const inviteRequest = await inviteMemberToProjectModel({
        inviter_id: req.user.userId,
        invitee_email: inviteeEmail,
        project_id: projectId,
      });

      try {
        const inviter = await getUserSummary(req.user.userId);
        const project = await getProjectSummary(projectId);
        const inviteeUserId = inviteRequest?.recipient_id || inviteRequest?.recipientId;
        if (inviter && project && inviteeUserId) {
          await createNotification({
            type: "project_invitation",
            message: `${inviter.displayName} invited you to join ${project.name}.`,
            payload: {
              projectId,
              requestId: inviteRequest?.id || null,
              inviterId: inviter.id,
            },
            recipientUserId: inviteeUserId,
            url: "/main-page/projects",
          });
        }
      } catch (notifyError) {
        console.error("Project invite notification error:", notifyError);
      }

      return res.status(201).json({ message: "Invite sent", inviteRequest });
    } catch (error) {
        if (error?.code === "ALREADY_PENDING" || error?.code === "ALREADY_MEMBER") {
          return res.status(409).json({ message: error.message });
        }
        return res.status(500).json({ message: error.message || "Failed to send invite" });
    }

  }
}

export async function getProjectInvitations(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const projectInvitations = await getProjectInvitationsModel(req.user.userId);
    return res.status(200).json({ projectInvitations });
  } catch (error) {
    console.error("Get project invitations error:", error);
    return res.status(500).json({ message: "Unable to fetch project invitations" });
  }
}

export async function acceptProjectInvitation(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!requestId) {
    return res.status(400).json({ message: "Request ID is required" });
  }

  try {
    const request = await acceptProjectInvitationModel({ requestId, userId });

    try {
      const recipient = await getUserSummary(userId);
      const project = await getProjectSummary(request?.project_id);
      if (recipient && project && request?.requester_id) {
        await createNotification({
          type: "project_invitation_accepted",
          message: `${recipient.displayName} accepted your invitation to ${project.name}.`,
          payload: {
            projectId: project.id,
            requestId,
            recipientId: userId,
          },
          recipientUserId: request.requester_id,
          url: "/main-page/projects",
        });
      }
    } catch (notifyError) {
      console.error("Project invite accepted notification error:", notifyError);
    }

    return res.status(200).json({ message: "Project invitation accepted", request });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Project invitation not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending invitations can be accepted." });
    }

    if (error?.code === "BOARD_NOT_FOUND") {
      return res.status(404).json({ message: "Project board not found." });
    }

    console.error("Accept project invitation error:", error);
    return res.status(500).json({ message: "Unable to accept project invitation" });
  }
}

export async function declineProjectInvitation(req, res) {
  const userId = req.user?.userId;
  const { requestId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!requestId) {
    return res.status(400).json({ message: "Request ID is required" });
  }

  try {
    const request = await declineProjectInvitationModel({ requestId, userId });
    return res.status(200).json({ message: "Project invitation declined", request });
  } catch (error) {
    if (error?.code === "REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Project invitation not found." });
    }

    if (error?.code === "INVALID_REQUEST_STATUS") {
      return res.status(409).json({ message: "Only pending invitations can be declined." });
    }

    console.error("Decline project invitation error:", error);
    return res.status(500).json({ message: "Unable to decline project invitation" });
  }
}

export async function getTaskCategories(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: "project id is required" });
  }

  try {
    const categories = await getTaskCategoriesModel(projectId);
    return res.status(200).json({ categories });
  } catch (error) {
    console.error("Get tasks categories error: ", error);
    return res.status(500).json({ message: error.message || "Unable to fetch tasks categories" });
  }
}

export async function getTaskById(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ message: "taskId parameter is required" });
  }

  try {
    const task = await getTaskByIdModel({ taskId, requesterId: req.user.userId });

    const isOwner = String(task.projectOwner || "") === String(req.user.userId);
    const canAccessProject = isOwner || !!task.requesterRole;

    if (!canAccessProject) {
      return res.status(403).json({ message: "Forbidden: you are not a member of this project" });
    }

    return res.status(200).json({ task });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Get task by id error:", error);
    return res.status(500).json({ message: "Unable to fetch task" });
  }
}

export async function getMyTasks(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const limit = Number(req.query?.limit || 50);
    const cursor = req.query?.cursor ? String(req.query.cursor) : null;
    const paged = await getMyTasksModel({ requesterId: req.user.userId, limit, cursor });
    const tasks = mapMyTasksRows(paged.rows || []);
    return res.status(200).json({
      tasks,
      hasMore: Boolean(paged.hasMore),
      nextCursor: paged.nextCursor || null,
    });
  } catch (error) {
    if (error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Get my tasks error:", error);
    return res.status(500).json({ message: "Unable to fetch my tasks" });
  }
}

export async function createTaskCategory(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const { projectId } = req.params;
  const name = (req.body?.name || "").trim();

  if (!projectId) {
    return res.status(400).json({ message: "projectId parameter is required" });
  }

  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  try {
    const ownerProjects = await getProjectsByOwner(req.user.userId);
    const isOwner = ownerProjects.some((p) => p.id === projectId);

    let isMember = false;

    if (!isOwner) {
      const memberProjects = await getProjectsByMember(req.user.userId);
      isMember = memberProjects.some((p) => p.id === projectId);
    }

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: "Forbidden: you are not a member of this project" });
    }

    // let isAdmin = false;

    // if (!isAdmin) {
    //   return res.status(403).json({ message: "Forbidden: you don't have permission to modify the board"});
    // }

    // Call model to create category (model should return the created row)
    const created = await createTaskCategoryModel({ projectId, name, requesterId: req.user.userId });
    return res.status(201).json({ category: created });
    console.log(projectId, name);
  } catch (error) {
    console.error("Create task category error:", error);
    return res.status(500).json({ message: error.message || "Unable to create task category" });
  }
}

export async function createNewTask(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const { projectId, categoryId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: "projectId parameter is required" });
  }

  if (!categoryId) {
    return res.status(400).json({ message: "categoryId parameter is required" });
  }

  const taskDescription = (req.body.taskDescription || req.body.description || "").trim();
  if (!taskDescription) {
    return res.status(400).json({ message: "Task description is required" });
  }

  const taskData = {
    projectId: req.body.projectId || projectId,
    categoryId: req.body.categoryId || categoryId,
    taskName: req.body.taskName || req.body.title,
    taskDescription,
    priority: req.body.priority,
    targetDate: req.body.targetDate ?? req.body.target_date ?? null,
    createdBy: req.user.userId,
  };

  try {
    const taskCreated = await createTaskModel(taskData);

    try {
      await broadcastProjectMembersEvent({
        projectId,
        requesterId: req.user.userId,
        payload: {
          eventType: "taskCreate",
          projectId,
          taskId: taskCreated?.id || null,
          task: taskCreated,
          userRole: req.user.role || null,
        },
      });
    } catch (broadcastError) {
      console.error("Task create realtime broadcast error:", broadcastError);
    }

    return res.status(201).json({ message: "Task created successfully", task: taskCreated });
  } catch (error) {
    if (
      error?.code === "INVALID_PROJECT" ||
      error?.code === "INVALID_CATEGORY" ||
      error?.code === "INVALID_TASK_TITLE" ||
      error?.code === "INVALID_USER" ||
      error?.code === "INVALID_TARGET_DATE"
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "BOARD_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "23514") {
      return res.status(400).json({ message: error.message || "Constraint validation failed while creating task" });
    }

    if (error?.code === "23503") {
      return res.status(400).json({ message: error.message || "Invalid relation reference while creating task" });
    }

    if (error?.code === "22P02") {
      return res.status(400).json({ message: error.message || "Invalid id format while creating task" });
    }

    console.error("Create new task error:", error);
    return res.status(500).json({ message: error?.message || "Unable to create task" });
  }
}

export async function takeProjectTask(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ message: "task id parameter is required" });
  }

  try {
    const taskTaken = await takeProjectTaskModel({ taskId: taskId, userId: req.user?.userId });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskAssigned",
            changeType: "take",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            assigneeId: req.user.userId,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task take realtime broadcast error:", broadcastError);
    }

    return res.status(201).json({ message: "Task taken successfully" });
  } catch (error) {
    console.error("Error taking task:", error);

    if (error?.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    if (error.message.includes("required")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Failed to take task", error: error.message });
  }
}

export async function updateTaskStatus(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  const { categoryId } = req.body || {};

  if (!taskId) {
    return res.status(400).json({ message: "taskId parameter is required" });
  }

  if (categoryId === undefined || categoryId === null) {
    return res.status(400).json({ message: "categoryId is required" });
  }

  try {
    const task = await updateTaskStatusModel({
      taskId,
      userId: req.user.userId,
      categoryId,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskUpdate",
            changeType: "status",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            task,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task status realtime broadcast error:", broadcastError);
    }

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      // Only send notification if assigning to someone other than the actor
      if (actor && taskContext && String(memberId) !== String(req.user.userId)) {
        const recipients = buildNotificationRecipients({
          creatorId: taskContext.creatorId,
          assigneeIds: taskContext.assigneeIds,
          actorId: req.user.userId,
        });

        const statusLabel = taskContext.categoryName || "Updated";
        await Promise.all(
          recipients.map((recipientId) => createNotification({
            type: "task_status_changed",
            message: `${actor.displayName} moved "${taskContext.taskTitle}" to ${statusLabel} in ${taskContext.projectName}.`,
            payload: {
              taskId: taskContext.taskId,
              projectId: taskContext.projectId,
              categoryId: taskContext.categoryId,
              categoryName: taskContext.categoryName,
            },
            recipientUserId: recipientId,
            url: buildTaskNotificationUrl(taskContext),
          }))
        );
      }
    } catch (notifyError) {
      console.error("Task status notification error:", notifyError);
    }

    return res.status(200).json({ message: "Task moved successfully", task });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_CATEGORY" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      broadcastForbiddenToast(req.user.userId, {
        message: error.message,
        taskId,
        userRole: req.user.role || null,
      });
      return res.status(403).json({ message: error.message });
    }

    console.error("Update task status error:", error);
    return res.status(500).json({ message: "Unable to move task" });
  }
}

export async function getTaskReviews(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { taskId } = req.params;
  if (!taskId) return res.status(400).json({ message: "taskId parameter is required" });

  try {
    const reviews = await getReviewsByTaskModel(taskId);
    return res.status(200).json({ reviews });
  } catch (error) {
    if (error?.code === "INVALID_TASK") return res.status(400).json({ message: error.message });
    console.error("Get task reviews error:", error);
    return res.status(500).json({ message: "Unable to fetch reviews" });
  }
}

function getReviewTextFromBody(body) {
  const payload = body || {};
  return payload.review ?? payload.reason ?? payload.comment ?? payload.note ?? payload.message;
}

export async function approveTaskReview(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });
  const { taskId } = req.params;
  const body = req.body || {};
  const reviewRaw = getReviewTextFromBody(body);
  if (!taskId) return res.status(400).json({ message: "taskId parameter is required" });

  // Require a review note for approval (same as rejection requires a reason)
  if (!reviewRaw || String(reviewRaw).trim() === "") {
    return res.status(400).json({ message: "Approval review note is required" });
  }

  try {
    const comment = String(reviewRaw).trim();
    const updated = await approveTaskReviewModel({
      taskId,
      reviewerId: req.user.userId,
      comment,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "approvalDecision",
            decision: "approved",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            reason: comment,
            task: updated,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Review approved realtime broadcast error:", broadcastError);
    }

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      if (actor && taskContext) {
        const recipients = buildNotificationRecipients({
          creatorId: taskContext.creatorId,
          assigneeIds: taskContext.assigneeIds,
          actorId: req.user.userId,
        });
        const note = truncateNotificationText(comment);
        await Promise.all(
          recipients.map((recipientId) => createNotification({
            type: "review_approved",
            message: `${actor.displayName} approved the review for "${taskContext.taskTitle}" in ${taskContext.projectName}${note ? `: "${note}"` : ""}.`,
            payload: {
              taskId: taskContext.taskId,
              projectId: taskContext.projectId,
              comment,
            },
            recipientUserId: recipientId,
            url: buildTaskNotificationUrl(taskContext),
          }))
        );
      }
    } catch (notifyError) {
      console.error("Review approved notification error:", notifyError);
    }

    return res.status(200).json({ message: "Task approved and moved to Done", task: updated });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_USER" || error?.code === "CATEGORY_NOT_FOUND") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      broadcastForbiddenToast(req.user.userId, {
        message: error.message,
        taskId,
        userRole: req.user.role || null,
      });
      return res.status(403).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") return res.status(404).json({ message: error.message });

    console.error("Approve task review error:", error);
    return res.status(500).json({ message: "Unable to approve review" });
  }
}

export async function rejectTaskReview(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });
  const { taskId } = req.params;
  const reviewRaw = getReviewTextFromBody(req.body || {});

  if (!taskId) return res.status(400).json({ message: "taskId parameter is required" });
  if (!reviewRaw || String(reviewRaw).trim() === "") return res.status(400).json({ message: "Rejection reason is required" });

  try {
    const updated = await rejectTaskReviewModel({ taskId, reviewerId: req.user.userId, comment: reviewRaw });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "approvalDecision",
            decision: "rejected",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            reason: reviewRaw,
            task: updated,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Review rejected realtime broadcast error:", broadcastError);
    }

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      if (actor && taskContext) {
        const recipients = buildNotificationRecipients({
          creatorId: taskContext.creatorId,
          assigneeIds: taskContext.assigneeIds,
          actorId: req.user.userId,
        });
        const note = truncateNotificationText(reviewRaw);
        await Promise.all(
          recipients.map((recipientId) => createNotification({
            type: "review_rejected",
            message: `${actor.displayName} rejected the review for "${taskContext.taskTitle}" in ${taskContext.projectName}${note ? `: "${note}"` : ""}.`,
            payload: {
              taskId: taskContext.taskId,
              projectId: taskContext.projectId,
              comment: reviewRaw,
            },
            recipientUserId: recipientId,
            url: buildTaskNotificationUrl(taskContext),
          }))
        );
      }
    } catch (notifyError) {
      console.error("Review rejected notification error:", notifyError);
    }

    return res.status(200).json({ message: "Task rejected and moved to TODO", task: updated });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_USER" || error?.code === "INVALID_COMMENT" || error?.code === "CATEGORY_NOT_FOUND") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      broadcastForbiddenToast(req.user.userId, {
        message: error.message,
        taskId,
        userRole: req.user.role || null,
      });
      return res.status(403).json({ message: error.message });
    }
    if (error?.code === "TASK_NOT_FOUND") return res.status(404).json({ message: error.message });

    console.error("Reject task review error:", error);
    return res.status(500).json({ message: "Unable to reject review" });
  }
}

export async function updateTaskPriority(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  const { priority } = req.body || {};

  if (!taskId) {
    return res.status(400).json({ message: "taskId parameter is required" });
  }

  if (priority === undefined || priority === null || String(priority).trim() === "") {
    return res.status(400).json({ message: "priority is required" });
  }

  try {
    const task = await updateTaskPriorityModel({ taskId, requesterId: req.user.userId, priority });
    return res.status(200).json({ message: "Task priority updated successfully", task });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_PRIORITY") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Update task priority error:", error);
    return res.status(500).json({ message: "Unable to update task priority" });
  }
}

export async function updateTaskTargetDate(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  const { targetDate } = req.body || {};

  if (!taskId) {
    return res.status(400).json({ message: "taskId parameter is required" });
  }

  if (targetDate !== null && targetDate !== undefined) {
    const parsed = new Date(targetDate);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ message: "targetDate must be a valid date" });
    }
  }

  try {
    const task = await updateTaskTargetDateModel({ taskId, requesterId: req.user.userId, targetDate: targetDate ?? null });
    return res.status(200).json({ message: "Target date updated successfully", task });
  } catch (error) {
    if (error?.code === "INVALID_TASK") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Update target date error:", error);
    return res.status(500).json({ message: "Unable to update target date" });
  }
}

export async function updateTaskName(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  const { name } = req.body || {};

  if (!taskId) {
    return res.status(400).json({ message: "taskId parameter is required" });
  }

  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const task = await updateTaskNameModel({
      taskId,
      requesterId: req.user.userId,
      name: trimmed,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskUpdate",
            changeType: "rename",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            task,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task name realtime broadcast error:", broadcastError);
    }

    return res.status(200).json({ message: "Task name updated successfully", task });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_NAME" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      broadcastForbiddenToast(req.user.userId, {
        message: error.message,
        taskId,
        userRole: req.user.role || null,
      });
      return res.status(403).json({ message: error.message });
    }

    console.error("Update task name error:", error);
    return res.status(500).json({ message: "Unable to update task name" });
  }
}

export async function updateTaskDescription(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  const { description } = req.body || {};

  if (!taskId) {
    return res.status(400).json({ message: "taskId parameter is required" });
  }

  const trimmed = String(description || "").trim();
  if (!trimmed) {
    return res.status(400).json({ message: "description is required" });
  }

  try {
    const task = await updateTaskDescriptionModel({
      taskId,
      requesterId: req.user.userId,
      description: trimmed,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskUpdate",
            changeType: "description",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            task,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task description realtime broadcast error:", broadcastError);
    }

    return res.status(200).json({ message: "Task description updated successfully", task });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_DESCRIPTION" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      broadcastForbiddenToast(req.user.userId, {
        message: error.message,
        taskId,
        userRole: req.user.role || null,
      });
      return res.status(403).json({ message: error.message });
    }

    console.error("Update task description error:", error);
    return res.status(500).json({ message: "Unable to update task description" });
  }
}

export async function updateProjectSettings(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId, setting, value } = req.body || {};

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  if (!setting) {
    return res.status(400).json({ message: "setting is required" });
  }

  if (typeof value !== "boolean") {
    return res.status(400).json({ message: "No valid settings provided" });
  }

  try {
    const updated = await updateProjectSettingsModel({
      projectId,
      requesterId: req.user.userId,
      setting,
      value,
    });

    await broadcastProjectMembersEvent({
      projectId,
      requesterId: req.user.userId,
      payload: {
        eventType: "permissionUpdate",
        projectId,
        setting,
        value,
        settings: updated,
        userRole: req.user.role || null,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    if (error?.code === "PROJECT_FORBIDDEN") {
      broadcastForbiddenToast(req.user.userId, {
        message: error.message,
        projectId,
        userRole: req.user.role || null,
      });
      return res.status(403).json({ message: error.message });
    }
    if (error?.code === "INVALID_PROJECT") return res.status(400).json({ message: error.message });
    if (error?.code === "INVALID_SETTINGS") return res.status(400).json({ message: error.message });
    console.error("Update project settings error:", error);
    return res.status(500).json({ message: error?.message || "Unable to update project settings" });
  }
}

export async function updateProjectName(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId } = req.params;
  const { name } = req.body || {};

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const project = await updateProjectNameModel({
      projectId,
      requesterId: req.user.userId,
      name: trimmed,
    });
    return res.status(200).json({ message: "Project name updated successfully", project });
  } catch (error) {
    if (error?.code === "INVALID_PROJECT" || error?.code === "INVALID_NAME" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Update project name error:", error);
    return res.status(500).json({ message: "Unable to update project name" });
  }
}

export async function updateProjectDescription(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId } = req.params;
  const { description } = req.body || {};

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  const trimmed = String(description || "").trim();
  if (!trimmed) {
    return res.status(400).json({ message: "description is required" });
  }

  try {
    const project = await updateProjectDescriptionModel({
      projectId,
      requesterId: req.user.userId,
      description: trimmed,
    });
    return res.status(200).json({ message: "Project description updated successfully", project });
  } catch (error) {
    if (error?.code === "INVALID_PROJECT" || error?.code === "INVALID_DESCRIPTION" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Update project description error:", error);
    return res.status(500).json({ message: "Unable to update project description" });
  }
}

export async function getProjectSettings(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId } = req.params;
  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  try {
    const settings = await getProjectSettingsModel({
      projectId,
      requesterId: req.user.userId,
    });

    return res.status(200).json(settings);
  } catch (error) {
    if (error?.code === "PROJECT_FORBIDDEN") return res.status(403).json({ message: error.message });
    if (error?.code === "INVALID_PROJECT") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Unable to fetch project settings" });
  }
}

export async function assignTaskToOthers(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { memberId, taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  if (!memberId) {
    return res.status(400).json({ message: "Member ID is required" });
  }

  try {
    const access = await getTaskPermissionContext({ taskId: Number(taskId), requesterId: req.user.userId });
    const isSelfAssignment = String(memberId) === String(req.user.userId);
    const canSelfTake = access.isOwner || access.isAdmin || access.settings.allow_member_take_task;
    const canAssignOthers = access.isOwner || access.isAdmin || access.isManager || (access.settings.allow_member_take_task && access.settings.allow_assign_task_to_member);

    if (isSelfAssignment && !canSelfTake) {
      return res.status(403).json({ message: "Forbidden: self-assigning tasks is disabled for your role in this project" });
    }

    if (!isSelfAssignment && !canAssignOthers) {
      return res.status(403).json({ message: "Forbidden: assigning members to tasks is disabled for your role in this project" });
    }

    const assignedMember = await assignTaskToOthersModel({
      taskId,
      memberId,
      requesterId: req.user.userId,
    });

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      if (actor && taskContext) {
        await createNotification({
          type: "task_assigned",
          message: `${actor.displayName} assigned you to "${taskContext.taskTitle}" in ${taskContext.projectName}.`,
          payload: {
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            assigneeId: memberId,
          },
          recipientUserId: memberId,
          url: buildTaskNotificationUrl(taskContext),
        });
      }
    } catch (notifyError) {
      console.error("Task assign notification error:", notifyError);
    }

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskAssignmentChange",
            changeType: "assign",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            memberId,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task assignment realtime broadcast error:", broadcastError);
    }

    return res.status(201).json({
      message: "Member assigned to task successfully",
      assignment: assignedMember,
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Member is already assigned to this task" });
    }

    return res.status(500).json({ message: 'Unable to add member to this task' });
  }

}

export async function createSubtask(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  const { title, createdBy, status } = req.body.subtaskData;
  if (!title || !createdBy || !status) {
    return res.status(400).json({ message: "Missing required subtask fields" });
  }

  try {
    // Call your model/service layer to insert into DB
    const newSubtask = await createSubtaskModel({
      taskId,
      title,
      createdBy,
      status,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "subtaskCreate",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            subtaskId: newSubtask?.id || null,
            subtask: newSubtask,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Subtask create realtime broadcast error:", broadcastError);
    }

    return res.status(201).json(newSubtask);
  } catch (err) {
    console.error("Error creating subtask:", err);
    return res.status(500).json({ message: "Failed to create subtask" });
  }
}

export async function getTaskComments(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  try {
    const comments = await getTaskCommentsModel(taskId);
    return res.status(200).json({ comments });
  } catch (error) {
    if (error?.code === "INVALID_TASK") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Get task comments error:", error);
    return res.status(500).json({ message: "Unable to fetch task comments" });
  }
}

export async function createTaskComment(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId, userId } = req.params;
  const comment = (req.body?.comment || "").trim();

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!comment) {
    return res.status(400).json({ message: "Comment is required" });
  }

  try {
    const createdComment = await createTaskCommentModel({
      taskId,
      userId,
      comment,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "commentUpdate",
            changeType: "comment",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            commentId: createdComment?.id || null,
            comment,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task comment realtime broadcast error:", broadcastError);
    }

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      // Only send notification if unassigning from someone other than the actor
      if (actor && taskContext && String(memberId) !== String(req.user.userId)) {
        const recipients = buildNotificationRecipients({
          creatorId: taskContext.creatorId,
          assigneeIds: taskContext.assigneeIds,
          actorId: req.user.userId,
        });
        const note = truncateNotificationText(comment);
        await Promise.all(
          recipients.map((recipientId) => createNotification({
            type: "task_comment",
            message: `${actor.displayName} commented on "${taskContext.taskTitle}" in ${taskContext.projectName}${note ? `: "${note}"` : ""}.`,
            payload: {
              taskId: taskContext.taskId,
              projectId: taskContext.projectId,
              commentId: createdComment?.id || null,
              comment,
            },
            recipientUserId: recipientId,
            url: buildTaskNotificationUrl(taskContext),
          }))
        );
      }
    } catch (notifyError) {
      console.error("Task comment notification error:", notifyError);
    }

    return res.status(201).json({
      message: "Comment added successfully",
      comment: createdComment,
    });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_USER" || error?.code === "INVALID_COMMENT") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "23503") {
      return res.status(400).json({ message: error.message || "Invalid reference while adding comment" });
    }

    if (error?.code === "22P02") {
      return res.status(400).json({ message: error.message || "Invalid id format while adding comment" });
    }

    console.error("Create task comment error:", error);
    return res.status(500).json({ message: "Unable to add comment" });
  }
}

export async function createTaskCommentReply(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId, commentId, userId } = req.params;
  const commentReply = (req.body?.comment_reply || req.body?.commentReply || "").trim();

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  if (!commentId) {
    return res.status(400).json({ message: "Comment ID is required" });
  }

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!commentReply) {
    return res.status(400).json({ message: "Comment reply is required" });
  }

  try {
    const createdReply = await createTaskCommentReplyModel({
      taskId,
      commentId,
      userId,
      commentReply,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "commentUpdate",
            changeType: "reply",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            commentId,
            replyId: createdReply?.id || null,
            reply: commentReply,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task comment reply realtime broadcast error:", broadcastError);
    }

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      if (actor && taskContext) {
        const recipients = buildNotificationRecipients({
          creatorId: taskContext.creatorId,
          assigneeIds: taskContext.assigneeIds,
          actorId: req.user.userId,
        });
        const note = truncateNotificationText(commentReply);
        await Promise.all(
          recipients.map((recipientId) => createNotification({
            type: "task_comment_reply",
            message: `${actor.displayName} replied on "${taskContext.taskTitle}" in ${taskContext.projectName}${note ? `: "${note}"` : ""}.`,
            payload: {
              taskId: taskContext.taskId,
              projectId: taskContext.projectId,
              commentId,
              reply: commentReply,
            },
            recipientUserId: recipientId,
            url: buildTaskNotificationUrl(taskContext),
          }))
        );
      }
    } catch (notifyError) {
      console.error("Task comment reply notification error:", notifyError);
    }

    return res.status(201).json({
      message: "Reply added successfully",
      reply: createdReply,
    });
  } catch (error) {
    if (
      error?.code === "INVALID_TASK" ||
      error?.code === "INVALID_USER" ||
      error?.code === "INVALID_COMMENT" ||
      error?.code === "INVALID_COMMENT_REPLY"
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "23503") {
      return res.status(400).json({ message: error.message || "Invalid reference while adding reply" });
    }

    if (error?.code === "22P02") {
      return res.status(400).json({ message: error.message || "Invalid id format while adding reply" });
    }

    console.error("Create task comment reply error:", error);
    return res.status(500).json({ message: "Unable to add reply" });
  }
}

export async function getProjectTags(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { projectId } = req.params;
  if (!projectId) return res.status(400).json({ message: "Project ID is required" });

  try {
    // ensure requester is a member of the project
    await getProjectMembersModel({ projectId, requesterId: req.user.userId });

    const tags = await getProjectTagsModel(projectId);
    return res.status(200).json({ tags });
  } catch (error) {
    if (error?.code === "PROJECT_FORBIDDEN") return res.status(403).json({ message: error.message });
    if (error?.code === "INVALID_PROJECT") return res.status(400).json({ message: error.message });
    console.error("Get project tags error:", error);
    return res.status(500).json({ message: error?.message || "Unable to fetch project tags" });
  }
}

export async function getTaskTags(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { taskId } = req.params;
  if (!taskId) return res.status(400).json({ message: "Task ID is required" });

  try {
    const tags = await getTaskTagsModel(taskId);
    return res.status(200).json({ tags });
  } catch (error) {
    if (error?.code === "INVALID_TASK") return res.status(400).json({ message: error.message });
    console.error("Get task tags error:", error);
    return res.status(500).json({ message: error?.message || "Unable to fetch task tags" });
  }
}

export async function createTaskTag(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { taskId } = req.params;
  const tagName = (req.body?.tagName || req.body?.tag_name || "").trim();
  const projectId = (req.body?.projectId || req.body?.project_id || "").trim();

  if (!taskId) return res.status(400).json({ message: "Task ID is required" });
  if (!tagName) return res.status(400).json({ message: "tagName is required" });
  if (!projectId) return res.status(400).json({ message: "projectId is required" });

  try {
    const created = await createTaskTagModel({ taskId, tagName, projectId, requesterId: req.user.userId });
    return res.status(201).json({ tag: created });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_PROJECT" || error?.code === "INVALID_TAG") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") return res.status(403).json({ message: error.message });

    if (error?.code === "TAG_EXISTS") return res.status(409).json({ message: error.message });
    if (error?.code === "MAX_TAGS") return res.status(400).json({ message: error.message });

    if (error?.code === "23503") return res.status(400).json({ message: error.message || "Invalid reference while creating tag" });
    if (error?.code === "22P02") return res.status(400).json({ message: error.message || "Invalid id format while creating tag" });

    console.error("Create task tag error:", error);
    return res.status(500).json({ message: error?.message || "Unable to create task tag" });
  }
}

export async function deleteTaskTag(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { taskId, tagId } = req.params;
  if (!taskId) return res.status(400).json({ message: "Task ID is required" });
  if (!tagId) return res.status(400).json({ message: "Tag ID is required" });

  try {
    const deleted = await deleteTaskTagModel({ tagId, requesterId: req.user.userId });
    if (String(deleted.taskId) !== String(taskId)) {
      return res.status(400).json({ message: "Tag does not belong to the specified task" });
    }

    return res.status(200).json({ tag: deleted });
  } catch (error) {
    if (error?.code === "INVALID_TAG" || error?.code === "TAG_NOT_FOUND") return res.status(404).json({ message: error.message });
    if (error?.code === "TASK_FORBIDDEN") return res.status(403).json({ message: error.message });
    console.error("Delete task tag error:", error);
    return res.status(500).json({ message: error?.message || "Unable to delete tag" });
  }
}

export async function deleteTask(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { taskId } = req.params;
  if (!taskId) return res.status(400).json({ message: "Task ID is required" });

  try {
    const deleted = await deleteTaskModel({ taskId, requesterId: req.user.userId });
    return res.status(200).json({ message: "Task removed successfully", task: deleted });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    console.error("Delete task error:", error);
    return res.status(500).json({ message: error?.message || "Unable to delete task" });
  }
}

export async function updateSubtask(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId, subtaskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  if (!subtaskId) {
    return res.status(400).json({ message: "Subtask ID is required" });
  }

  return res.status(501).json({ message: "Subtasks not implemented yet" });
}

export async function deleteSubtask(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId, subtaskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  if (!subtaskId) {
    return res.status(400).json({ message: "Subtask ID is required" });
  }

  try {
    const deletedSubtask = await deleteSubtaskModel({
      taskId: Number(taskId),
      subtaskId: Number(subtaskId),
    });

    return res.status(200).json(deletedSubtask);
  } catch (err) {
    console.error("Error deleting subtask:", err);
    if (err?.code === "SUBTASK_NOT_FOUND") {
      return res.status(404).json({ message: "Subtask not found" });
    }
    return res.status(500).json({ message: "Failed to delete subtask" });
  }
}

export async function unassignTaskFromMember(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { memberId, taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  if (!memberId) {
    return res.status(400).json({ message: "Member ID is required" });
  }

  try {
    // permission check: only owners/admins/managers may unassign other members
    const access = await getTaskPermissionContext({ taskId: Number(taskId), requesterId: req.user.userId });
    if (!access.isOwner && !access.isAdmin && !access.isManager) {
      return res.status(403).json({ message: "Forbidden: you do not have permission to unassign other members from this task" });
    }

    const unassignedMember = await unassignTaskFromMemberModel({
      taskId,
      memberId,
      requesterId: req.user.userId,
    });

    try {
      const actor = await getUserSummary(req.user.userId);
      const taskContext = await getTaskContext(taskId);
      if (actor && taskContext) {
        await createNotification({
          type: "task_unassigned",
          message: `${actor.displayName} unassigned you from "${taskContext.taskTitle}" in ${taskContext.projectName}.`,
          payload: {
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            assigneeId: memberId,
          },
          recipientUserId: memberId,
          url: buildTaskNotificationUrl(taskContext),
        });
      }
    } catch (notifyError) {
      console.error("Task unassign notification error:", notifyError);
    }

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskAssignmentChange",
            changeType: "unassign",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            memberId,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task unassignment realtime broadcast error:", broadcastError);
    }

    return res.status(200).json({
      message: "Member unassigned from task successfully",
      assignment: unassignedMember,
    });
  } catch (error) {
    if (error?.code === "TASK_NOT_ASSIGNED") {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to unassign member from task" });
  }
}

export async function unassignTaskFromSelf(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { taskId } = req.params;
  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  try {
    const unassigned = await unassignTaskFromSelfModel({
      taskId,
      userId: req.user.userId,
    });

    try {
      const taskContext = await getTaskContext(taskId);
      if (taskContext?.projectId) {
        await broadcastProjectMembersEvent({
          projectId: taskContext.projectId,
          requesterId: req.user.userId,
          payload: {
            eventType: "taskAssignmentChange",
            changeType: "unassign",
            taskId: taskContext.taskId,
            projectId: taskContext.projectId,
            userId: req.user.userId,
            userRole: req.user.role || null,
          },
        });
      }
    } catch (broadcastError) {
      console.error("Task self-unassignment realtime broadcast error:", broadcastError);
    }

    return res.status(200).json({
      message: "Task unassigned successfully",
      assignment: unassigned,
    });
  } catch (error) {
    if (error?.code === "TASK_NOT_ASSIGNED") {
      return res.status(409).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to unassign task" });
  }
}

export async function deleteProject(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  try {
    console.log(`[deleteProject] Starting deletion for projectId=${projectId}, userId=${req.user.userId}`);
    const result = await deleteProjectModel({
      projectId,
      requesterId: req.user.userId,
    });

    console.log(`[deleteProject] Successfully deleted project: ${projectId}`);
    return res.status(200).json({ message: "Project deleted successfully", projectId: result.id });
  } catch (error) {
    console.error(`[deleteProject] Error details:`, {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      full: error
    });

    if (error?.code === "INVALID_PROJECT") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "PROJECT_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    if (error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    console.error("Delete project error:", error);
    return res.status(500).json({ message: "Unable to delete project" });
  }
}

export async function removeMemberFromProject(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId, memberId } = req.params;

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  if (!memberId) {
    return res.status(400).json({ message: "Member ID is required" });
  }

  try {
    const result = await removeMemberFromProjectModel({
      projectId,
      memberId,
      requesterId: req.user.userId,
    });

    return res.status(200).json({ message: "Member removed successfully", ...result });
  } catch (error) {
    if (error?.code === "INVALID_PROJECT" || error?.code === "INVALID_MEMBER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN" || error?.code === "CANNOT_REMOVE_OWNER" || error?.code === "CANNOT_REMOVE_SELF") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Remove member error:", error);
    return res.status(500).json({ message: "Unable to remove member" });
  }
}

export async function updateMemberRole(req, res) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { projectId, memberId } = req.params;
  const { role } = req.body || {};

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is required" });
  }

  if (!memberId) {
    return res.status(400).json({ message: "Member ID is required" });
  }

  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  try {
    const result = await updateMemberRoleModel({
      projectId,
      memberId,
      newRole: role,
      requesterId: req.user.userId,
    });

    try {
      await broadcastProjectMembersEvent({
        projectId,
        requesterId: req.user.userId,
        payload: {
          eventType: "memberRoleUpdate",
          projectId,
          memberId,
          newRole: role,
          userRole: req.user.role || null,
        },
      });
    } catch (broadcastError) {
      console.error("Member role update realtime broadcast error:", broadcastError);
    }

    return res.status(200).json({ message: "Member role updated successfully", ...result });
  } catch (error) {
    if (error?.code === "INVALID_PROJECT" || error?.code === "INVALID_MEMBER" || error?.code === "INVALID_ROLE") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "MEMBER_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "PROJECT_FORBIDDEN" || error?.code === "CANNOT_CHANGE_OWNER") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Update member role error:", error);
    return res.status(500).json({ message: "Unable to update member role" });
  }
}
