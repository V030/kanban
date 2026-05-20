import { publishNotification } from "./notificationStream.js";

function normalizeUserIds(userIds) {
  return Array.from(
    new Set(
      (Array.isArray(userIds) ? userIds : [userIds])
        .flat()
        .map((userId) => String(userId || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeTimestamp(value) {
  if (value) return value;
  return new Date().toISOString();
}

export function buildRealtimeEvent(payload = {}) {
  const eventType = String(payload.eventType || payload.type || "").trim();
  return {
    ...payload,
    eventType,
    timestamp: normalizeTimestamp(payload.timestamp),
  };
}

export function broadcastRealtimeEvent(userIds, payload = {}) {
  const event = buildRealtimeEvent(payload);
  const recipients = normalizeUserIds(userIds);

  for (const userId of recipients) {
    publishNotification(userId, event);
  }

  return event;
}

export function broadcastProjectEvent(userIds, payload = {}) {
  return broadcastRealtimeEvent(userIds, payload);
}

export function broadcastToastEvent(userId, payload = {}) {
  const event = buildRealtimeEvent({
    eventType: "toast",
    toastType: payload.toastType || "info",
    message: String(payload.message || "").trim(),
    projectId: payload.projectId || null,
    taskId: payload.taskId || null,
    userRole: payload.userRole || null,
    reason: payload.reason || null,
    actorId: payload.actorId || null,
    timestamp: payload.timestamp,
  });

  if (event.message) {
    publishNotification(userId, event);
  }

  return event;
}