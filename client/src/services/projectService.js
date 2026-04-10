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