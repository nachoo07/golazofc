import Attendance from "../../models/attendance/attendance.model.js";
import sanitize from 'mongo-sanitize';
import pino from 'pino';
const logger = pino();

// Obtener todas las asistencias
export const getAllAttendances = async (req, res) => {
  try {
    const attendances = await Attendance.find()
      .select('date category attendance.idStudent attendance.name attendance.lastName attendance.present')
      .lean();
    res.status(200).json(attendances); // Siempre devuelve un arreglo, incluso si está vacío
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener asistencias');
    res.status(500).json({ message: 'Error al obtener asistencias' });
  }
};

// Registrar asistencias para una categoría en una fecha
export const createAttendance = async (req, res) => {
  const { date, category, attendance } = sanitize(req.body);

  if (!date || !category || !attendance || !Array.isArray(attendance) || attendance.length === 0) {
    return res.status(400).json({ message: "Faltan campos requeridos o la lista de asistencia está vacía" });
  }
  try {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate)) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    let existingAttendance = await Attendance.findOne({ date: attendanceDate, category });
    if (existingAttendance) {
      existingAttendance.attendance = attendance;
      await existingAttendance.save();
      logger.info({ date, category }, 'Asistencia actualizada');
      return res.status(200).json({ message: "Asistencia actualizada exitosamente", attendance: existingAttendance });
    }

    const newAttendance = new Attendance({ date: attendanceDate, category, attendance });
    await newAttendance.save();
    logger.info({ date, category }, 'Asistencia creada');
    res.status(201).json({ message: "Asistencia registrada exitosamente", attendance: newAttendance });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear asistencia');
    res.status(500).json({ message: 'Error al registrar asistencia' });
  }
};

// Actualizar una asistencia específica dentro de una categoría y fecha
export const updateAttendance = async (req, res) => {
  const { date, category, attendance } = sanitize(req.body);

  if (!date || !category || !attendance || !Array.isArray(attendance)) {
    return res.status(400).json({ message: "Faltan campos requeridos" });
  }

  try {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate)) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    const startOfDay = new Date(attendanceDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(attendanceDate);
    endOfDay.setHours(23, 59, 59, 999);

    const updatedAttendance = await Attendance.findOneAndUpdate(
      { date: { $gte: startOfDay, $lte: endOfDay }, category },
      { $set: { attendance } },
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(404).json({ message: "Asistencia no encontrada" });
    }

    logger.info({ date, category }, 'Asistencia actualizada');
    res.status(200).json({ message: "Asistencia actualizada exitosamente", attendance: updatedAttendance });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar asistencia');
    res.status(500).json({ message: 'Error al actualizar asistencia' });
  }
};

// Eliminar una asistencia completa por fecha y categoría
export const deleteAttendance = async (req, res) => {
  const { date, category } = sanitize(req.query);

  if (!date || !category) {
    return res.status(400).json({ message: "Faltan fecha o categoría" });
  }

  try {
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate)) {
      return res.status(400).json({ message: "Fecha inválida" });
    }

    const attendance = await Attendance.findOneAndDelete({ date: attendanceDate, category });
    if (!attendance) {
      return res.status(404).json({ message: "No se encontró el registro de asistencia" });
    }

    logger.info({ date, category }, 'Asistencia eliminada');
    res.status(200).json({ message: "Asistencia eliminada exitosamente" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al eliminar asistencia');
    res.status(500).json({ message: 'Error al eliminar asistencia' });
  }
};