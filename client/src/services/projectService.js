import { fetchWithAuth } from "./authService";

const API_URL = "http://localhost:5000";

export async function createProject(projectData) {
    return fetchWithAuth(`${API_URL}/auth/create-project`, {
        method: "POST",
        body: JSON.stringify(projectData),
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
  if (!projectId) throw new Error("projectId is required");

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
  if (!projectId) throw new Error('projectId is required');
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/get-task-categories`, {
    method: 'GET',
  });
}

export async function getProjectTasks(projectId) {
  if (!projectId) throw new Error("projectId is required");
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/tasks`, {
    method: "GET",
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

  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/${categoryId}/create-new-task`, {
    method: 'POST',
    body: JSON.stringify(taskContent || {}),
  });
}

export async function getProjectSettings(projectId) {
  if (!projectId) throw new Error("projectId is required");
  return fetchWithAuth(`${API_URL}/auth/project-settings/${projectId}`, {
    method: "GET",
  });
}

export async function updateProjectSettings(projectId, setting, value) {
  if (!projectId) throw new Error("projectId is required");
  if (!setting) throw new Error("setting is required");

  return fetchWithAuth(`${API_URL}/auth/project-settings`, {
    method: "PATCH",
    body: JSON.stringify({
      projectId,
      setting,
      value,
    }),
  });
}

export async function takeTask(taskId) {
  if (!taskId) throw new Error("task id is required");

  return fetchWithAuth(`${API_URL}/auth/project/take-task/${taskId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function updateTaskStatus(taskId, columnStatus) {
  if (!taskId) throw new Error("taskId is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ categoryId: columnStatus }),
  });
}

export async function assignTaskToOthers(taskId, memberId) {
  if (!taskId) throw new Error("task id is required");
  if (!memberId) throw new Error("member id is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/assign-task/${memberId}/${taskId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function unassignTaskFromMember(taskId, memberId) {
  if (!taskId) throw new Error("task id is required");
  if (!memberId) throw new Error("member id is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/assign-task/${memberId}/${taskId}`, {
    method: "DELETE",
  });
}

export async function unassignTask(taskId) {
  if (!taskId) throw new Error("task id is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/unassign-task/${taskId}`, {
    method: "DELETE",
  });
}

export async function createSubtask(subtaskData) {
  if (!subtaskData) throw new Error("subtask data is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${subtaskData.taskId}/subtasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({subtaskData}),
  });
}


export async function updateSubtask(taskId, subtaskId, payload) {
  if (!taskId) throw new Error("task id is required");
  if (!subtaskId) throw new Error("subtask id is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload || {}),
  });
}

export async function deleteSubtask(taskId, subtaskId) {
  if (!taskId) throw new Error("task id is required");
  if (!subtaskId) throw new Error("subtask id is required");

  return fetchWithAuth(`${API_URL}/auth/project/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "DELETE",
  });
}

export async function getTaskComments(taskId) {
  if (!taskId) throw new Error("task id is required");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/comments`, {
    method: "GET",
  });
}

export async function createTaskComment(taskId, userId, comment) {
  if (!taskId) throw new Error("task id is required");
  if (!userId) throw new Error("user id is required");
  if (!comment) throw new Error("comment is required");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/comments/${userId}`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export async function createTaskCommentReply(taskId, commentId, userId, commentReply) {
  if (!taskId) throw new Error("task id is required");
  if (!commentId) throw new Error("comment id is required");
  if (!userId) throw new Error("user id is required");
  if (!commentReply) throw new Error("comment reply is required");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/comments/${commentId}/${userId}`, {
    method: "POST",
    body: JSON.stringify({ comment_reply: commentReply }),
  });
}

export async function getProjectTags(projectId) {
  if (!projectId) throw new Error("projectId is required");
  return fetchWithAuth(`${API_URL}/auth/projects/${projectId}/tags`, { method: "GET" });
}

export async function getTaskTags(taskId) {
  if (!taskId) throw new Error("taskId is required");
  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/tags`, { method: "GET" });
}

export async function createTaskTag(taskId, projectId, tagName) {
  if (!taskId) throw new Error("taskId is required");
  if (!projectId) throw new Error("projectId is required");
  if (!tagName) throw new Error("tagName is required");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagName, projectId }),
  });
}

export async function deleteTaskTag(taskId, tagId) {
  if (!taskId) throw new Error("taskId is required");
  if (!tagId) throw new Error("tagId is required");

  return fetchWithAuth(`${API_URL}/auth/api/tasks/${taskId}/tags/${tagId}`, {
    method: "DELETE",
  });
}