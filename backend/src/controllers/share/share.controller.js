import Share from '../../models/share/share.model.js';
import Student from '../../models/student/student.model.js';
import Config from '../../models/base/config.model.js';
import { calculateShareAmount } from '../../cron/share/sharesCron.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { DateTime } from 'luxon';

const logger = pino();

export const getAllShares = async (req, res) => {
  try {
    const shares = await Share.find()
      .populate({ path: 'student', select: 'name lastName' })
      .lean();
    res.status(200).json(shares.length ? shares : { message: "No hay cuotas disponibles" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas');
    res.status(500).json({ message: 'Error al obtener cuotas' });
  }
};

export const getSharesStatusCount = async (req, res) => {
  try {
    logger.info('Iniciando getSharesStatusCount'); // Log para confirmar que se llama el endpoint
    const counts = await Share.aggregate([
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state: '$_id',
          count: 1,
        },
      },
    ]);

    const result = {
      pendientes: 0,
      vencidas: 0,
      pagadas: 0,
    };

    counts.forEach((item) => {
      if (item.state === 'Pendiente') result.pendientes = item.count;
      if (item.state === 'Vencido') result.vencidas = item.count;
      if (item.state === 'Pagado') result.pagadas = item.count;
    });

    logger.info({ counts: result }, 'Conteo de cuotas exitoso');
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al obtener conteos de cuotas');
    res.status(500).json({ message: 'Error al obtener conteos de cuotas' });
  }
};

// Resto del código sin cambios
export const createShare = async (req, res) => {
  const { student, date, amount, paymentmethod, paymentdate } = sanitize(req.body);

  if (!student || !date || amount == null) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  try {
    const shareDate = new Date(date);
    if (isNaN(shareDate)) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    const cuotaState = paymentdate ? 'Pagado' : 'Pendiente';
    const newShare = new Share({
      student,
      date: shareDate,
      amount,
      paymentmethod,
      paymentdate: paymentdate ? new Date(paymentdate) : null,
      state: cuotaState,
      updatedBy: req.user.userId
    });
    await newShare.save();
    logger.info({ shareId: newShare._id }, 'Cuota creada');
    res.status(201).json({ message: "Cuota creada exitosamente", share: newShare });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear cuota');
    res.status(500).json({ message: 'Error al crear cuota' });
  }
};

