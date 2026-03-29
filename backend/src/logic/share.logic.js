import Share from "../models/share/share.model.js";
import Student from "../models/student/student.model.js";
import Config from "../models/base/config.model.js";
import pino from 'pino';
import { DateTime } from 'luxon';
import { sendCuotaEmail } from '../services/share/shareEmail.service.js';

const logger = pino();

const normalizeShareMonth = (value) => {
  const parsedDate = new Date(value);
  return DateTime.fromJSDate(parsedDate, { zone: 'America/Argentina/Tucuman' })
    .startOf('month')
    .toJSDate();
};

const getCreatedSharesFromBulkResult = (bulkResult, sharesToCreate) => {
  const upsertedIds = bulkResult?.upsertedIds;
  if (!upsertedIds) return [];

  const operationIndexes = Array.isArray(upsertedIds)
    ? upsertedIds.map((entry) => entry.index)
    : Object.keys(upsertedIds).map((index) => Number(index));

  return operationIndexes
    .filter((index) => Number.isInteger(index) && sharesToCreate[index])
    .map((index) => sharesToCreate[index]);
};

export const createPendingShares = async () => {
  try {
    const config = await Config.findOne({ key: 'cuotaBase' });
    const cuotaBase = Number(config?.value);

    if (!config) {
      throw new Error('No se ejecutó la creación de cuotas: falta configurar cuotaBase');
    }

    if (!Number.isFinite(cuotaBase) || cuotaBase <= 0) {
      throw new Error('No se ejecutó la creación de cuotas: cuotaBase es inválida');
    }

    const currentDate = DateTime.now().setZone('America/Argentina/Tucuman');
    logger.info(`Fecha actual en UTC-3: ${currentDate.toString()}`);
    const monthStart = normalizeShareMonth(currentDate.toJSDate());

    const students = await Student.find({ state: 'Activo' }).lean();
    const studentIds = students.map(s => s._id);
    const existingShares = await Share.find({ date: monthStart, student: { $in: studentIds } }).lean();
    const existingStudentIds = new Set(existingShares.map((share) => String(share.student)));

    const sharesToCreate = students
      .filter((student) => !existingStudentIds.has(String(student._id)))
      .map((student) => {
        const amount = student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
        return {
          student: student._id,
          date: monthStart,
          amount: Math.round(amount),
          state: 'Pendiente',
          paymentmethod: null,
          paymentdate: null,
        };
      });

    const bulkOps = sharesToCreate.map((share) => ({
      updateOne: {
        filter: { student: share.student, date: share.date },
        update: { $setOnInsert: share },
        upsert: true
      }
    }));

    let createdShares = [];

    if (bulkOps.length > 0) {
      const bulkResult = await Share.bulkWrite(bulkOps, { ordered: false });
      const createdCount = bulkResult.upsertedCount || 0;
      createdShares = getCreatedSharesFromBulkResult(bulkResult, sharesToCreate);
      logger.info({ createdCount }, 'Cuotas creadas correctamente');
    } else {
      logger.info('No hay cuotas nuevas para crear en este mes');
    }

    return createdShares;
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear cuotas');
    throw error;
  }
};

export const notifyCreatedShares = async (createdShares = []) => {
  if (!Array.isArray(createdShares) || createdShares.length === 0) {
    logger.info('No se enviaron correos: no hubo cuotas nuevas creadas');
    return;
  }

  const studentIds = createdShares.map((share) => share.student);
  const students = await Student.find({ _id: { $in: studentIds } }).lean();
  const studentsById = new Map(students.map((student) => [String(student._id), student]));

  for (const share of createdShares) {
    const student = studentsById.get(String(share.student));

    if (!student) {
      logger.warn({ studentId: share.student }, 'No se envió correo: estudiante no encontrado');
      continue;
    }

    if (!student.mail) {
      logger.warn(`No se envió correo a ${student.name} ${student.lastName}: falta email`);
      continue;
    }

    await sendCuotaEmail(student, share);
  }
};