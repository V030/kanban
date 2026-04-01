import { fetchWithAuth } from "./authService";

const API_URL = "http://localhost:5000";

export async function createProject(projectData) {
    return fetchWithAuth(`${API_URL}/auth/create-project`, {
        method: "POST",
        body: JSON.stringify(projectData),
    });
}

export async function getProjects() {
  return fetchWithAuth(`${API_URL}/auth/projects`, {
    method: "GET",
  });
}