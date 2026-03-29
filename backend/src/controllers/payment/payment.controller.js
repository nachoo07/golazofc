import { Payment } from '../../models/payment/payment.model.js';
import Student from '../../models/student/student.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { validationResult } from 'express-validator';
import {
  isInvalidDate,
  sendBadRequest,
  sendInternalServerError,
  sendNotFound
} from '../_shared/controller.utils.js';
import {
  normalizeConceptName,
  normalizePaymentMethod
} from '../../utils/payment/payment.utils.js';

const logger = pino();

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

export const getPaymentsByDateRange = async (req, res) => {
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

    const payments = await Payment.find({
      paymentDate: { $gte: start, $lt: end }
    }).sort({ paymentDate: -1 }).lean();

    res.status(200).json(payments);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener pagos por rango de fechas');
    return sendInternalServerError(res, 'Error al obtener pagos por rango de fechas');
  }
};

export const getAllPayments = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const payments = await Payment.find()
      .sort({ paymentDate: -1 })
      .lean();
    res.status(200).json(payments);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener todos los pagos');
    return sendInternalServerError(res, 'Error al obtener pagos');
  }
};

export const getPaymentsByStudent = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { studentId } = sanitize(req.params);

  try {
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return sendNotFound(res, 'Estudiante no encontrado');
    }

    const payments = await Payment.find({ studentId })
      .sort({ paymentDate: -1 })
      .lean();
    res.status(200).json(payments);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener pagos');
    return sendInternalServerError(res, 'Error al obtener pagos');
  }
};

export const createPayment = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const {
    studentId,
    amount,
    paymentDate,
    paymentMethod,
    concept,
  } = sanitize(req.body);

  try {
    if (!studentId || amount === undefined || !paymentDate || !paymentMethod || !concept) {
      return sendBadRequest(res, 'Faltan campos obligatorios');
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return sendBadRequest(res, 'Monto inválido');
    }


    const parsedPaymentDate = new Date(paymentDate);
    if (isInvalidDate(parsedPaymentDate)) {
      return sendBadRequest(res, 'Fecha de pago inválida');
    }

    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
    if (!normalizedPaymentMethod) {
      return sendBadRequest(res, 'Método de pago inválido');
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return sendNotFound(res, 'Estudiante no encontrado');
    }
    if (student.state === 'Inactivo') {
      return sendBadRequest(res, 'No se pueden registrar pagos para alumnos inactivos');
    }

    const normalizedConcept = normalizeConceptName(concept);
    const newPayment = await Payment.create({
      studentId,
      amount: parsedAmount,
      paymentDate: parsedPaymentDate,
      paymentMethod: normalizedPaymentMethod,
      concept: normalizedConcept,
    });

    logger.info({ paymentId: newPayment._id }, 'Pago creado');
    res.status(201).json({ message: 'Pago creado exitosamente', payment: newPayment });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear pago');
    return sendInternalServerError(res, 'Error al crear pago');
  }
};

export const deletePayment = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return sendNotFound(res, 'Pago no encontrado');
    }

    await Payment.findByIdAndDelete(id);
    logger.info({ paymentId: id }, 'Pago eliminado');
    return res.status(200).json({ message: 'Pago eliminado exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar pago');
    return sendInternalServerError(res, 'Error al eliminar pago');
  }
};

export const updatePayment = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);
  const updates = sanitize(req.body);

  try {
    if (!updates.studentId || updates.amount === undefined || !updates.paymentDate || !updates.paymentMethod || !updates.concept) {
      return sendBadRequest(res, 'Faltan campos obligatorios');
    }

    const parsedAmount = Number(updates.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return sendBadRequest(res, 'Monto inválido');
    }

    const parsedPaymentDate = new Date(updates.paymentDate);
    if (isInvalidDate(parsedPaymentDate)) {
      return sendBadRequest(res, 'Fecha de pago inválida');
    }

    const normalizedPaymentMethod = normalizePaymentMethod(updates.paymentMethod);
    if (!normalizedPaymentMethod) {
      return sendBadRequest(res, 'Método de pago inválido');
    }

    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return sendNotFound(res, 'Pago no encontrado');
    }

    const student = await Student.findById(updates.studentId).lean();
    if (!student) {
      return sendNotFound(res, 'Estudiante no encontrado');
    }
    if (student.state === 'Inactivo') {
      return sendBadRequest(res, 'No se pueden actualizar pagos de alumnos inactivos');
    }

    const normalizedConcept = normalizeConceptName(updates.concept);
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      {
        studentId: updates.studentId,
        amount: parsedAmount,
        paymentDate: parsedPaymentDate,
        paymentMethod: normalizedPaymentMethod,
        concept: normalizedConcept,
      },
      { new: true, runValidators: true }
    ).lean();

    logger.info({ paymentId: id }, 'Pago actualizado');
    res.status(200).json({ message: 'Pago actualizado exitosamente', payment: updatedPayment });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar pago');
    return sendInternalServerError(res, 'Error al actualizar pago');
  }
};
