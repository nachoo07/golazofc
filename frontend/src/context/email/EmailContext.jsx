import { createContext, useContext } from 'react';
import client from '../../api/axios';
import Swal from 'sweetalert2';
import { LoginContext } from '../login/LoginContext';

export const EmailContext = createContext();

const EmailProvider = ({ children }) => {
  const { auth } = useContext(LoginContext);
  const SIMPLE_EMAIL_REGEX = /\S+@\S+\.\S+/;

  const ensureAdmin = () => {
    if (auth !== 'admin') {
      const error = new Error('No autorizado');
      Swal.fire('Error', 'No tienes permisos para enviar correos.', 'error');
      throw error;
    }
  };

  const sendVoucherEmail = async (student, payment, attachment) => {
    ensureAdmin();
    try {
      if (!student?.mail) {
        const error = new Error('El estudiante no tiene un correo registrado.');
        Swal.fire('¡Error!', error.message, 'error');
        throw error;
      }

      // Usar guardianName para el saludo, con fallback a student.name
      const recipientName = student.guardianName || student.name;

      // Determinar si es un pago de cuota o un pago genérico
      const isCuota = payment.type === 'cuota' || !payment.concept;
      const message = isCuota
        ? `
          <h2>Comprobante de Pago</h2>
          <p>Hola ${recipientName},</p>
          <p>Adjuntamos el comprobante de pago de tu cuota correspondiente al mes de ${new Date(
          payment.date
        ).toLocaleString('es-ES', { month: 'long' })}.</p>
          <p>Gracias por tu pago.</p>
          <p>Saludos,</p>
          <p>Equipo Golazo</p>
        `
        : `
          <h2>Comprobante de Pago</h2>
          <p>Hola ${recipientName},</p>
          <p>Adjuntamos el comprobante de tu pago correspondiente a ${payment.concept || 'N/A'}.</p>
          <p>Gracias por tu pago.</p>
          <p>Saludos,</p>
          <p>Equipo Golazo</p>
        `;

      const emailData = {
        recipients: [student.mail],
        subject: `Comprobante de Pago - ${student.name} ${student.lastName}`,
        message,
        attachment,
      };

      await client.post('/email/send', emailData);
      Swal.fire('¡Éxito!', 'El comprobante ha sido enviado al correo del estudiante.', 'success');
    } catch (error) {
      console.error('Error al enviar el comprobante:', error);
      if (!error?.message?.includes('correo registrado')) {
        Swal.fire('¡Error!', error.response?.data?.message || 'No se pudo enviar el comprobante. Intenta de nuevo.', 'error');
      }
      throw error;
    }
  };

  const normalizeEmailsPayload = (emails = []) => {
    const normalized = [];

    emails.forEach((entry) => {
      const subject = (entry?.subject || '').trim();
      const message = entry?.message || '';
      const attachment = entry?.attachment;
      const recipients = String(entry?.recipient || '')
        .split(',')
        .map((mail) => mail.trim())
        .filter(Boolean);
      recipients.forEach((recipient) => {
        normalized.push({ recipient, subject, message, attachment });
      });
    });

    return normalized;
  };

  const sendMultipleEmails = async (emails, options = {}) => {
    ensureAdmin();
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error('No hay correos válidos para enviar.');
    }

    try {
      const normalizedEmails = normalizeEmailsPayload(emails).filter(
        (item) => SIMPLE_EMAIL_REGEX.test(item.recipient) && item.subject && item.message
      );

      if (normalizedEmails.length === 0) {
        throw new Error('No hay correos válidos para enviar.');
      }

      const first = normalizedEmails[0];
      const allSameContent = normalizedEmails.every(
        (item) =>
          item.subject === first.subject &&
          item.message === first.message &&
          JSON.stringify(item.attachment ?? null) === JSON.stringify(first.attachment ?? null)
      );
      const forcePerRecipient = Boolean(options.forcePerRecipient);
      const payload = allSameContent && !forcePerRecipient
        ? {
          recipients: normalizedEmails.map((item) => item.recipient),
          subject: first.subject,
          message: first.message,
          attachment: first.attachment,
        }
        : { messages: normalizedEmails };

      if (options.progressId) {
        payload.progressId = options.progressId;
      }
      if (options.enforceSingleState) {
        payload.enforceSingleState = true;
      }
      if (Array.isArray(options.selectedStudentIds) && options.selectedStudentIds.length > 0) {
        payload.selectedStudentIds = options.selectedStudentIds;
      }

      const response = await client.post('/email/send', payload);
      return response.data;
    } catch (error) {
      console.error('Error al enviar correos:', error);
      const message = error.response?.data?.failed
        ? `No se pudieron enviar correos a: ${error.response.data.failed.map(f => f.recipient).join(', ')}`
        : error.response?.data?.message || 'No se pudieron enviar los correos.';
      throw new Error(message);
    }
  };

  const createEmailProgressStream = (progressId, handlers = {}) => {
    ensureAdmin();
    if (!progressId) throw new Error('progressId requerido');

    const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
    const url = `${apiBaseUrl}/email/progress/${encodeURIComponent(progressId)}`;
    const source = new EventSource(url, { withCredentials: true });

    source.addEventListener('progress', (event) => {
      if (!handlers.onProgress) return;
      try {
        handlers.onProgress(JSON.parse(event.data));
      } catch {
        // noop
      }
    });

    source.addEventListener('done', (event) => {
      if (!handlers.onDone) return;
      try {
        handlers.onDone(JSON.parse(event.data));
      } catch {
        // noop
      }
    });

    source.addEventListener('error', (event) => {
      if (!handlers.onError) return;
      try {
        const payload = event?.data ? JSON.parse(event.data) : { message: 'Error de conexión en progreso de envío.' };
        handlers.onError(payload);
      } catch {
        handlers.onError({ message: 'Error de conexión en progreso de envío.' });
      }
    });

    return source;
  };

  return (
    <EmailContext.Provider value={{
      sendVoucherEmail,
      sendMultipleEmails,
      createEmailProgressStream
    }}>
      {children}
    </EmailContext.Provider>
  );
};

export default EmailProvider;
