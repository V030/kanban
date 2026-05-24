import {
  getNotificationsForUser,
  getNotificationsForUserCursor,
  getUnreadCountForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from "../models/notificationModel.js";
import { verifyToken } from "../utils/jwt.js";
import { keepAlive, registerNotificationClient } from "../utils/notificationStream.js";

export async function getNotifications(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const limit = Number(req.query?.limit ?? 50);
  const offset = Number(req.query?.offset ?? 0);
  const cursor = req.query?.cursor || null;

  try {
    if (cursor) {
      // Cursor-based pagination path
      const { rows, hasMore } = await getNotificationsForUserCursor({ userId: req.user.userId, limit, cursor });
      const notifications = rows || [];
      let nextCursor = null;
      if (hasMore && notifications.length > 0) {
        const last = notifications[notifications.length - 1];
        try {
          const payload = JSON.stringify({ createdAt: last.created_at, id: last.id });
          nextCursor = Buffer.from(payload, "utf8").toString("base64");
        } catch (e) {
          nextCursor = null;
        }
      }

      return res.status(200).json({ notifications, nextCursor, hasMore: Boolean(hasMore) });
    }

    // Fallback: offset-based behavior for backwards compatibility
    const notifications = await getNotificationsForUser({ userId: req.user.userId, limit, offset });
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ message: "Unable to fetch notifications" });
  }
}

export async function getUnreadNotificationsCount(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  try {
    const count = await getUnreadCountForUser(req.user.userId);
    return res.status(200).json({ count });
  } catch (error) {
    console.error("Get unread notifications count error:", error);
    return res.status(500).json({ message: "Unable to fetch unread notifications" });
  }
}

export async function markNotificationAsRead(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  const { notificationId } = req.params;
  if (!notificationId) return res.status(400).json({ message: "notificationId parameter is required" });

  try {
    const updated = await markNotificationRead({ userId: req.user.userId, notificationId });
    if (!updated) return res.status(404).json({ message: "Notification not found" });

    return res.status(200).json({ notification: updated });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Unable to update notification" });
  }
}

export async function markAllNotificationsAsRead(req, res) {
  if (!req.user?.userId) return res.status(401).json({ message: "Authentication required" });

  try {
    const updatedCount = await markAllNotificationsRead(req.user.userId);
    return res.status(200).json({ updatedCount });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ message: "Unable to update notifications" });
  }
}

export function streamNotifications(req, res) {
  const token = String(req.query?.token || "").trim();
  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    const userId = decoded?.userId;
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders?.();

    const cleanup = registerNotificationClient(userId, res);
    const heartbeat = setInterval(() => keepAlive(res), 25000);

    res.write("event: ready\ndata: {}\n\n");

    req.on("close", () => {
      clearInterval(heartbeat);
      cleanup();
    });
  } catch (error) {
    return res.status(403).json({ message: "Invalid / Expired token." });
  }
}
