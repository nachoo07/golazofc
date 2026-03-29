import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import Config from '../../models/base/config.model.js';
import { calculateShareAmount } from '../../cron/share/sharesCron.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { DateTime } from 'luxon';
import { validationResult } from 'express-validator';
import {
  isInvalidDate,
  sendBadRequest,
  sendInternalServerError,
  sendNotFound
} from '../_shared/controller.utils.js';

const logger = pino();
const VALID_PAYMENT_METHODS = ['Efectivo', 'Transferencia'];
const APP_ZONE = 'America/Argentina/Tucuman';

const normalizeShareMonth = (value) => {
  if (!value) return null;

  let parsedDate;

  if (typeof value === 'string') {
    const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      parsedDate = DateTime.fromISO(value, { zone: APP_ZONE });
    } else {
      parsedDate = DateTime.fromJSDate(new Date(value), { zone: APP_ZONE });
    }
  } else {
    parsedDate = DateTime.fromJSDate(new Date(value), { zone: APP_ZONE });
  }

  if (!parsedDate.isValid) return null;

  return parsedDate
    .startOf('month')
    .toJSDate();
};

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

export const getAllShares = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const shares = await Share.find()
      .populate({ path: 'student', select: 'name lastName' })
      .sort({ date: -1 })
      .lean();
    res.status(200).json(shares);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas');
    return sendInternalServerError(res, 'Error al obtener cuotas');
  }
};

export const getSharesStatusCount = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const counts = await Share.aggregate([
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state: '$_id',
          count: 1,
        },
      },
    ]);

    const result = {
      pendientes: 0,
      vencidas: 0,
      pagadas: 0,
    };

    counts.forEach((item) => {
      if (item.state === 'Pendiente') result.pendientes = item.count;
      if (item.state === 'Vencido') result.vencidas = item.count;
      if (item.state === 'Pagado') result.pagadas = item.count;
    });

    logger.info({ counts: result }, 'Conteo de cuotas exitoso');
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al obtener conteos de cuotas');
    return sendInternalServerError(res, 'Error al obtener conteos de cuotas');
  }
};

export const createShare = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { student, date, amount, paymentmethod, paymentdate } = sanitize(req.body);

  if (!student || !date || amount == null) {
    return sendBadRequest(res, "Faltan campos obligatorios");
  }

  try {
    const shareDate = normalizeShareMonth(date);
    if (isInvalidDate(shareDate)) {
      return sendBadRequest(res, "Fecha inválida");
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return sendBadRequest(res, 'El monto debe ser mayor a 0');
    }


    if ((paymentmethod && !paymentdate) || (!paymentmethod && paymentdate)) {
      return sendBadRequest(res, 'Para registrar pago se requieren paymentmethod y paymentdate');
    }

    if (paymentmethod && !VALID_PAYMENT_METHODS.includes(paymentmethod)) {
      return sendBadRequest(res, 'Método de pago inválido');
    }

    const parsedPaymentDate = paymentdate ? new Date(paymentdate) : null;
    if (parsedPaymentDate && isInvalidDate(parsedPaymentDate)) {
      return sendBadRequest(res, 'Fecha de pago inválida');
    }

    const studentEntity = await Student.findById(student).select('state').lean();
    if (!studentEntity) {
      return sendNotFound(res, 'Estudiante no encontrado');
    }
    if (studentEntity.state === 'Inactivo') {
      return sendBadRequest(res, 'No se pueden registrar cuotas para alumnos inactivos');
    }

    const existingShare = await Share.exists({ student, date: shareDate });
    if (existingShare) {
      return sendBadRequest(res, 'Ya existe una cuota para ese alumno en ese mes');
    }

    const cuotaState = paymentdate ? 'Pagado' : 'Pendiente';
    const newShare = new Share({
      student,
      date: shareDate,
      amount: parsedAmount,
      paymentmethod,
      paymentdate: parsedPaymentDate,
      state: cuotaState,
      updatedBy: req.user.userId
    });
    await newShare.save();
    logger.info({ shareId: newShare._id }, 'Cuota creada');
    res.status(201).json({ message: "Cuota creada exitosamente", share: newShare });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear cuota');
    if (error?.code === 11000) {
      return sendBadRequest(res, 'Ya existe una cuota para ese alumno en ese mes');
    }
    return sendInternalServerError(res, 'Error al crear cuota');
  }
};

export const deleteShare = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    const share = await Share.findByIdAndDelete(id);
    if (!share) {
      return sendNotFound(res, 'Cuota no encontrada');
    }
    logger.info({ shareId: id }, 'Cuota eliminada');
    res.status(200).json({ message: 'Cuota eliminada exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar cuota');
    return sendInternalServerError(res, 'Error al eliminar cuota');
  }
};

