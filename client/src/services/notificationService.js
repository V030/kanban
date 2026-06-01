import { fetchWithAuth } from "./authService";

const API_URL = process.env.REACT_APP_API_URL;

export async function getNotifications(limit = 50, offset = 0, cursor = null, signal = undefined) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (cursor) params.set("cursor", String(cursor));
  else params.set("offset", String(offset));

  return fetchWithAuth(`${API_URL}/auth/notifications?${params.toString()}`, {
    method: "GET",
    signal,
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
