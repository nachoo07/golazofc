import mongoose from 'mongoose';
import { CONNECTION_STRING } from '../config/config.js';
import pino from 'pino';
const logger = pino();

mongoose.connect(CONNECTION_STRING, {
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10,
  retryWrites: true
});

mongoose.connection.on('connected', () => {
  logger.info('Conectado a la base de datos MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error({ error: err.message }, 'Error en la conexión a MongoDB');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Desconectado de MongoDB, intentando reconectar...');
});