export const updateShare = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);
  const { amount, paymentdate, paymentmethod } = sanitize(req.body);

  try {
    const share = await Share.findById(id);
    if (!share) {
      return sendNotFound(res, 'Cuota no encontrada');
    }
    const studentEntity = await Student.findById(share.student).select('state').lean();
    if (!studentEntity) {
      return sendNotFound(res, 'Estudiante no encontrado');
    }
    if (studentEntity.state === 'Inactivo') {
      return sendBadRequest(res, 'No se pueden actualizar cuotas de alumnos inactivos');
    }

    if (amount != null) {
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return sendBadRequest(res, 'El monto debe ser mayor a 0');
      }
      share.amount = parsedAmount;
    }

    const nextPaymentMethod = paymentmethod ?? share.paymentmethod;
    const nextPaymentDateRaw = paymentdate ?? share.paymentdate;

    if (paymentdate) {
      const paymentDate = new Date(paymentdate);
      if (isInvalidDate(paymentDate)) {
        return sendBadRequest(res, 'Fecha de pago inválida');
      }
      share.paymentdate = paymentDate;
    }

    if (paymentmethod) {
      if (!VALID_PAYMENT_METHODS.includes(paymentmethod)) {
        return sendBadRequest(res, 'Método de pago inválido');
      }
      share.paymentmethod = paymentmethod;
    }

    if ((paymentmethod && !nextPaymentDateRaw) || (!paymentmethod && paymentdate)) {
      return sendBadRequest(res, 'Para registrar pago se requieren paymentmethod y paymentdate');
    }

    share.state = nextPaymentMethod && nextPaymentDateRaw ? 'Pagado' : 'Pendiente';

    share.updatedBy = req.user.userId;

    await share.save();
    logger.info({ shareId: id }, 'Cuota actualizada');
    res.status(200).json({ message: 'Cuota actualizada exitosamente', share });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar cuota');
    return sendInternalServerError(res, 'Error al actualizar cuota');
  }
};

export const getShareById = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    const share = await Share.findById(id)
      .populate({ path: 'student', select: 'name lastName' })
      .lean();
    if (!share) {
      return sendNotFound(res, 'Cuota no encontrada');
    }
    res.status(200).json(share);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al obtener cuota');
    return sendInternalServerError(res, 'Error al obtener cuota');
  }
};

export const getSharesByStudent = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { studentId } = sanitize(req.params);

  try {
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return sendNotFound(res, 'Estudiante no encontrado');
    }
    const shares = await Share.find({ student: studentId })
      .populate({ path: 'student', select: 'name lastName' })
      .sort({ date: -1 })
      .lean();
    res.status(200).json(shares);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas por estudiante');
    return sendInternalServerError(res, 'Error al obtener cuotas');
  }
};

export const getSharesByDate = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { date } = sanitize(req.params);

  try {
    const startDate = new Date(date);
    if (isInvalidDate(startDate)) {
      return sendBadRequest(res, 'Fecha inválida');
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const shares = await Share.find({
      paymentdate: { $gte: startDate, $lt: endDate }
    }).populate({ path: 'student', select: 'name lastName' }).sort({ paymentdate: -1 }).lean();

    res.status(200).json(shares);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas por fecha');
    return sendInternalServerError(res, 'Error al obtener cuotas');
  }
};

export const getSharesByDateRange = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { startDate, endDate } = sanitize(req.query);

  if (!startDate || !endDate) {
    return sendBadRequest(res, 'Se requieren startDate y endDate');
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isInvalidDate(start) || isInvalidDate(end)) {
      return sendBadRequest(res, 'Fechas inválidas');
    }
    end.setDate(end.getDate() + 1);

    const shares = await Share.find({
      paymentdate: { $gte: start, $lt: end }
    }).populate({ path: 'student', select: 'name lastName' }).sort({ paymentdate: -1 }).lean();

    res.status(200).json(shares);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas por rango de fechas');
    return sendInternalServerError(res, 'Error al obtener cuotas');
  }
};

export const getStudentsWithShareStatus = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const students = await Student.aggregate([
      {
        $lookup: {
          from: "shares",
          localField: "_id",
          foreignField: "student",
          as: "shares"
        }
      },
      {
        $project: {
          name: 1,
          lastName: 1,
          status: {
            $cond: [
              { $anyElementTrue: { $map: { input: "$shares", in: { $eq: ["$$this.state", "Vencido"] } } } },
              "Vencido",
              {
                $cond: [
                  { $anyElementTrue: { $map: { input: "$shares", in: { $eq: ["$$this.state", "Pendiente"] } } } },
                  "Pendiente",
                  {
                    $cond: [
                      { $anyElementTrue: { $map: { input: "$shares", in: { $eq: ["$$this.state", "Pagado"] } } } },
                      "Pagado",
                      "Sin cuotas"
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ]);
    res.status(200).json(students);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener estados de cuotas');
    return sendInternalServerError(res, 'Error al obtener estados de cuotas');
  }
};

export const updatePendingShares = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const config = await Config.findOne({ key: 'cuotaBase' });
    const cuotaBase = Number(config?.value);

    if (!config) {
      return sendBadRequest(res, 'No se ejecutó la actualización: falta configurar cuotaBase');
    }

    if (!Number.isFinite(cuotaBase) || cuotaBase <= 0) {
      return sendBadRequest(res, 'No se ejecutó la actualización: cuotaBase es inválida');
    }

    const currentDate = DateTime.now().setZone('America/Argentina/Tucuman');
    const currentDay = currentDate.day;

    if (currentDay > 10) {
      return sendBadRequest(res, 'No se puede actualizar cuotas después del día 10');
    }

    const startOfMonth = currentDate.startOf('month').toJSDate();
    const endOfMonth = currentDate.endOf('month').toJSDate();

    const shares = await Share.find({
      state: 'Pendiente',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const studentIds = [...new Set(shares.map(s => s.student))];
    const students = await Student.find({ _id: { $in: studentIds } }).lean();

    const bulkOps = shares.map(share => {
      const student = students.find(s => s._id.equals(share.student));
      const baseAmount = student && student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
      const { amount, state } = calculateShareAmount(baseAmount, currentDay, share.date);

      return {
        updateOne: {
          filter: { _id: share._id },
          update: { amount: Math.round(amount), state, updatedBy: req.user.userId }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Share.bulkWrite(bulkOps);
      logger.info({ updatedCount: bulkOps.length }, 'Cuotas pendientes actualizadas');
    }

    res.status(200).json({ message: 'Cuotas pendientes actualizadas exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar cuotas pendientes');
    return sendInternalServerError(res, 'Error al actualizar cuotas pendientes');
  }
};
