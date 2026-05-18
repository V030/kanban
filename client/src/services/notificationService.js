import { fetchWithAuth } from "./authService";

const API_URL = "http://localhost:5000";

export async function getNotifications(limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return fetchWithAuth(`${API_URL}/auth/notifications?${params.toString()}`, {
    method: "GET",
  });
}

export async function getUnreadNotificationsCount() {
  return fetchWithAuth(`${API_URL}/auth/notifications/unread-count`, {
    method: "GET",
  });
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) throw new Error("notificationId is required");

  return fetchWithAuth(`${API_URL}/auth/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead() {
  return fetchWithAuth(`${API_URL}/auth/notifications/mark-all-read`, {
    method: "PATCH",
  });
}
