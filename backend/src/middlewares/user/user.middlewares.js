import { validationResult } from 'express-validator';
import pino from 'pino';
const logger = pino();

export const errorHandler = (err, req, res, next) => {
  logger.error({ error: err.message, stack: err.stack }, 'Error en la solicitud');

  // Manejar errores de express-validator
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: validationErrors.array()
    });
  }

  // Otros errores
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    success: false,
    message
  });
};