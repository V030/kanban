import { useEffect, useRef } from "react";
import { getToken } from "../../services/authService";

export default function NotificationsStream() {
  const streamRef = useRef(null);
  const token = getToken();

  useEffect(() => {
    if (!token) return undefined;

    const url = `http://localhost:5000/auth/notifications/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    streamRef.current = source;

    const handleNotification = (event) => {
      if (!event?.data) return;
      try {
        const payload = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent("notifications:push", { detail: payload }));
        window.dispatchEvent(new Event("notifications:updated"));
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
