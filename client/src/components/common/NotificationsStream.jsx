import { useEffect, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import { getToken } from "../../services/authService";

export default function NotificationsStream() {
  const streamRef = useRef(null);
  const toast = useToast();
  const token = getToken();

  const handleIncomingPayload = (payload) => {
    if (!payload || typeof payload !== "object") return;

    window.dispatchEvent(new CustomEvent("notifications:push", { detail: payload }));
    window.dispatchEvent(new CustomEvent("realtime:event", { detail: payload }));
    window.dispatchEvent(new Event("notifications:updated"));

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
