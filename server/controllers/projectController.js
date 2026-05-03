import { createProject as createProjectModel,
         getProjectsByOwner,
         getProjectsByMember,
         getProjectMembers as getProjectMembersModel,
         inviteMemberToProject as inviteMemberToProjectModel,
         getProjectInvitations as getProjectInvitationsModel,
         acceptProjectInvitation as acceptProjectInvitationModel,
         declineProjectInvitation as declineProjectInvitationModel,
         getTaskCategories as getTaskCategoriesModel,
         createTaskCategory as createTaskCategoryModel,
         createTask as createTaskModel,
         getProjectSettings as getProjectSettingsModel,
         updateProjectSettings as updateProjectSettingsModel,
         takeProjectTask as takeProjectTaskModel,
         updateTaskStatus as updateTaskStatusModel,
         assignTaskToOthers as assignTaskToOthersModel,
         unassignTaskFromMember as unassignTaskFromMemberModel,
         unassignTaskFromSelf as unassignTaskFromSelfModel,
         createSubtask as createSubtaskModel,
         createTaskComment as createTaskCommentModel,
         createTaskCommentReply as createTaskCommentReplyModel,
         getTaskComments as getTaskCommentsModel,
         getProjectTags as getProjectTagsModel,
         getTaskTags as getTaskTagsModel,
         createTaskTag as createTaskTagModel,
         deleteTaskTag as deleteTaskTagModel,
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
    const created = await createTaskCategoryModel({ projectId, name });
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

  // console.log("Project ID: ", projectId);  
  // console.log("Category ID: ",categoryId); 

  						// ...payload,
							// projectId: project?.id,
							// categoryId: payload.categoryId || selectedCategoryId,
							// taskName: payload.title,
							// taskDescription: payload.description,

  const taskData = {
    projectId: req.body.projectId || projectId,
    categoryId: req.body.categoryId || categoryId,
    taskName: req.body.taskName || req.body.title,
    taskDescription: req.body.taskDescription || req.body.description,
    priority: req.body.priority,
    createdBy: req.user.userId,
  };

  try {
    const taskCreated = await createTaskModel(taskData);
    return res.status(201).json({ message: "Task created successfully", task: taskCreated });
  } catch (error) {
    if (
      error?.code === "INVALID_PROJECT" ||
      error?.code === "INVALID_CATEGORY" ||
      error?.code === "INVALID_TASK_TITLE" ||
      error?.code === "INVALID_USER"
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
    const taskTaken = await takeProjectTaskModel({taskId: taskId, userId: req.user?.userId} );
    return res.status(201).json({ message: "Task taken successfully" });
  } catch (error) {
    console.error("Error taking task:", error);

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

    return res.status(200).json({ message: "Task moved successfully", task });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_CATEGORY" || error?.code === "INVALID_USER") {
      return res.status(400).json({ message: error.message });
    }

    if (error?.code === "TASK_NOT_FOUND") {
      return res.status(404).json({ message: error.message });
    }

    if (error?.code === "TASK_FORBIDDEN") {
      return res.status(403).json({ message: error.message });
    }

    console.error("Update task status error:", error);
    return res.status(500).json({ message: "Unable to move task" });
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

    return res.status(200).json(updated);
  } catch (error) {
    if (error?.code === "PROJECT_FORBIDDEN") return res.status(403).json({ message: error.message });
    if (error?.code === "INVALID_PROJECT") return res.status(400).json({ message: error.message });
    if (error?.code === "INVALID_SETTINGS") return res.status(400).json({ message: error.message });
    return res.status(500).json({ message: "Unable to update project settings" });
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
    const assignedMember = await assignTaskToOthersModel({
      taskId, 
      memberId,
    });

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
    const created = await createTaskTagModel({ taskId, tagName, projectId });
    return res.status(201).json({ tag: created });
  } catch (error) {
    if (error?.code === "INVALID_TASK" || error?.code === "INVALID_PROJECT" || error?.code === "INVALID_TAG") {
      return res.status(400).json({ message: error.message });
    }

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
    const deleted = await deleteTaskTagModel(tagId);
    if (String(deleted.taskId) !== String(taskId)) {
      return res.status(400).json({ message: "Tag does not belong to the specified task" });
    }

    return res.status(200).json({ tag: deleted });
  } catch (error) {
    if (error?.code === "INVALID_TAG" || error?.code === "TAG_NOT_FOUND") return res.status(404).json({ message: error.message });
    console.error("Delete task tag error:", error);
    return res.status(500).json({ message: error?.message || "Unable to delete tag" });
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

  return res.status(501).json({ message: "Subtasks not implemented yet" });
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
    const unassignedMember = await unassignTaskFromMemberModel({
      taskId,
      memberId,
    });

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
