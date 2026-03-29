import Config from '../../models/base/config.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { validationResult } from 'express-validator';
import { sendBadRequest, sendInternalServerError, sendNotFound } from '../_shared/controller.utils.js';
const logger = pino();

// Lista blanca de claves permitidas
const allowedKeys = ['cuotaBase', 'maxStudents', 'defaultCategory'];

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

// Obtener una configuración por clave
export const getConfig = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const key = sanitize(req.params.key);

  if (!allowedKeys.includes(key)) {
    return res.status(400).json({ message: 'Clave no permitida' });
  }

  try {
    const config = await Config.findOne({ key }).lean();
    if (!config) {
      return sendNotFound(res, 'Configuración no encontrada');
    }
    res.status(200).json(config);
  } catch (error) {
    logger.error({ error: error.message, key }, 'Error al obtener configuración');
    return sendInternalServerError(res, 'Error al obtener configuración');
  }
};

export const setConfig = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { key, value } = sanitize(req.body);

  if (!allowedKeys.includes(key)) {
    return sendBadRequest(res, 'Clave no permitida');
  }

  if (key === 'cuotaBase' && (typeof value !== 'number' || value <= 0)) {
    return sendBadRequest(res, 'El valor para cuotaBase debe ser un número positivo');
  }

  if (key === 'maxStudents' && (!Number.isInteger(value) || value <= 0)) {
    return sendBadRequest(res, 'El valor para maxStudents debe ser un entero positivo');
  }

  if (key === 'defaultCategory' && (typeof value !== 'string' || value.trim() === '')) {
    return sendBadRequest(res, 'El valor para defaultCategory debe ser una cadena no vacía');
  }

  const normalizedValue = typeof value === 'string' ? value.trim() : value;

  try {
    const config = await Config.findOneAndUpdate(
      { key },
      { value: normalizedValue },
      { upsert: true, new: true }
    );
    logger.info({ key, value: normalizedValue }, 'Configuración actualizada');
    res.status(200).json({ message: 'Configuración actualizada exitosamente', config });
  } catch (error) {
    logger.error({ error: error.message, key }, 'Error al actualizar configuración');
    res.status(500).json({ message: 'Error al actualizar configuración' });
  }
}

