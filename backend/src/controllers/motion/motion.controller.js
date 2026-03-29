import Motion from '../../models/motion/motion.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { validationResult } from 'express-validator';
import {
  isInvalidDate,
  sendBadRequest,
  sendInternalServerError,
  sendNotFound
} from '../_shared/controller.utils.js';
import { normalizePaymentMethod } from '../../utils/payment/payment.utils.js';
const logger = pino();

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

const serializeMotion = (motion) => {
  if (!motion) return motion;

  return {
    ...motion,
    paymentMethod: normalizePaymentMethod(motion.paymentMethod) || motion.paymentMethod
  };
};

export const createMotion = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { concept, date, amount, paymentMethod, incomeType } = sanitize(req.body);

  if (!concept || !date || amount === undefined || !paymentMethod || !incomeType) {
    return sendBadRequest(res, 'Faltan datos obligatorios');
  }

  const motionDate = new Date(date);
  if (isInvalidDate(motionDate)) {
    return sendBadRequest(res, 'Fecha inválida');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return sendBadRequest(res, 'El monto debe ser un número positivo');
  }

  const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
  if (!normalizedPaymentMethod) {
    return sendBadRequest(res, 'Método de pago inválido');
  }

  try {
    const newMotion = new Motion({
      concept,
      date: motionDate,
      amount,
      paymentMethod: normalizedPaymentMethod,
      incomeType,
      createdBy: req.user.userId
    });
    await newMotion.save();
    logger.info({ motionId: newMotion._id }, 'Movimiento creado');
    res.status(201).json(serializeMotion(newMotion.toObject()));
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear movimiento');
    return sendInternalServerError(res, 'Error al crear movimiento');
  }
};

export const getMotions = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const motions = await Motion.find()
      .select('concept date amount paymentMethod incomeType')
      .sort({ date: -1 })
      .lean();
    const serializedMotions = motions.map(serializeMotion);
    res.status(200).json(serializedMotions)
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener movimientos');
    return sendInternalServerError(res, 'Error al obtener movimientos');
  }
};

export const updateMotion = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);
  const updates = sanitize(req.body);

  if (updates.date) {
    const parsedDate = new Date(updates.date);
    if (isInvalidDate(parsedDate)) {
      return sendBadRequest(res, 'Fecha inválida');
    }
    updates.date = parsedDate;
  }

  if (updates.amount !== undefined && (typeof updates.amount !== 'number' || updates.amount <= 0)) {
    return sendBadRequest(res, 'El monto debe ser un número positivo');
  }

  if (updates.paymentMethod !== undefined) {
    const normalizedPaymentMethod = normalizePaymentMethod(updates.paymentMethod);
    if (!normalizedPaymentMethod) {
      return sendBadRequest(res, 'Método de pago inválido');
    }
    updates.paymentMethod = normalizedPaymentMethod;
  }

  try {
    const updatedMotion = await Motion.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedMotion) {
      return sendNotFound(res, 'Movimiento no encontrado');
    }
    logger.info({ motionId: id }, 'Movimiento actualizado');
    res.status(200).json(serializeMotion(updatedMotion));
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar movimiento');
    return sendInternalServerError(res, 'Error al actualizar movimiento');
  }
};

export const deleteMotion = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    const deletedMotion = await Motion.findByIdAndDelete(id);
    if (!deletedMotion) {
      return sendNotFound(res, 'Movimiento no encontrado');
    }
    logger.info({ motionId: id }, 'Movimiento eliminado');
    res.status(200).json({ message: 'Movimiento eliminado exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar movimiento');
    return sendInternalServerError(res, 'Error al eliminar movimiento');
  }
};

// Obtener movimientos por fecha
export const getMotionsByDate = async (req, res) => {
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

    const motions = await Motion.find({
      date: { $gte: startDate, $lt: endDate }
    }).select('paymentMethod date amount incomeType').sort({ date: 1 }).lean();

    const serializedMotions = motions.map(serializeMotion);
    res.status(200).json(serializedMotions)
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener movimientos por fecha');
    return sendInternalServerError(res, 'Error al obtener movimientos');
  }
};

export const getMotionsByDateRange = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const query = sanitize(req.query);
  const startDate = query.startDate || query.start;
  const endDate = query.endDate || query.end;

  if (!startDate || !endDate) {
    return sendBadRequest(res, 'Se requieren fechas de inicio y fin');
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isInvalidDate(start) || isInvalidDate(end)) {
      return sendBadRequest(res, 'Fechas inválidas');
    }
    end.setDate(end.getDate() + 1);

    const motions = await Motion.find({
      date: { $gte: start, $lt: end }
    }).select('paymentMethod date amount incomeType').sort({ date: 1 }).lean();

    const serializedMotions = motions.map(serializeMotion);
    res.status(200).json(serializedMotions);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener movimientos por rango de fechas');
    return sendInternalServerError(res, 'Error al obtener movimientos');
  }
};