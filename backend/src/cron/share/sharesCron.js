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
    const cuotaBase = Number(config?.value);

    if (!config) {
      throw new Error('No se ejecutó la actualización de cuotas: falta configurar cuotaBase');
    }

    if (!Number.isFinite(cuotaBase) || cuotaBase <= 0) {
      throw new Error('No se ejecutó la actualización de cuotas: cuotaBase es inválida');
    }

    const startOfMonth = currentDate.startOf('month').toJSDate();
    const endOfMonth = currentDate.endOf('month').toJSDate();

    const shares = await Share.find({
      $or: [{ state: 'Pendiente' }, { state: 'Vencido' }],
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    if (shares.length === 0) {
      logger.info('No se encontraron cuotas del mes actual para actualizar');
      return;
    }

    const studentIds = [...new Set(shares.map(s => s.student))];
    const students = await Student.find({ _id: { $in: studentIds } }).lean();
    const studentsById = new Map(students.map((student) => [String(student._id), student]));

    const updateTime = DateTime.now().toJSDate();
    let skippedWithoutStudent = 0;
    let unchangedCount = 0;

    const bulkOps = shares.flatMap((share) => {
      const student = studentsById.get(String(share.student));
      if (!student) {
        skippedWithoutStudent += 1;
        return [];
      }

      const baseAmount = student && student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
      const { amount, state } = calculateShareAmount(baseAmount, currentDay, share.date);
      const roundedAmount = Math.round(amount);

      if (share.amount === roundedAmount && share.state === state) {
        unchangedCount += 1;
        return [];
      }

      return {
        updateOne: {
          filter: { _id: share._id },
          update: { amount: roundedAmount, state, updatedAt: updateTime }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Share.bulkWrite(bulkOps);
      logger.info({
        totalShares: shares.length,
        updatedCount: bulkOps.length,
        unchangedCount,
        skippedWithoutStudent
      }, 'Cuotas actualizadas correctamente');
    } else {
      logger.info(
        {
          totalShares: shares.length,
          updatedCount: 0,
          unchangedCount,
          skippedWithoutStudent
        },
        'No hubo cambios para aplicar en cuotas'
      );
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar cuotas');
    throw error;
  }
};