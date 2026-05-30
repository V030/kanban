import { fetchWithAuth } from "./authService";
import { transformErrorMessage } from "../utils/errorTransformer";

const API_URL = "http://localhost:5000";

export async function createProject(projectData) {
  const trimmedDescription = String(projectData?.description || "").trim();
  if (!trimmedDescription) throw new Error("Please enter a project description.");

  return fetchWithAuth(`${API_URL}/auth/create-project`, {
    method: "POST",
    body: JSON.stringify({
      ...projectData,
      description: trimmedDescription,
    }),
  });
}

export async function getProjects() {
  return fetchWithAuth(`${API_URL}/auth/projects/my-projects`, {
    method: "GET",
  });
}

export async function getMemberProjects() {
  return fetchWithAuth(`${API_URL}/auth/projects/other-projects`, {
    method: "GET",
  });
}

export async function getProjectMembers(projectId) {
  if (!projectId) throw new Error("Unable to load team members. Please select a project.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/members`, {
    method: "GET",
  });
}

export async function inviteMemberToProject(inviteData) {
  return fetchWithAuth(`${API_URL}/auth/projects/send-invite`, {
    method: "POST",
    body: JSON.stringify(inviteData),
  });
}

export async function getProjectInvitations() {
  return fetchWithAuth(`${API_URL}/auth/projects/get-invites`, {
    method: "GET",
  });
}

export async function acceptProjectInvitation(requestId) {
  return fetchWithAuth(`${API_URL}/auth/projects/invitations/${requestId}/accept`, {
    method: "PATCH",
  });
}

export async function declineProjectInvitation(requestId) {
  return fetchWithAuth(`${API_URL}/auth/projects/invitations/${requestId}/decline`, {
    method: "PATCH",
  });
}

export async function getTaskCategories(projectId) {
  if (!projectId) throw new Error('Unable to load task categories. Please select a project.');
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/get-task-categories`, {
    method: 'GET',
    cache: 'no-cache',
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function getTaskById(taskId) {
  if (!taskId) throw new Error("Unable to load task details. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}`, {
    method: "GET",
    cache: "no-cache",
    headers: { "Cache-Control": "no-store" },
  });
}

export async function getProjectTasks(projectId) {
  if (!projectId) throw new Error("Unable to load tasks. Please select a project.");
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/tasks`, {
    method: "GET",
  });
}

export async function getMyTasks(limit = 50, offset = 0, cursor = null, signal = undefined) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) {
    params.set("cursor", String(cursor));
  } else {
    params.set("offset", String(offset || 0));
  }

  return fetchWithAuth(`${API_URL}/auth/tasks/my-tasks?${params.toString()}`, {
    method: "GET",
    cache: "no-cache",
    signal,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function createNewTaskCategory(project) {
  const projectId = project?.projectId;

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/create-task-category`, {
    method: 'POST',
    body: JSON.stringify(project || {}),
  });
}

export async function createNewTask(taskContent) {
  const projectId = taskContent?.projectId;
  const categoryId = taskContent?.categoryId;
  const trimmedDescription = String(taskContent?.description || taskContent?.taskDescription || "").trim();
  if (!trimmedDescription) throw new Error("Please enter a task description.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/${categoryId}/create-new-task`, {
    method: 'POST',
    body: JSON.stringify({
      ...taskContent,
      description: trimmedDescription,
      taskDescription: trimmedDescription,
    }),
  });
}

export async function getProjectSettings(projectId) {
  if (!projectId) throw new Error("projectId is required");
  return fetchWithAuth(`${API_URL}/auth/project-settings/${projectId}`, {
    method: "GET",
  });
}

export async function updateProjectSettings(projectId, setting, value) {
  if (!projectId) throw new Error("Unable to update settings. Please select a project.");
  if (!setting) throw new Error("Unable to update settings. Please select a setting.");

  return fetchWithAuth(`${API_URL}/auth/project-settings`, {
    method: "PATCH",
    body: JSON.stringify({
      projectId,
      setting,
      value,
    }),
  });
}

export async function updateProjectName(projectId, name) {
  if (!projectId) throw new Error("Unable to update project name. Please select a project.");
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Please enter a project name.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name: trimmed }),
  });
}