export const deleteShare = async (req, res) => {
  const { id } = sanitize(req.params);

  try {
    const share = await Share.findByIdAndDelete(id);
    if (!share) {
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }
    logger.info({ shareId: id }, 'Cuota eliminada');
    res.status(200).json({ message: 'Cuota eliminada exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar cuota');
    res.status(500).json({ message: 'Error al eliminar cuota' });
  }
};

export const updateShare = async (req, res) => {
  const { id } = sanitize(req.params);
  const { amount, paymentdate, paymentmethod, state } = sanitize(req.body);

  try {
    const share = await Share.findById(id);
    if (!share) {
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }

    if (amount != null) {
      if (parseFloat(amount) < 0) {
        return res.status(400).json({ message: 'El monto no puede ser negativo' });
      }
      share.amount = parseFloat(amount);
    }

    if (paymentdate) {
      const paymentDate = new Date(paymentdate);
      if (isNaN(paymentDate)) {
        return res.status(400).json({ message: 'Fecha de pago inválida' });
      }
      share.paymentdate = paymentDate;
    }

    if (paymentmethod) {
      share.paymentmethod = paymentmethod;
    }

    share.state = paymentdate && paymentmethod ? 'Pagado' : share.state;

    share.updatedBy = req.user.userId;

    await share.save();
    logger.info({ shareId: id }, 'Cuota actualizada');
    res.status(200).json({ message: 'Cuota actualizada exitosamente', share });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar cuota');
    res.status(500).json({ message: 'Error al actualizar cuota' });
  }
};

export const getShareById = async (req, res) => {
  const { id } = sanitize(req.params);

  try {
    logger.info({ id }, 'Intentando obtener cuota por ID'); // Log para depuración
    const share = await Share.findById(id)
      .populate({ path: 'student', select: 'name lastName' })
      .lean();
    if (!share) {
      return res.status(404).json({ message: 'Cuota no encontrada' });
    }
    res.status(200).json(share);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al obtener cuota');
    res.status(500).json({ message: 'Error al obtener cuota' });
  }
};

export const getSharesByStudent = async (req, res) => {
  const { studentId } = sanitize(req.params);

  try {
    const shares = await Share.find({ student: studentId })
      .populate({ path: 'student', select: 'name lastName' })
      .lean();
    res.status(200).json(shares.length ? shares : { message: "No hay cuotas disponibles para este estudiante" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas por estudiante');
    res.status(500).json({ message: 'Error al obtener cuotas' });
  }
};

export const getSharesByDate = async (req, res) => {
  const { date } = sanitize(req.params);

  try {
    const startDate = new Date(date);
    if (isNaN(startDate)) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const shares = await Share.find({
      paymentdate: { $gte: startDate, $lt: endDate }
    }).populate({ path: 'student', select: 'name lastName' }).lean();

    res.status(200).json(shares.length ? shares : { message: "No hay cuotas disponibles para esta fecha" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas por fecha');
    res.status(500).json({ message: 'Error al obtener cuotas' });
  }
};

export const getSharesByDateRange = async (req, res) => {
  const { startDate, endDate } = sanitize(req.query);

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Fechas inválidas' });
    }
    end.setDate(end.getDate() + 1);

    const shares = await Share.find({
      paymentdate: { $gte: start, $lt: end }
    }).populate({ path: 'student', select: 'name lastName' }).lean();

    res.status(200).json(shares.length ? shares : { message: "No hay cuotas disponibles para este rango de fechas" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener cuotas por rango de fechas');
    res.status(500).json({ message: 'Error al obtener cuotas' });
  }
};

export const getStudentsWithShareStatus = async (req, res) => {
  try {
    const students = await Student.aggregate([
      {
        $lookup: {
          from: "shares",
          localField: "_id",
          foreignField: "student",
          as: "shares"
        }
      },
      {
        $project: {
          name: 1,
          lastName: 1,
          status: {
            $cond: [
              { $anyElementTrue: { $map: { input: "$shares", in: { $eq: ["$$this.state", "Vencido"] } } } },
              "Vencido",
              {
                $cond: [
                  { $anyElementTrue: { $map: { input: "$shares", in: { $eq: ["$$this.state", "Pendiente"] } } } },
                  "Pendiente",
                  {
                    $cond: [
                      { $anyElementTrue: { $map: { input: "$shares", in: { $eq: ["$$this.state", "Pagado"] } } } },
                      "Pagado",
                      "Sin cuotas"
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ]);
    res.status(200).json(students);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener estados de cuotas');
    res.status(500).json({ message: 'Error al obtener estados de cuotas' });
  }
};

export const updatePendingShares = async (req, res) => {
  try {
    const config = await Config.findOne({ key: 'cuotaBase' });
    const cuotaBase = config ? config.value : 30000;
    const currentDate = DateTime.now().setZone('America/Argentina/Tucuman');
    const currentDay = currentDate.day;

    if (currentDay > 10) {
      return res.status(400).json({ message: 'No se puede actualizar cuotas después del día 10' });
    }

    const startOfMonth = currentDate.startOf('month').toJSDate();
    const endOfMonth = currentDate.endOf('month').toJSDate();

    const shares = await Share.find({
      state: 'Pendiente',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const studentIds = [...new Set(shares.map(s => s.student))];
    const students = await Student.find({ _id: { $in: studentIds } }).lean();

    const bulkOps = shares.map(share => {
      const student = students.find(s => s._id.equals(share.student));
      const baseAmount = student && student.hasSiblingDiscount ? cuotaBase * 0.9 : cuotaBase;
      const { amount, state } = calculateShareAmount(baseAmount, currentDay, share.date);

      return {
        updateOne: {
          filter: { _id: share._id },
          update: { amount: Math.round(amount), state, updatedBy: req.user.userId }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Share.bulkWrite(bulkOps);
      logger.info({ updatedCount: bulkOps.length }, 'Cuotas pendientes actualizadas');
    }

    res.status(200).json({ message: 'Cuotas pendientes actualizadas exitosamente' });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar cuotas pendientes');
    res.status(500).json({ message: 'Error al actualizar cuotas pendientes' });
  }
};