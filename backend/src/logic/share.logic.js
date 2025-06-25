import Share from "../models/share/share.model.js";
import Student from "../models/student/student.model.js";
import Config from "../models/base/config.model.js";
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import pino from 'pino';
import { DateTime } from 'luxon';

const logger = pino();

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función para enviar correo
const sendCuotaEmail = async (student, cuota) => {
  if (student.state === 'Inactivo') {
    logger.info(`No se envía correo a ${student.name} ${student.lastName}: estudiante inactivo`);
    return;
  }
  if (!student.mail || !/\S+@\S+\.\S+/.test(student.mail)) {
    logger.warn(`Correo inválido para ${student.name} ${student.lastName}`);
    return;
  }
  // Convierte cuota.date (objeto Date) a DateTime con la zona horaria correcta
  const cuotaDate = DateTime.fromJSDate(cuota.date).setZone('America/Argentina/Tucuman');
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const cuotaMonth = monthNames[cuotaDate.month - 1]; // Luxon usa meses 1-12
  const cuotaYear = cuotaDate.year;
  const config = await Config.findOne({ key: 'cuotaBase' });
  const cuotaBase = config ? config.value : 30000;
  const baseAmount = student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
  const amountWith10Percent = Math.round(baseAmount * 1.1);
  const amountWith20Percent = Math.round(baseAmount * 1.2);
  const amountWith30Percent = Math.round(baseAmount * 1.3);

  // Mensaje en formato HTML
  const message = sanitizeHtml(`
 <!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
                    <h1 style="color: #ff1493; font-size: 24px; font-weight: bold; margin: 0; text-transform: uppercase;">
                      ESTIMADO/A PADRE/MADRE DE ${student.name.toUpperCase()} ${student.lastName.toUpperCase()}
                    </h1>
                  </td>
                  <td align="right">
                    <img src="https://res.cloudinary.com/dqhb2dkgf/image/upload/v1740286370/Captura_de_pantalla_2025-02-11_a_la_s_9.29.34_p._m._bqndud.png" alt="Logo" style="width: 100px; height: auto;" />
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                Le informamos que se ha generado una nueva cuota correspondiente al mes de <strong>${cuotaMonth} ${cuotaYear}</strong>.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                - Si abona entre el día 1 y 10: $${baseAmount.toLocaleString('es-ES')}.<br />
                - Si abona entre el 11 al 20: $${amountWith10Percent.toLocaleString('es-ES')}<br />
                - Si abona entre el 21 al 31: $${amountWith20Percent.toLocaleString('es-ES')}<br />
                - Mes vencido: $${amountWith30Percent.toLocaleString('es-ES')}.
              </p>
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

              <h2 style="color: #ff1493; font-size: 20px; font-weight: bold; margin-bottom: 10px;">
                Información para realizar la transferencia
              </h2>

              <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                En caso de que desee abonar mediante transferencia bancaria, le compartimos los datos necesarios:
              </p>

              <ul style="color: #333333; font-size: 16px; line-height: 1.8; padding-left: 20px;">
                <li><strong>Alias:</strong> 2025golazo</li>
                <li><strong>Titular:</strong> Marina López Figueroa</li>
                <li><strong>Entidad:</strong> Mercado Pago</li>
              </ul>

              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 20px;">
                Una vez realizada la transferencia, por favor envíe el comprobante al siguiente correo electrónico: <strong>golazoescueladefutbol@gmail.com</strong> 
                o al siguiente número: <strong>3814765925</strong>.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.5;">
                Dentro de las siguientes 72 horas hábiles, recibirá el comprobante de pago correspondiente.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin-top: 30px;">
                Saludos cordiales,<br />
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
  `);

  const mailOptions = {
    from: `"Golazo" <${process.env.EMAIL_USER}>`,
    to: student.mail,
    subject: `Nueva cuota generada para ${student.name} ${student.lastName} - ${cuotaMonth} ${cuotaYear}`,
    html: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Correo enviado a ${student.mail} para la cuota de ${cuotaMonth} ${cuotaYear}`);
  } catch (error) {
    logger.error({ error: error.message }, `Error enviando correo a ${student.mail}`);
  }
};

export const createPendingShares = async () => {
  try {
    const config = await Config.findOne({ key: 'cuotaBase' });
    const cuotaBase = config ? config.value : 30000;
    const currentDate = DateTime.now().setZone('America/Argentina/Tucuman');
    logger.info(`Fecha actual en UTC-3: ${currentDate.toString()}`);
    const monthStart = currentDate.startOf('month').toJSDate();

    const students = await Student.find({ state: 'Activo' }).lean();
    const studentIds = students.map(s => s._id);
    const existingShares = await Share.find({ date: monthStart, student: { $in: studentIds } }).lean();

    const bulkOps = students
      .filter(student => !existingShares.some(share => share.student.equals(student._id)))
      .map(student => {
        const amount = student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
        return {
          insertOne: {
            document: {
              student: student._id,
              date: monthStart,
              amount: Math.round(amount),
              state: 'Pendiente',
              paymentmethod: null,
              paymentdate: null,
            }
          }
        };
      });

    if (bulkOps.length > 0) {
      await Share.bulkWrite(bulkOps);
      logger.info({ createdCount: bulkOps.length }, 'Cuotas creadas correctamente');
    }

    for (const student of students) {
      const newShare = bulkOps.find(op => op.insertOne.document.student.equals(student._id));
      if (newShare && student.mail) {
        await sendCuotaEmail(student, newShare.insertOne.document);
      } else if (!student.mail) {
        logger.warn(`No se envió correo a ${student.name} ${student.lastName}: falta email`);
      }
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear cuotas');
    throw error;
  }
};