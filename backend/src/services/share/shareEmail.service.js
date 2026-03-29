import sanitizeHtml from 'sanitize-html';
import pino from 'pino';
import { DateTime } from 'luxon';
import { transporter, buildFromAddress, isEmailConfigured } from '../email/transporter.service.js';

const logger = pino();

const safeText = (value = '') => sanitizeHtml(String(value), {
  allowedTags: [],
  allowedAttributes: {},
}).trim();

export const sendCuotaEmail = async (student, cuota) => {
  if (!isEmailConfigured() || !transporter) {
    logger.warn('No se envió correo de cuota: servicio de email no configurado');
    return false;
  }

  if (student.state === 'Inactivo') {
    logger.info(`No se envía correo a ${student.name} ${student.lastName}: estudiante inactivo`);
    return false;
  }

  if (!student.mail || !/\S+@\S+\.\S+/.test(student.mail)) {
    logger.warn(`Correo inválido para ${student.name} ${student.lastName}`);
    return false;
  }

  const cuotaDate = DateTime.fromJSDate(cuota.date).setZone('America/Argentina/Tucuman');
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const cuotaMonth = monthNames[cuotaDate.month - 1];
  const cuotaYear = cuotaDate.year;
  const baseAmount = cuota.amount;
  const amountWith10Percent = Math.round(baseAmount * 1.1);
  const amountWith20Percent = Math.round(baseAmount * 1.2);
  const amountWith30Percent = Math.round(baseAmount * 1.3);
  const fullName = `${safeText(student.name).toUpperCase()} ${safeText(student.lastName).toUpperCase()}`;

  const message = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <h1 style="color: #e31fa8; font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase;">
                          ESTIMADO/A PADRE/MADRE DE ${fullName}
                        </h1>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                    Le informamos que se ha generado una nueva cuota para el mes de ${cuotaMonth} ${cuotaYear}.
                  </p>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                    - <strong>Monto:</strong> $${baseAmount.toLocaleString('es-ES')}
                  </p>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                      <strong>Política de incrementos:</strong><br>
                      - Si abona entre el día 1 y 10: $${baseAmount.toLocaleString('es-ES')} (sin incremento).<br>
                      - Si abona entre el día 11 y 20: $${amountWith10Percent.toLocaleString('es-ES')} (+10%).<br>
                      - Si abona entre el día 21 y fin de mes: $${amountWith20Percent.toLocaleString('es-ES')} (+20%).<br>
                      - Si la cuota corresponde a un mes vencido: $${amountWith30Percent.toLocaleString('es-ES')} (+30%).<br>
                  </p>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                    Por favor, realice el pago a la brevedad para evitar incrementos.
                  </p>

                  <h2 style="color: #e31fa8; font-size: 20px; font-weight: bold; margin-bottom: 10px;">
                    Información para realizar la transferencia
                  </h2>

                  <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                    En caso de que desee abonar mediante transferencia bancaria, le compartimos los datos necesarios:
                  </p>

                  <ul style="color: #333333; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                    <li><strong>Alias:</strong>2025golazo</li>
                    <li><strong>Titular:</strong> Marina López Figueroa</li>
                    <li><strong>Entidad:</strong> Mercado Pago</li>
                  </ul>

                  <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                    Una vez realizada la transferencia, por favor envíe el comprobante al siguiente correo electrónico: <strong>golazoescueladefutbol@gmail.com</strong> o al siguiente número de teléfono: <strong>3814765925</strong>.
                  </p>

                  <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                    Dentro de las siguientes 72 horas hábiles, recibirá el comprobante de pago correspondiente.
                  </p>
                  <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                    Saludos cordiales,<br>
                    Equipo Golazo
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: buildFromAddress(),
    to: student.mail,
    subject: `Nueva cuota generada para ${safeText(student.name)} ${safeText(student.lastName)} - ${cuotaMonth} ${cuotaYear}`,
    html: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Correo enviado a ${student.mail} para la cuota de ${cuotaMonth} ${cuotaYear}`);
    return true;
  } catch (error) {
    logger.error({ error: error.message }, `Error enviando correo a ${student.mail}`);
    return false;
  }
};