export async function updateProjectDescription(projectId, description) {
  if (!projectId) throw new Error("Unable to update project description. Please select a project.");
  const trimmed = String(description || "").trim();
  if (!trimmed) throw new Error("Please enter a project description.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/description`, {
    method: "PATCH",
    body: JSON.stringify({ description: trimmed }),
  });
}

export async function takeTask(taskId) {
  if (!taskId) throw new Error("Unable to assign task. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/project/take-task/${taskId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function updateTaskStatus(taskId, columnStatus) {
  if (!taskId) throw new Error("Unable to move task. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ categoryId: columnStatus }),
  });
}

export async function updateTaskPriority(taskId, priority) {
  if (!taskId) throw new Error("Unable to update priority. Please select a task.");
  if (!priority) throw new Error("Please select a priority level.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });
}

export async function updateTaskName(taskId, name) {
  if (!taskId) throw new Error("Unable to update task name. Please select a task.");
  const trimmed = String(name || "").trim();
  if (!trimmed) throw new Error("Please enter a task name.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/name`, {
    method: "PATCH",
    body: JSON.stringify({ name: trimmed }),
  });
}

export async function updateTaskDescription(taskId, description) {
  if (!taskId) throw new Error("Unable to update task description. Please select a task.");
  const trimmed = String(description || "").trim();
  if (!trimmed) throw new Error("Please enter a task description.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/description`, {
    method: "PATCH",
    body: JSON.stringify({ description: trimmed }),
  });
}

export async function updateTaskTargetDate(taskId, targetDate) {
  if (!taskId) throw new Error("Unable to update due date. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/target-date`, {
    method: "PATCH",
    body: JSON.stringify({ targetDate: targetDate ?? null }),
  });
}

export async function assignTaskToOthers(taskId, memberId) {
  if (!taskId) throw new Error("Unable to assign task. Please select a task.");
  if (!memberId) throw new Error("Please select a team member.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/assign-task/${memberId}/${taskId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function unassignTaskFromMember(taskId, memberId) {
  if (!taskId) throw new Error("Unable to unassign task. Please select a task.");
  if (!memberId) throw new Error("Please select a team member.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/assign-task/${memberId}/${taskId}`, {
    method: "DELETE",
  });
}

export async function unassignTask(taskId) {
  if (!taskId) throw new Error("Unable to unassign task. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/unassign-task/${taskId}`, {
    method: "DELETE",
  });
}

export async function deleteTask(taskId) {
  if (!taskId) throw new Error("Unable to delete task. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function createSubtask(subtaskData) {
  if (!subtaskData) throw new Error("Unable to create subtask. Please provide subtask details.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${subtaskData.taskId}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({subtaskData}),
  });
}


export async function updateSubtask(taskId, subtaskId, payload) {
  if (!taskId) throw new Error("Unable to update subtask. Please select a task.");
  if (!subtaskId) throw new Error("Please select a subtask.");

  console.log("[updateSubtask service] sending PATCH", {
    url: `${API_URL}/auth/project/tasks/${taskId}/subtasks/${subtaskId}`,
    payload,
    payloadJSON: JSON.stringify(payload || {}),
  });

  const result = await fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });

  console.log("[updateSubtask service] fetchWithAuth returned", {
    type: typeof result,
    isResponse: result instanceof Response,
    status: result?.status,
    ok: result?.ok,
    value: result,
  });

  return result;
}

export async function deleteSubtask(taskId, subtaskId) {
  if (!taskId) throw new Error("Unable to delete subtask. Please select a task.");
  if (!subtaskId) throw new Error("Please select a subtask.");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "DELETE",
  });
}

export async function getTaskComments(taskId) {
  if (!taskId) throw new Error("Unable to load comments. Please select a task.");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/comments`, {
    method: "GET",
  });
}

export async function createTaskComment(taskId, userId, comment) {
  if (!taskId) throw new Error("Unable to add comment. Please select a task.");
  if (!userId) throw new Error("Unable to add comment. Please log in again.");
  if (!comment) throw new Error("Please enter a comment.");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/comments/${userId}`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export async function createTaskCommentReply(taskId, commentId, userId, commentReply) {
  if (!taskId) throw new Error("Unable to add reply. Please select a task.");
  if (!commentId) throw new Error("Unable to add reply. Please select a comment.");
  if (!userId) throw new Error("Unable to add reply. Please log in again.");
  if (!commentReply) throw new Error("Please enter a reply.");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/comments/${commentId}/${userId}`, {
    method: "POST",
    body: JSON.stringify({ comment_reply: commentReply }),
  });
}

export async function getProjectTags(projectId) {
  if (!projectId) throw new Error("Unable to load tags. Please select a project.");
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/tags`, { method: "GET" });
}

