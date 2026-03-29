import pino from 'pino';
import { AppError } from '../../utils/errors/appError.js';
const logger = pino();

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  }, 'Error en la solicitud');

  if (err.name === 'MongoNetworkError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      message: 'Servicio no disponible. Por favor, inténtelo de nuevo más tarde.'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Identificador inválido'
    });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación de datos',
      errors: Object.values(err.errors || {}).map((e) => e.message)
    });
  }

  if (err?.code === 11000) {
    const duplicatedField = Object.keys(err.keyPattern || {})[0] || 'campo';
    return res.status(409).json({
      success: false,
      message: `El valor de ${duplicatedField} ya existe`
    });
  }
  // Otros errores
  const statusCode = err.statusCode || err.status || 500;
  const message = err instanceof AppError ? err.message : 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message
  });
};