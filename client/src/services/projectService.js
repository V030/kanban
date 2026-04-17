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