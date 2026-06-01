import { fetchWithAuth } from "./authService";


const API_URL = process.env.REACT_APP_API_URL;

export async function submitFeedback(payload) {
  return fetchWithAuth(`${API_URL}/api/feedback`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}
