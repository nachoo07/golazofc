import Motion from '../../models/motion/motion.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
const logger = pino();

export const createMotion = async (req, res) => {
  const { concept, date, amount, paymentMethod, incomeType } = sanitize(req.body);

  try {
    const newMotion = new Motion({
      concept,
      date: new Date(date),
      amount,
      paymentMethod,
      incomeType,
      createdBy: req.user.userId
    });
    await newMotion.save();
    logger.info({ motionId: newMotion._id }, 'Movimiento creado');
    res.status(201).json(newMotion);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear movimiento');
    res.status(500).json({ message: 'Error al crear movimiento' });
  }
};

export const getMotions = async (req, res) => {
  try {
    const motions = await Motion.find()
      .select('concept date amount paymentMethod incomeType')
      .lean();
    res.status(200).json(motions.length ? motions : { message: "No hay movimientos disponibles" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener movimientos');
    res.status(500).json({ message: 'Error al obtener movimientos' });
  }
};

export const updateMotion = async (req, res) => {
  const { id } = sanitize(req.params);
  const updates = sanitize(req.body);

  try {
    const updatedMotion = await Motion.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!updatedMotion) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }
    logger.info({ motionId: id }, 'Movimiento actualizado');
    res.status(200).json(updatedMotion);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar movimiento');
    res.status(500).json({ message: 'Error al actualizar movimiento' });
  }
};

export const deleteMotion = async (req, res) => {
  const { id } = sanitize(req.params);

  try {
    const deletedMotion = await Motion.findByIdAndDelete(id);
    if (!deletedMotion) {
      return res.status(404).json({ message: 'Movimiento no encontrado' });
    }
    logger.info({ motionId: id }, 'Movimiento eliminado');
    res.status(200).json({ message: 'Movimiento eliminado exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar movimiento');
    res.status(500).json({ message: 'Error al eliminar movimiento' });
  }
};

// Obtener movimientos por fecha
export const getMotionsByDate = async (req, res) => {
  const { date } = sanitize(req.params);

  try {
    const startDate = new Date(date);
    if (isNaN(startDate)) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const motions = await Motion.find({
      date: { $gte: startDate, $lt: endDate }
    }).select('paymentMethod date amount incomeType').lean();

    res.status(200).json(motions.length ? motions : { message: "No hay movimientos disponibles para esta fecha" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener movimientos por fecha');
    res.status(500).json({ message: 'Error al obtener movimientos' });
  }
};

export const getMotionsByDateRange = async (req, res) => {
  const { startDate, endDate } = sanitize(req.query);

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Fechas inválidas' });
    }
    end.setDate(end.getDate() + 1);

    const motions = await Motion.find({
      date: { $gte: start, $lt: end }
    }).select('paymentMethod date amount incomeType').lean();

    res.status(200).json(motions.length ? motions : { message: "No hay movimientos disponibles para este rango de fechas" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener movimientos por rango de fechas');
    res.status(500).json({ message: 'Error al obtener movimientos' });
  }
};