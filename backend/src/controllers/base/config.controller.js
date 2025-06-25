import Config from '../../models/base/config.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
const logger = pino();

// Lista blanca de claves permitidas
const allowedKeys = ['cuotaBase', 'maxStudents', 'defaultCategory'];

// Obtener una configuración por clave
export const getConfig = async (req, res) => {
  const key = sanitize(req.params.key);

  if (!allowedKeys.includes(key)) {
    return res.status(400).json({ message: 'Clave no permitida' });
  }

  try {
    const config = await Config.findOne({ key }).lean();
    if (!config) {
      return res.status(404).json({ message: 'Configuración no encontrada' });
    }
    res.status(200).json(config);
  } catch (error) {
    logger.error({ error: error.message, key }, 'Error al obtener configuración');
    res.status(500).json({ message: 'Error al obtener configuración' });
  }
};

export const setConfig = async (req, res) => {
  const { key, value } = sanitize(req.body);

  if (!allowedKeys.includes(key)) {
    return res.status(400).json({ message: 'Clave no permitida' });
  }

  if (key === 'cuotaBase' && (typeof value !== 'number' || value <= 0)) {
    return res.status(400).json({ message: 'El valor para cuotaBase debe ser un número positivo' });
  }

  try {
    const config = await Config.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true }
    );
    logger.info({ key, value }, 'Configuración actualizada');
    res.status(200).json({ message: 'Configuración actualizada exitosamente', config });
  } catch (error) {
    logger.error({ error: error.message, key }, 'Error al actualizar configuración');
    res.status(500).json({ message: 'Error al actualizar configuración' });
  }
};