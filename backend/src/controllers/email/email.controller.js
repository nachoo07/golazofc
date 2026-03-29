
import sanitizeHtml from "sanitize-html";
import pino from "pino";
import { sendBadRequest, sendInternalServerError } from "../_shared/controller.utils.js";
import { transporter, buildFromAddress, isEmailConfigured } from "../../services/email/transporter.service.js";
import { generateVoucherPdf } from "../../services/email/voucherPdf.service.js";
import Student from "../../models/student/student.model.js";
import {
  initEmailProgress,
  updateEmailProgress,
  completeEmailProgress,
  failEmailProgress,
  subscribeEmailProgress,
} from "../../services/email/emailProgress.service.js";

const logger = pino();
const SIMPLE_EMAIL_REGEX = /\S+@\S+\.\S+/;
const PER_RECIPIENT_BATCH_SIZE = 8;
const SANITIZE_OPTIONS = {
  allowedTags: ["b", "i", "em", "strong", "p", "br", "div", "span", "h1", "h2", "h3", "img"],
  allowedAttributes: { img: ["src", "alt"] },
};

const buildMailOptions = ({ to, subject, message }) => ({
  from: buildFromAddress(),
  to,
  subject,
  html: sanitizeHtml(message, SANITIZE_OPTIONS),
});