export async function getProjectMetrics(projectId, days = 30) {
  if (!projectId) throw new Error("Unable to load metrics. Please select a project.");
  const safeDays = Number.isFinite(Number(days)) ? Number(days) : 30;
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/metrics?days=${safeDays}`, {
    method: "GET",
    cache: "no-cache",
    headers: { "Cache-Control": "no-store" },
  });
}

export async function getTaskTags(taskId) {
  if (!taskId) throw new Error("Unable to load tags. Please select a task.");
  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/tags`, { method: "GET" });
}

export async function createTaskTag(taskId, projectId, tagName) {
  if (!taskId) throw new Error("Unable to create tag. Please select a task.");
  if (!projectId) throw new Error("Unable to create tag. Please select a project.");
  if (!tagName) throw new Error("Please enter a tag name.");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagName, projectId }),
  });
}

export async function deleteTaskTag(taskId, tagId) {
  if (!taskId) throw new Error("Unable to delete tag. Please select a task.");
  if (!tagId) throw new Error("Please select a tag.");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/tags/${tagId}`, {
    method: "DELETE",
  });
}

export async function getTaskFiles(taskId) {
  if (!taskId) throw new Error("Unable to load attachments. Please select a task.");
  return fetchWithAuth(`${API_URL}/auth/tasks/${taskId}/files`, {
    method: "GET",
    cache: "no-cache",
    headers: { "Cache-Control": "no-store" },
  });
}

export async function uploadTaskFile(taskId, file) {
  if (!taskId) throw new Error("Unable to upload attachment. Please select a task.");
  if (!file) throw new Error("Please choose a file to upload.");

  const formData = new FormData();
  formData.append("file", file);
  console.info("Uploading task attachment:", {
    taskId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || "application/octet-stream",
  });

  return fetchWithAuth(`${API_URL}/auth/tasks/${taskId}/files`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteTaskFile(taskId, fileId) {
  if (!taskId) throw new Error("Unable to delete attachment. Please select a task.");
  if (!fileId) throw new Error("Please select an attachment.");

  return fetchWithAuth(`${API_URL}/auth/tasks/${taskId}/files/${fileId}`, {
    method: "DELETE",
  });
}

export async function deleteProject(projectId) {
  if (!projectId) throw new Error("Unable to delete project. Please select a project.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function removeMemberFromProject(projectId, memberId) {
  if (!projectId) throw new Error("Unable to remove member. Please select a project.");
  if (!memberId) throw new Error("Please select a team member.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export async function updateMemberRole(projectId, memberId, role) {
  if (!projectId) throw new Error("Unable to update role. Please select a project.");
  if (!memberId) throw new Error("Please select a team member.");
  if (!role) throw new Error("Please select a role.");

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/members/${memberId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function getTaskReviews(taskId) {
  if (!taskId) throw new Error("Unable to load reviews. Please select a task.");
  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/reviews`, {
    method: "GET",
    cache: "no-cache",
    headers: { "Cache-Control": "no-store" },
  });
}

export async function approveTaskReview(taskId, reason) {
  if (!taskId) throw new Error("Unable to approve task. Please select a task.");
  const trimmed = String(reason ?? "").trim();
  // Keep `review` canonical while preserving `reason` compatibility on older handlers.
  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/review/approve`, {
    method: "POST",
    body: JSON.stringify({ review: trimmed, reason: trimmed }),
  });
}

export async function rejectTaskReview(taskId, reason) {
  if (!taskId) throw new Error("Unable to return task. Please select a task.");
  if (!reason || String(reason).trim() === "") throw new Error("Please provide a reason for returning the task.");
  const trimmed = String(reason).trim();
  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/review/reject`, {
    method: "POST",
    body: JSON.stringify({ review: trimmed, reason: trimmed }),
  });
}
