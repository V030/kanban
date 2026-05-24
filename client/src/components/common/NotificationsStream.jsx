import { useEffect, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import { getToken, invalidateUserCache, hydrateUserFromToken } from "../../services/authService";

// Track seen event IDs to prevent duplicates during reconnects
// Use a Set with a maximum size to avoid unbounded memory growth
const MAX_DEDUP_SIZE = 1000;
let seenEventIds = new Set();

export default function NotificationsStream() {
  const streamRef = useRef(null);
  const toast = useToast();
  const token = getToken();

  /**
   * Check if an event has been seen before and mark it as seen.
   * Returns false if this is a duplicate event.
   */
  const isDuplicateEvent = (eventId) => {
    if (!eventId) return false; // Events without IDs are always processed
    if (seenEventIds.has(eventId)) return true;
    
    // Mark event as seen
    seenEventIds.add(eventId);
    
    // Prevent unbounded growth by clearing the oldest entries if we exceed max size
    if (seenEventIds.size > MAX_DEDUP_SIZE) {
      const idsArray = Array.from(seenEventIds);
      const toRemove = idsArray.slice(0, Math.floor(MAX_DEDUP_SIZE / 2));
      toRemove.forEach(id => seenEventIds.delete(id));
    }
    
    return false;
  };

  const handleIncomingPayload = (payload) => {
    if (!payload || typeof payload !== "object") return;

    // Check for duplicate event IDs to prevent replay of the same event
    if (isDuplicateEvent(payload.eventId)) {
      console.log("Duplicate event detected (ID:", payload.eventId, "). Skipping.");
      return;
    }

    window.dispatchEvent(new CustomEvent("notifications:push", { detail: payload }));
    window.dispatchEvent(new CustomEvent("realtime:event", { detail: payload }));
    window.dispatchEvent(new Event("notifications:updated"));

    // Handle role/permission changes: invalidate cached user state and re-hydrate
    const eventType = String(payload.eventType || "").toLowerCase();
    if (eventType === "user_role_changed") {
      console.log("Role change detected. Invalidating user cache and re-hydrating...");
      invalidateUserCache();
      hydrateUserFromToken().then(() => {
        window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: { reason: "role_change" } }));
      }).catch((err) => {
        console.error("Failed to re-hydrate user after role change:", err);
      });
      return;
    }

    if (String(payload.eventType || "").toLowerCase() !== "toast") return;

    const message = String(payload.message || "").trim();
    if (!message) return;

    const toastType = String(payload.toastType || "info").toLowerCase();
    if (toastType === "forbidden") {
      toast.showForbidden(message);
      return;
    }

    if (toastType === "validation") {
      toast.showValidationError(message);
      return;
    }

    if (toastType === "warning") {
      toast.showWarning(message);
      return;
    }

    if (toastType === "success") {
      toast.showSuccess(message);
      return;
    }

    toast.showInfo(message);
  };

  useEffect(() => {
    if (!token) return undefined;

    const url = `http://localhost:5000/auth/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    streamRef.current = source;

    const handleNotification = (event) => {
      if (!event?.data) return;
      try {
        const payload = JSON.parse(event.data);
        handleIncomingPayload(payload);
      } catch {
        // Ignore malformed events.
      }
    };

    source.addEventListener("notification", handleNotification);

    source.onerror = () => {
      // EventSource will retry automatically.
    };

    return () => {
      source.removeEventListener("notification", handleNotification);
      source.close();
      streamRef.current = null;
    };
  }, [token]);

  return null;
}