const buildAttachment = async (attachment) => {
  if (!attachment) return undefined;

  if (typeof attachment === "object" && attachment.format === "pdf") {
    const pdfBuffer = await generateVoucherPdf(attachment);
    return [
      {
        filename: attachment.filename || "comprobante.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];
  }

  return [
    {
      filename: "comprobante.png",
      content: Buffer.from(attachment, "base64"),
      contentType: "image/png",
    },
  ];
};

const getRecipientsFromNormalizedEmail = (normalizedEmail) => {
  if (!normalizedEmail) return [];
  if (normalizedEmail.mode === "bulkSame") {
    return (normalizedEmail.recipients || []).map((email) => String(email || "").trim().toLowerCase()).filter(Boolean);
  }
  if (normalizedEmail.mode === "perRecipient") {
    return (normalizedEmail.messages || [])
      .map((entry) => String(entry?.recipient || "").trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
};

const validateSingleStudentState = async (normalizedEmail) => {
  if (!normalizedEmail?.enforceSingleState) return;

  const selectedIds = Array.isArray(normalizedEmail?.selectedStudentIds)
    ? normalizedEmail.selectedStudentIds.filter(Boolean)
    : [];

  let matchedStudents = [];

  if (selectedIds.length > 0) {
    matchedStudents = await Student.find({ _id: { $in: selectedIds } })
      .select("state")
      .lean();
  } else {
    const recipients = getRecipientsFromNormalizedEmail(normalizedEmail);
    if (recipients.length === 0) return;
    const uniqueRecipients = [...new Set(recipients)];
    matchedStudents = await Student.find({ mail: { $in: uniqueRecipients } })
      .select("state mail")
      .lean();
  }

  if (!matchedStudents.length) return;

  const distinctStates = [...new Set(matchedStudents.map((student) => student.state).filter(Boolean))];
  if (distinctStates.length > 1) {
    const error = new Error("No se puede enviar en el mismo lote a alumnos Activos e Inactivos.");
    error.statusCode = 400;
    throw error;
  }
};

export const sendEmail = async (req, res) => {
  const { normalizedEmail } = req.body;
  const progressId = normalizedEmail?.progressId;

  if (!normalizedEmail || !normalizedEmail.mode) {
    return sendBadRequest(res, "Formato de solicitud inválido");
  }

  if (!isEmailConfigured() || !transporter) {
    return res.status(503).json({ message: "El servicio de correo no está configurado" });
  }

  try {
    await validateSingleStudentState(normalizedEmail);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendBadRequest(res, error.message);
    }
    return sendInternalServerError(res, "No se pudo validar el estado de los destinatarios");
  }

  if (normalizedEmail.mode === "bulkSame") {
    const total = normalizedEmail.recipients.length;
    initEmailProgress({ progressId, total });

    const mailOptions = buildMailOptions({
      to: "undisclosed-recipients:;",
      subject: normalizedEmail.subject,
      message: normalizedEmail.message,
    });

    mailOptions.bcc = normalizedEmail.recipients;

    if (normalizedEmail.attachment) {
      mailOptions.attachments = await buildAttachment(normalizedEmail.attachment);
    }

    try {
      await transporter.sendMail(mailOptions);
      logger.info({ recipients: normalizedEmail.recipients.length, subject: normalizedEmail.subject }, "Correos enviados");
      updateEmailProgress({ progressId, total, sent: total, failed: 0 });
      completeEmailProgress({ progressId, total, sent: total, failed: 0 });
      return res.status(200).json({
        message: `Se enviaron ${total} de ${total} correos`,
        total,
        sent: total,
        failedCount: 0,
        failed: [],
      });
    } catch (error) {
      logger.error({ error: error.message, recipients: normalizedEmail.recipients }, "Error al enviar correos");
      failEmailProgress({ progressId, total, sent: 0, failed: total, message: error.message });
      return sendInternalServerError(res, "Error al enviar correos");
    }
  }

  if (normalizedEmail.mode === "perRecipient") {
    const failedEmails = [];
    const messages = normalizedEmail.messages || [];
    const total = messages.length;
    let sentCount = 0;
    let failedCount = 0;

    initEmailProgress({ progressId, total });

    for (let i = 0; i < messages.length; i += PER_RECIPIENT_BATCH_SIZE) {
      const batch = messages.slice(i, i + PER_RECIPIENT_BATCH_SIZE);

      const settledBatch = await Promise.allSettled(
        batch.map(async (email) => {
          const { recipient, subject, message, attachment } = email;

          if (!recipient || !SIMPLE_EMAIL_REGEX.test(recipient) || !subject || !message) {
            return { ok: false, recipient: recipient || "desconocido", error: "Datos inválidos" };
          }

          const mailOptions = buildMailOptions({
            to: recipient,
            subject,
            message,
          });

          if (attachment) {
            mailOptions.attachments = await buildAttachment(attachment);
          }

          await transporter.sendMail(mailOptions);
          logger.info({ recipient, subject }, "Correo enviado");
          return { ok: true, recipient };
        })
      );

      settledBatch.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if (result.value.ok) {
            sentCount += 1;
          } else {
            failedCount += 1;
            failedEmails.push({ recipient: result.value.recipient, error: result.value.error });
          }
          updateEmailProgress({ progressId, total, sent: sentCount, failed: failedCount });
          return;
        }

        const fallbackRecipient = batch[index]?.recipient || "desconocido";
        logger.error({ error: result.reason?.message, recipient: fallbackRecipient }, "Error al enviar correo");
        failedCount += 1;
        failedEmails.push({ recipient: fallbackRecipient, error: result.reason?.message || "Error desconocido" });
        updateEmailProgress({ progressId, total, sent: sentCount, failed: failedCount });
      });

      if (failedEmails.length > 0) {
        logger.warn({ batchStart: i, failedInBatch: failedEmails.length }, "Fallos detectados durante envío por lotes");
      }
    }

    if (failedEmails.length > 0) {
      completeEmailProgress({ progressId, total, sent: sentCount, failed: failedCount });
      return res.status(207).json({
        message: `Se enviaron ${sentCount} de ${total} correos`,
        total,
        sent: sentCount,
        failedCount,
        failed: failedEmails,
      });
    }

    completeEmailProgress({ progressId, total, sent: sentCount, failed: 0 });
    return res.status(200).json({
      message: `Se enviaron ${sentCount} de ${total} correos`,
      total,
      sent: sentCount,
      failedCount: 0,
      failed: [],
    });
  }

  return sendBadRequest(res, "Formato de solicitud inválido");
};

export const streamEmailProgress = (req, res) => subscribeEmailProgress(req, res);
