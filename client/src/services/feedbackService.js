import { fetchWithAuth } from "./authService";

const API_URL = "http://localhost:5000";

export async function submitFeedback(payload) {
  return fetchWithAuth(`${API_URL}/api/feedback`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}
