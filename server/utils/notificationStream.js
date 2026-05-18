import { EventEmitter } from "events";

const emitter = new EventEmitter();
const clientsByUser = new Map();

function ensureClientSet(userId) {
  if (!clientsByUser.has(userId)) {
    clientsByUser.set(userId, new Set());
  }
  return clientsByUser.get(userId);
}

export function registerNotificationClient(userId, res) {
  const userKey = String(userId || "").trim();
  if (!userKey) return () => {};

  const clients = ensureClientSet(userKey);
  clients.add(res);

  const onClose = () => {
    clients.delete(res);
    if (clients.size === 0) {
      clientsByUser.delete(userKey);
    }
  };

  res.on("close", onClose);
  res.on("finish", onClose);

  return () => {
    res.off("close", onClose);
    res.off("finish", onClose);
    onClose();
  };
}

export function publishNotification(userId, payload) {
  const userKey = String(userId || "").trim();
  if (!userKey) return;

  const clients = clientsByUser.get(userKey);
  if (!clients || clients.size === 0) return;

  const message = JSON.stringify(payload || {});
  const data = `event: notification\ndata: ${message}\n\n`;

  for (const res of clients) {
    try {
      res.write(data);
    } catch {
      // Ignore write failures; client cleanup happens on close.
    }
  }
}

export function keepAlive(res) {
  try {
    res.write(`: keep-alive\n\n`);
  } catch {
    // Ignore write failures.
  }
}

export function onNotification(listener) {
  emitter.on("notification", listener);
  return () => emitter.off("notification", listener);
}

export function emitNotification(payload) {
  emitter.emit("notification", payload);
}
