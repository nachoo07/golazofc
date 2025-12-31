import cron from "node-cron";
import { createPendingShares } from "../../logic/share.logic.js";
import { updateShares } from "../../cron/share/sharesCron.js";
import pino from "pino";

const logger = pino();

// Cron job para crear cuotas pendientes el 1º de cada mes a las 00:00 UTC-3
/*cron.schedule('30 8 1 * *', async () => {
  logger.info('Ejecutando cron job para crear cuotas pendientes...');
  try {
    await createPendingShares();
    logger.info('Cuotas creadas correctamente');
  } catch (error) {
    logger.error({ error: error.message }, 'Error al ejecutar el cron job');
  }
}, {
  timezone: 'America/Argentina/Tucuman'
});

// Cron job diario para actualizar montos y estados a las 00:00 UTC-3
cron.schedule('0 1 * * *', async () => {
  logger.info('Ejecutando cron job para actualizar montos y estados de cuotas...');
  try {
    await updateShares();
    logger.info('Montos y estados de cuotas actualizados correctamente');
  } catch (error) {
    logger.error({ error: error.message }, 'Error al ejecutar el cron job de actualización');
  }
}, {
  timezone: 'America/Argentina/Tucuman'
});*/

logger.info('Cron jobs configurados para cuotas (ACTUALMENTE DESACTIVADOS)');

