import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import Config from '../../models/base/config.model.js';
import pino from 'pino';
import { DateTime } from 'luxon';

const logger = pino();

export const calculateShareAmount = (baseAmount, currentDay, shareDate) => {
  const currentDate = DateTime.now().setZone('America/Argentina/Tucuman');
  const shareDateTime = DateTime.fromJSDate(new Date(shareDate)).setZone('America/Argentina/Tucuman');
  const isPreviousMonth = shareDateTime.year < currentDate.year || 
                         (shareDateTime.year === currentDate.year && shareDateTime.month < currentDate.month);

  if (isPreviousMonth) {
    return { amount: Math.round(baseAmount * 1.3), state: 'Vencido' }; // 30% aumento para mes vencido
  } else if (currentDay > 20) {
    return { amount: Math.round(baseAmount * 1.2), state: 'Vencido' }; // 20% aumento días 21-31
  } else if (currentDay > 10) {
    return { amount: Math.round(baseAmount * 1.1), state: 'Vencido' }; // 10% aumento días 11-20
  }
  return { amount: Math.round(baseAmount), state: 'Pendiente' }; // Sin aumento días 1-10
};

export const updateShares = async () => {
  const currentDate = DateTime.now().setZone('America/Argentina/Tucuman');
  logger.info(`Fecha actual en UTC-3: ${currentDate.toString()}`);
  const currentDay = currentDate.day;
  logger.info(`Ejecutando actualización de cuotas con fecha: ${currentDate.toISODate()}`);

  try {
    const config = await Config.findOne({ key: 'cuotaBase' });
    if (!config) throw new Error('No se encontró la configuración de cuotaBase');
    const cuotaBase = config.value || 30000;

    const shares = await Share.find({ $or: [{ state: 'Pendiente' }, { state: 'Vencido' }] }).lean();
    const studentIds = [...new Set(shares.map(s => s.student))];
    const students = await Student.find({ _id: { $in: studentIds } }).lean();

    const bulkOps = shares.map(share => {
      const student = students.find(s => s._id.equals(share.student));
      const baseAmount = student && student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
      const { amount, state } = calculateShareAmount(baseAmount, currentDay, share.date);

      return {
        updateOne: {
          filter: { _id: share._id },
          update: { amount: Math.round(amount), state, updatedAt: DateTime.now().toJSDate() }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Share.bulkWrite(bulkOps);
      logger.info({ updatedCount: bulkOps.length }, 'Cuotas actualizadas correctamente');
    } else {
      logger.info('No se encontraron cuotas para actualizar');
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar cuotas');
    throw error;
  }
};