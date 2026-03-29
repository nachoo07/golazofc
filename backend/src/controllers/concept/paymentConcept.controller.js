import { Payment, PaymentConcept } from '../../models/payment/payment.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { validationResult } from 'express-validator';
import {
  sendBadRequest,
  sendInternalServerError,
  sendNotFound
} from '../_shared/controller.utils.js';
import { normalizeConceptKey, normalizeConceptName } from '../../utils/payment/payment.utils.js';

const logger = pino();
const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

export const getAllConcepts = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const concepts = await PaymentConcept.find()
      .sort({ name: 1 })
      .lean();
    res.status(200).json(concepts);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener conceptos');
    return sendInternalServerError(res, 'Error al obtener conceptos');
  }
};

export const createConcept = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { name } = sanitize(req.body);

  try {
    if (!name) {
      return sendBadRequest(res, 'El nombre del concepto es requerido');
    }

    const normalizedName = normalizeConceptName(name);
    const normalizedForComparison = normalizeConceptKey(name);

    const existingConcept = await PaymentConcept.findOne({
      $or: [
        { normalizedKey: normalizedForComparison },
        { name: normalizedName }
      ]
    }).select('_id').lean();

    if (existingConcept) {
      return sendBadRequest(res, 'El concepto ya existe');
    }

    const newConcept = await PaymentConcept.create({
      name: normalizedName,
      normalizedKey: normalizedForComparison
    });
    logger.info({ conceptId: newConcept._id }, 'Concepto creado');
    res.status(201).json({ message: 'Concepto creado exitosamente', concept: newConcept });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear concepto');
    if (error?.code === 11000) {
      return sendBadRequest(res, 'El concepto ya existe');
    }
    return sendInternalServerError(res, 'Error al crear concepto');
  }
};

export const deleteConcept = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    const concept = await PaymentConcept.findById(id).lean();
    if (!concept) {
      return sendNotFound(res, 'Concepto no encontrado');
    }

    const normalizedConcept = normalizeConceptName(concept.name);
    const conceptInUse = await Payment.exists({
      concept: { $regex: new RegExp(`^${escapeRegex(normalizedConcept)}$`, 'i') }
    });
    if (conceptInUse) {
      return sendBadRequest(res, 'No se puede eliminar el concepto porque ya está asociado a pagos');
    }

    await PaymentConcept.findByIdAndDelete(id);
    logger.info({ conceptId: id }, 'Concepto eliminado');
    res.status(200).json({ message: 'Concepto eliminado exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar concepto');
    return sendInternalServerError(res, 'Error al eliminar concepto');
  }
};
