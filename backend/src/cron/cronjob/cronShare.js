import cron from 'node-cron';
import { createPendingShares, notifyCreatedShares } from '../../logic/share.logic.js';
import { updateShares } from '../share/sharesCron.js';
import pino from 'pino';

const logger = pino();

// Cron job para crear cuotas pendientes el primer día laborable (lunes-viernes) de cada mes a las 08:30
// Expresión: '30 8 1-3 * 1-5'
// - Se ejecuta entre el 1-3 del mes, pero solo de lunes a viernes
// - Si el 1 es fin de semana, se ejecuta automáticamente el primer lunes
cron.schedule('30 8 1-3 * 1-5', async () => {
  logger.info('Ejecutando cron job para crear cuotas pendientes (primer día laborable del mes)...');
  try {
    const createdShares = await createPendingShares();
    await notifyCreatedShares(createdShares);
    logger.info({ createdCount: createdShares.length }, 'Cuotas creadas y notificaciones procesadas');
  } catch (error) {
    logger.error({ error: error.message }, 'Error al ejecutar el cron job de creación de cuotas');
  }
}, {
  timezone: 'America/Argentina/Tucuman'
});

// Cron job para actualizar montos y estados de cuotas una vez por mes, después del día 10
// Expresión: '30 8 11 * *'
// - Se ejecuta el día 11 de cada mes a las 08:30
// - No depende del día de la semana
cron.schedule('30 8 * * *', async () => {
  logger.info('Ejecutando cron job diario para actualizar montos y estados de cuotas...');
  try {
    await updateShares();
    logger.info('Montos y estados de cuotas actualizados correctamente');
  } catch (error) {
    logger.error({ error: error.message }, 'Error al ejecutar el cron job de actualización');
  }
}, {
  timezone: 'America/Argentina/Tucuman'
});

logger.info('✅ Cron jobs activados: creación en primer día laborable y actualización diaria a las 08:30');
