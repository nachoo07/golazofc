const SIMPLE_EMAIL_REGEX = /\S+@\S+\.\S+/;
const MAX_EMAILS_PER_REQUEST = 100;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const normalizeMessage = (entry = {}) => ({
  recipient: typeof entry.recipient === "string" ? entry.recipient.trim() : "",
  subject: typeof entry.subject === "string" ? entry.subject.trim() : "",
  message: typeof entry.message === "string" ? entry.message : "",
  attachment: entry.attachment,
});

const validateNormalizedMessages = (normalizedMessages = []) => normalizedMessages.filter(
  ({ recipient, subject, message }) =>
    !SIMPLE_EMAIL_REGEX.test(recipient) ||
    !isNonEmptyString(subject) ||
    !isNonEmptyString(message)
);

export const validateAndNormalizeEmailPayload = (req, res, next) => {
  const { recipients, subject, message, attachment, emails, messages, progressId, enforceSingleState, selectedStudentIds } = req.body || {};
  const normalizedProgressId = typeof progressId === "string" ? progressId.trim() : "";
  const normalizedEnforceSingleState = Boolean(enforceSingleState);
  const normalizedSelectedStudentIds = Array.isArray(selectedStudentIds)
    ? selectedStudentIds
      .map((id) => (typeof id === "string" ? id.trim() : ""))
      .filter(Boolean)
    : [];

  // Nuevo contrato recomendado
  if (Array.isArray(messages)) {
    if (messages.length === 0) {
      return res.status(400).json({ message: "El arreglo de mensajes no puede estar vacío" });
    }

    if (messages.length > MAX_EMAILS_PER_REQUEST) {
      return res.status(400).json({ message: "Máximo 100 correos por solicitud" });
    }

    const normalizedMessages = messages.map(normalizeMessage);
    const invalidMessages = validateNormalizedMessages(normalizedMessages);

    if (invalidMessages.length > 0) {
      return res.status(400).json({
        message: `Se detectaron ${invalidMessages.length} mensaje(s) con destinatario o contenido inválido`,
      });
    }

    req.body.normalizedEmail = {
      mode: "perRecipient",
      messages: normalizedMessages,
      progressId: normalizedProgressId || undefined,
      enforceSingleState: normalizedEnforceSingleState,
      selectedStudentIds: normalizedSelectedStudentIds,
    };

    return next();
  }

  // Compatibilidad con formato actual: recipients + subject + message
  if (Array.isArray(recipients) && isNonEmptyString(subject) && isNonEmptyString(message)) {
    if (recipients.length === 0) {
      return res.status(400).json({ message: "El arreglo de destinatarios no puede estar vacío" });
    }

    if (recipients.length > MAX_EMAILS_PER_REQUEST) {
      return res.status(400).json({ message: "Máximo 100 destinatarios por solicitud" });
    }

    const normalizedRecipients = recipients
      .map((email) => (typeof email === "string" ? email.trim() : ""));

    const validEmails = normalizedRecipients.every((email) => SIMPLE_EMAIL_REGEX.test(email));
    if (!validEmails) {
      return res.status(400).json({ message: "Uno o más correos son inválidos" });
    }

    req.body.normalizedEmail = {
      mode: "bulkSame",
      recipients: normalizedRecipients,
      subject: subject.trim(),
      message,
      attachment,
      progressId: normalizedProgressId || undefined,
      enforceSingleState: normalizedEnforceSingleState,
      selectedStudentIds: normalizedSelectedStudentIds,
    };

    return next();
  }

  // Compatibilidad con formato actual: emails[]
  if (Array.isArray(emails)) {
    if (emails.length === 0) {
      return res.status(400).json({ message: "El arreglo de correos no puede estar vacío" });
    }

    if (emails.length > MAX_EMAILS_PER_REQUEST) {
      return res.status(400).json({ message: "Máximo 100 correos por solicitud" });
    }

    const normalizedMessages = emails.map(normalizeMessage);
    const invalidMessages = validateNormalizedMessages(normalizedMessages);

    if (invalidMessages.length > 0) {
      return res.status(400).json({
        message: `Se detectaron ${invalidMessages.length} correo(s) con destinatario o contenido inválido`,
      });
    }

    req.body.normalizedEmail = {
      mode: "perRecipient",
      messages: normalizedMessages,
      progressId: normalizedProgressId || undefined,
      enforceSingleState: normalizedEnforceSingleState,
      selectedStudentIds: normalizedSelectedStudentIds,
    };

    return next();
  }

  return res.status(400).json({ message: "Formato de solicitud inválido" });
};
