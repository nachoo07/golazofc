export const sendBadRequest = (res, message, extra = {}) => {
  return res.status(400).json({ success: false, message, ...extra });
};

export const sendUnauthorized = (res, message, extra = {}) => {
  return res.status(401).json({ success: false, message, ...extra });
};

export const sendForbidden = (res, message, extra = {}) => {
  return res.status(403).json({ success: false, message, ...extra });
};

export const sendNotFound = (res, message, extra = {}) => {
  return res.status(404).json({ success: false, message, ...extra });
};

export const sendInternalServerError = (res, message, extra = {}) => {
  return res.status(500).json({ success: false, message, ...extra });
};

export const isInvalidDate = (value) => {
  const parsedDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedDate.getTime());
};