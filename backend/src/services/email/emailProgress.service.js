const progressClients = new Map();
const progressSnapshots = new Map();

const toSsePayload = (event, payload) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

const dispatch = (progressId, event, payload) => {
  if (!progressId) return;
  const clients = progressClients.get(progressId);
  if (!clients || clients.size === 0) return;
  const message = toSsePayload(event, payload);
  clients.forEach((clientRes) => {
    try {
      clientRes.write(message);
    } catch {
      // noop: conexión cerrada
    }
  });
};

export const initEmailProgress = ({ progressId, total = 0 }) => {
  if (!progressId) return;
  const snapshot = {
    status: "started",
    total,
    sent: 0,
    failed: 0,
    pending: Math.max(0, total),
    updatedAt: new Date().toISOString(),
  };
  progressSnapshots.set(progressId, snapshot);
  dispatch(progressId, "progress", snapshot);
};

export const updateEmailProgress = ({ progressId, sent = 0, failed = 0, total = 0 }) => {
  if (!progressId) return;
  const snapshot = {
    status: "in_progress",
    total,
    sent,
    failed,
    pending: Math.max(0, total - sent - failed),
    updatedAt: new Date().toISOString(),
  };
  progressSnapshots.set(progressId, snapshot);
  dispatch(progressId, "progress", snapshot);
};

export const completeEmailProgress = ({ progressId, total = 0, sent = 0, failed = 0 }) => {
  if (!progressId) return;
  const snapshot = {
    status: "completed",
    total,
    sent,
    failed,
    pending: 0,
    updatedAt: new Date().toISOString(),
  };
  progressSnapshots.set(progressId, snapshot);
  dispatch(progressId, "progress", snapshot);
  dispatch(progressId, "done", snapshot);
};

export const failEmailProgress = ({ progressId, total = 0, sent = 0, failed = 0, message = "Error al enviar correos" }) => {
  if (!progressId) return;
  const snapshot = {
    status: "failed",
    total,
    sent,
    failed,
    pending: Math.max(0, total - sent - failed),
    message,
    updatedAt: new Date().toISOString(),
  };
  progressSnapshots.set(progressId, snapshot);
  dispatch(progressId, "error", snapshot);
};

export const subscribeEmailProgress = (req, res) => {
  const { progressId } = req.params;

  if (!progressId) {
    return res.status(400).json({ message: "progressId requerido" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  if (!progressClients.has(progressId)) {
    progressClients.set(progressId, new Set());
  }

  const clients = progressClients.get(progressId);
  clients.add(res);

  res.write(`retry: 2000\n\n`);

  const existing = progressSnapshots.get(progressId);
  if (existing) {
    res.write(toSsePayload("progress", existing));
  }

  const keepAlive = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(res);
    if (clients.size === 0) {
      progressClients.delete(progressId);
    }
  });
};
