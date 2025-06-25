import { Payment, PaymentConcept } from '../../models/payment/payment.model.js';
import Student from '../../models/student/student.model.js';
import sanitize from 'mongo-sanitize';
import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

// Normalizar texto para ignorar acentos
const normalizeText = (text) => {
  return text
    .normalize('NFD') // Descompone caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Elimina marcas diacríticas
    .toLowerCase()
    .trim();
};

export const getAllConcepts = async (req, res) => {
  try {
    const concepts = await PaymentConcept.find()
      .sort({ name: 1 })
      .lean();
    res.status(200).json(concepts.length ? concepts : { message: 'No hay conceptos disponibles' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener conceptos');
    res.status(500).json({ message: 'Error al obtener conceptos' });
  }
};

export const createConcept = async (req, res) => {
  const { name } = sanitize(req.body);

  try {
    if (!name) {
      return res.status(400).json({ message: 'El nombre del concepto es requerido' });
    }

    const normalizedName = name.toLowerCase().trim();
    const normalizedForComparison = normalizeText(name);
    const existingConcept = await PaymentConcept.findOne({
      $or: [
        { name: normalizedName },
        { name: { $regex: `^${normalizedForComparison}$`, $options: 'i' } },
      ],
    }).lean();
    if (existingConcept) {
      return res.status(400).json({ message: 'El concepto ya existe' });
    }

    const newConcept = await PaymentConcept.create({ name: normalizedName });
    logger.info({ conceptId: newConcept._id }, 'Concepto creado');
    res.status(201).json({ message: 'Concepto creado exitosamente', concept: newConcept });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear concepto');
    res.status(500).json({ message: 'Error al crear concepto' });
  }
};

export const deleteConcept = async (req, res) => {
  const { id } = sanitize(req.params);

  try {
    const concept = await PaymentConcept.findById(id).lean();
    if (!concept) {
      return res.status(404).json({ message: 'Concepto no encontrado' });
    }

    await PaymentConcept.findByIdAndDelete(id);
    logger.info({ conceptId: id }, 'Concepto eliminado');
    res.status(200).json({ message: 'Concepto eliminado exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar concepto');
    res.status(500).json({ message: 'Error al eliminar concepto' });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .sort({ paymentDate: -1 })
      .lean();
    res.status(200).json(payments.length ? payments : { message: 'No hay pagos disponibles' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener todos los pagos');
    res.status(500).json({ message: 'Error al obtener pagos' });
  }
};

export const getPaymentsByStudent = async (req, res) => {
  const { studentId } = sanitize(req.params);

  try {
    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const payments = await Payment.find({ studentId })
      .sort({ paymentDate: -1 })
      .lean();
    res.status(200).json(payments.length ? payments : { message: 'No hay pagos disponibles' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener pagos');
    res.status(500).json({ message: 'Error al obtener pagos' });
  }
};

export const createPayment = async (req, res) => {
  const {
    studentId,
    amount,
    paymentDate,
    paymentMethod,
    concept,
  } = sanitize(req.body);

  try {
    if (!studentId || !amount || !paymentDate || !paymentMethod || !concept) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const student = await Student.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const normalizedConcept = concept.toLowerCase().trim();
    const newPayment = await Payment.create({
      studentId,
      amount: parseFloat(amount),
      paymentDate: new Date(paymentDate),
      paymentMethod,
      concept: normalizedConcept,
    });

    logger.info({ paymentId: newPayment._id }, 'Pago creado');
    res.status(201).json({ message: 'Pago creado exitosamente', payment: newPayment });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear pago');
    res.status(500).json({ message: 'Error al crear pago' });
  }
};

export const deletePayment = async (req, res) => {
  const { id } = sanitize(req.params);

  try {
    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    await Payment.findByIdAndDelete(id);
    logger.info({ paymentId: id }, 'Pago eliminado');
    res.status(200).json({ message: 'Pago eliminado exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar pago');
    res.status(500).json({ message: 'Error al eliminar pago' });
  }
};

export const updatePayment = async (req, res) => {
  const { id } = sanitize(req.params);
  const updates = sanitize(req.body);

  try {
    if (!updates.studentId || !updates.amount || !updates.paymentDate || !updates.paymentMethod || !updates.concept) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const payment = await Payment.findById(id).lean();
    if (!payment) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    const student = await Student.findById(updates.studentId).lean();
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const normalizedConcept = updates.concept.toLowerCase().trim();
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      {
        studentId: updates.studentId,
        amount: parseFloat(updates.amount),
        paymentDate: new Date(updates.paymentDate),
        paymentMethod: updates.paymentMethod,
        concept: normalizedConcept,
      },
      { new: true }
    ).lean();

    logger.info({ paymentId: id }, 'Pago actualizado');
    res.status(200).json({ message: 'Pago actualizado exitosamente', payment: updatedPayment });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar pago');
    res.status(500).json({ message: 'Error al actualizar pago' });
  }
};