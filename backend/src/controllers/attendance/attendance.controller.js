import Attendance from "../../models/attendance/attendance.model.js";
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { validationResult } from 'express-validator';
import { isInvalidDate, sendBadRequest, sendInternalServerError, sendNotFound } from "../_shared/controller.utils.js";
const logger = pino();

const normalizeAttendanceDay = (value) => {
  const parsedDate = new Date(value);
  if (isInvalidDate(parsedDate)) return null;
  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
};

const getAttendanceDayRange = (value) => {
  const start = normalizeAttendanceDay(value);
  if (!start) return null;

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

// Obtener todas las asistencias
export const getAllAttendances = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const attendances = await Attendance.find()
      .select('date category attendance')
      .sort({ date: -1 })
      .lean();
    res.status(200).json(attendances); // Siempre devuelve un arreglo, incluso si está vacío
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener asistencias');
    return sendInternalServerError(res, 'Error al obtener asistencias');
  }
};

export const getAttendanceByStudentId = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = req.params;

  try {
    const attendances = await Attendance.find({
      "attendance.idStudent": id
    })
      .select('date category attendance.$') // Solo devuelve la entrada de asistencia que coincide con el idStudent
      .lean();

    const history = attendances.map(record => {
      const studentRecord = record.attendance[0];
      return {
        _id: record._id,
        date: record.date,
        category: record.category,
        present: studentRecord ? studentRecord.present : null // Si no se encuentra el registro del estudiante, devuelve null
      };
    });

    res.status(200).json(history);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener historial de asistencias por ID de estudiante');
    return sendInternalServerError(res, 'Error al obtener historial de asistencias');
  };
}

// Registrar asistencias para una categoría en una fecha
export const createAttendance = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { date, category, attendance } = sanitize(req.body);

  if (!date || !category || !attendance || !Array.isArray(attendance) || attendance.length === 0) {
    return sendBadRequest(res, "Faltan campos requeridos o la lista de asistencia está vacía");
  }

  try {
    const attendanceDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (isInvalidDate(attendanceDate)) {
      return sendBadRequest(res, "Fecha inválida");
    }
    if (attendanceDate > today) {
      return sendBadRequest(res, "No se pueden registrar asistencias para fechas futuras");
    }

    const dayRange = getAttendanceDayRange(attendanceDate);
    const normalizedDate = dayRange?.start;

    const filter = {
      date: { $gte: dayRange.start, $lte: dayRange.end },
      category
    };

    const update = {
      $set: {
        date: normalizedDate,
        category,
        attendance
      }
    };

    const existedBefore = await Attendance.exists(filter);

    const attendanceDoc = await Attendance.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    });

    const wasCreated = !existedBefore;

    logger.info({ date, category, wasCreated }, wasCreated ? 'Nueva asistencia creada' : 'Asistencia actualizada (upsert)');

    return res.status(wasCreated ? 201 : 200).json({
      message: wasCreated ? "Asistencia registrada exitosamente" : "Asistencia actualizada exitosamente",
      attendance: attendanceDoc
    });

  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear o actualizar asistencia');
    if (error.code === 11000) {
      return sendBadRequest(res, 'Ya existe un registro de asistencia para esta fecha y categoría');
    }
    return sendInternalServerError(res, 'Error al registrar asistencia');
  }
};

// Actualizar una asistencia específica dentro de una categoría y fecha
export const updateAttendance = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { date, category, attendance } = sanitize(req.body);

  if (!date || !category || !Array.isArray(attendance)) {
    return sendBadRequest(res, "Faltan campos requeridos o la lista de asistencia no es válida");
  }

  try {
    const dayRange = getAttendanceDayRange(date);
    if (!dayRange) {
      return sendBadRequest(res, "Fecha inválida");
    }
    const updatedAttendance = await Attendance.findOneAndUpdate(
      { date: { $gte: dayRange.start, $lte: dayRange.end }, category },
      { $set: { attendance, date: dayRange.start } },
      { new: true, runValidators: true }
    );

    if (!updatedAttendance) {
      return sendNotFound(res, "Asistencia no encontrada para la fecha y categoría especificadas");
    }

    logger.info({ date, category }, 'Asistencia actualizada');
    res.status(200).json({ message: "Asistencia actualizada exitosamente", attendance: updatedAttendance });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar asistencia');
    return sendInternalServerError(res, 'Error al actualizar asistencia');
  }
};
