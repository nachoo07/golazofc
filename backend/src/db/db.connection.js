import mongoose from 'mongoose';
import { CONNECTION_STRING } from '../config/config.js';
import pino from 'pino';
const logger = pino();

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    logger.info('Conectado a la base de datos MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ error: err.message }, 'Error en la conexión a MongoDB');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Desconectado de MongoDB');
  });
};

export const connectDB = async () => {
  registerConnectionListeners();

  try {
    await mongoose.connect(CONNECTION_STRING, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
      retryWrites: true
    });
  } catch (err) {
    logger.error({ error: err.message }, 'No se pudo conectar a MongoDB al iniciar la app');
    throw err;
  }
};
