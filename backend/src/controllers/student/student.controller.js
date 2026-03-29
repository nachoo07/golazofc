
import Student from '../../models/student/student.model.js';
import Share from '../../models/share/share.model.js';
import Attendance from '../../models/attendance/attendance.model.js';
import { Payment } from '../../models/payment/payment.model.js';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import { validationResult } from 'express-validator';
import pLimit from 'p-limit';
import { sendBadRequest, sendInternalServerError, sendNotFound } from '../_shared/controller.utils.js';
import {
  uploadToCloudinary,
  downloadImage,
  extractPublicId,
  deleteFromCloudinary,
  getCloudinarySignature
} from '../../utils/cloudinary/cloudinary.js';
import { validateStudentData, normalizeDate, createUTCDate } from '../../validators/student/student.validator.js';

const logger = pino({ level: 'info' });

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

export const getAllStudents = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const { state } = sanitize(req.query);
    const filters = {};
    if (state) {
      filters.state = state;
    }

    const students = await Student.find(filters).sort({ lastName: 1, name: 1 }).lean();
    res.status(200).json(students);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener estudiantes');
    return sendInternalServerError(res, 'Error al obtener estudiantes');
  }
};

export const getStudentById = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    const student = await Student.findById(id).lean();
    if (!student) return sendNotFound(res, 'Estudiante no encontrado');
    res.status(200).json(student);
  } catch (error) {
    return sendInternalServerError(res, 'Error al obtener estudiante');
  }
};

export const createStudent = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const body = sanitize(req.body);

    const dataError = validateStudentData(body);
    if (dataError) return sendBadRequest(res, dataError, { error: dataError });

    const normalizedBirthDate = normalizeDate(body.birthDate);
    const utcBirthDate = createUTCDate(normalizedBirthDate);
    if (!utcBirthDate) {
      return sendBadRequest(res, 'Fecha de nacimiento inválida');
    }

    const existingStudent = await Student.findOne({ dni: body.dni });
    if (existingStudent) {
      return sendBadRequest(res, 'El DNI ya está registrado', { error: 'El DNI ya está registrado' });
    }

    let finalProfileImage = body.profileImage || 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';

    if (req.file) {
      try {
        finalProfileImage = await uploadToCloudinary(
          { buffer: req.file.buffer, mimetype: req.file.mimetype },
          'students',
          `student_${body.dni}`
        );
      } catch (e) { return sendBadRequest(res, e.message, { error: e.message }); }
    } else if (body.profileImage && !body.profileImage.includes('pinimg')) {
      // Intento de descarga si es URL externa
      try {
        const { buffer, mimetype } = await downloadImage(body.profileImage);
        finalProfileImage = await uploadToCloudinary(
          { buffer, mimetype },
          'students',
          `student_${body.dni}`
        );

      } catch (e) { logger.warn('Usando URL original por fallo en descarga'); }
    }

    const newStudent = new Student({
      ...body,
      birthDate: utcBirthDate,
      state: body.state || 'Activo',
      profileImage: finalProfileImage,
      league: body.league || 'Sin especificar',
    });

    const savedStudent = await newStudent.save();

    logger.info({ studentId: savedStudent._id }, 'Estudiante creado con éxito');
    res.status(201).json({ message: 'Estudiante creado exitosamente', student: savedStudent });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al crear estudiante');
    return sendInternalServerError(res, 'Error al crear estudiante');
  }

};

export const deleteStudent = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);
  try {
    const student = await Student.findById(id);
    if (!student) return sendNotFound(res, 'Estudiante no encontrado');

    if (student.profileImage && !student.profileImage.includes('pinimg.com')) {
      const publicId = extractPublicId(student.profileImage);
      await deleteFromCloudinary(publicId);
    }

    await Share.deleteMany({ student: id });
    await Payment.deleteMany({ studentId: id });
    await Attendance.updateMany({}, { $pull: { attendance: { idStudent: id } } });
    await Attendance.deleteMany({ attendance: [] });
    await Student.findByIdAndDelete(id);
    res.status(200).json({ message: 'Estudiante eliminado exitosamente' });
  } catch (error) {
    return sendInternalServerError(res, 'Error al eliminar estudiante');
  }
};

export const updateStudent = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  try {
    const { id } = sanitize(req.params);
    const body = sanitize(req.body);

    const validationDataError = validateStudentData(body);
    if (validationDataError) {
      return sendBadRequest(res, validationDataError, { error: validationDataError });
    }

    const normalizedBirthDate = normalizeDate(body.birthDate);
    const utcBirthDate = createUTCDate(normalizedBirthDate);
    if (!utcBirthDate) {
      return sendBadRequest(res, 'Fecha de nacimiento inválida', { error: 'Fecha de nacimiento inválida' });
    }

    const existingStudent = await Student.findById(id);
    if (!existingStudent) return sendNotFound(res, 'Estudiante no encontrado', { error: 'Estudiante no encontrado' });

    const duplicateStudent = await Student.findOne({ dni: body.dni, _id: { $ne: id } });
    if (duplicateStudent) return sendBadRequest(res, 'El DNI ya está registrado en otro estudiante', { error: 'El DNI ya está registrado en otro estudiante' });

    // 2. Manejo de Imagen
    if (req.file || (body.profileImage && body.profileImage !== existingStudent.profileImage)) {
      // Borrar anterior
      if (existingStudent.profileImage && !existingStudent.profileImage.includes('pinimg.com')) {
        const publicId = extractPublicId(existingStudent.profileImage);
        await deleteFromCloudinary(publicId);
      }
      // Subir nueva
      if (req.file) {
        body.profileImage = await uploadToCloudinary({ buffer: req.file.buffer, mimetype: req.file.mimetype }, 'students', `student_${body.dni}`);
      } else if (body.profileImage) {
        try {
          const { buffer, mimetype } = await downloadImage(body.profileImage);
          body.profileImage = await uploadToCloudinary(
            { buffer, mimetype },
            'students',
            `student_${body.dni}`
          );
        } catch (e) { logger.warn('Fallo subida URL, manteniendo referencia'); }
      }
    }
    // Inicializar updates al inicio
    const updates = {
      ...body,
      league: body.league || 'Sin especificar',
      birthDate: utcBirthDate
    };

    // Actualizar estudiante
    const student = await Student.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true }).lean();
    res.status(200).json({ message: 'Estudiante actualizado exitosamente', student });

  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar estudiante');
    return sendInternalServerError(res, 'Error al actualizar estudiante');
  }
};

export const generateCloudinarySignature = async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Falta la configuración de Cloudinary');
    }
    res.status(200).json(getCloudinarySignature());
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al generar la firma de Cloudinary');
    res.status(500).json({ message: 'Error al generar la firma de Cloudinary', error: error.message });
  }
};

export const importStudents = async (req, res) => {
  try {
    const { students } = sanitize(req.body);

    if (!students || !Array.isArray(students) || students.length === 0) {
      logger.warn('Lista de estudiantes inválida o vacía');
      return res.status(400).json({ message: 'Debe proporcionar una lista de estudiantes válida', success: false });
    }

    const errors = [];
    const importedStudents = [];
    const limit = pLimit(5);

    const processStudent = async (studentData) => {
      const {
        name, lastName, dni, birthDate, address, guardianName, guardianPhone,
        category, mail, state, hasSiblingDiscount, profileImage, rowNumber
      } = sanitize(studentData);

      const row = rowNumber || 'Desconocida';

      // Validaciones iniciales
      const missingFields = [];
      if (!name) missingFields.push('Nombre');
      if (!lastName) missingFields.push('Apellido');
      if (!dni) missingFields.push('DNI');
      if (!birthDate) missingFields.push('Fecha de Nacimiento');
      if (!address) missingFields.push('Dirección');
      if (!category) missingFields.push('Categoría');
      if (missingFields.length > 0) {
        errors.push(`Fila ${row}, DNI ${dni || 'desconocido'}: Faltan campos obligatorios: ${missingFields.join(', ')}`);
        return;
      }

      if (!/^\d{7,9}$/.test(dni)) {
        errors.push(`Fila ${row}, DNI ${dni}: DNI debe contener 7 a 9 dígitos`);
        return;
      }

      const normalizedDate = normalizeDate(birthDate);
      if (!normalizedDate) {
        errors.push(`Fila ${row}, DNI ${dni}: Formato de fecha de nacimiento inválido`);
        return;
      }

      if (mail && !/\S+@\S+\.\S+/.test(mail)) {
        errors.push(`Fila ${row}, DNI ${dni}: Formato de correo electrónico no válido`);
        return;
      }

      if (guardianPhone && !/^\d{10,15}$/.test(guardianPhone)) {
        errors.push(`Fila ${row}, DNI ${dni}: El número de teléfono del tutor debe tener entre 10 y 15 dígitos`);
        return;
      }

      // Verificar si el DNI ya existe
      const existingStudent = await Student.findOne({ dni });
      if (existingStudent) {
        errors.push(`Fila ${row}, DNI ${dni}: DNI ya existe`);
        return;
      }

      // Solo si todas las validaciones pasan, procesar la imagen
      let finalProfileImage = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
      if (profileImage) {
        try {
          new URL(profileImage);
          logger.info(`Procesando imagen para DNI ${dni}, Fila ${row}: ${profileImage}`);
          const { buffer, mimetype } = await downloadImage(profileImage);
          finalProfileImage = await uploadToCloudinary(
            { buffer, mimetype },
            'students',
            `student_${dni}`
          );
          logger.info(`Imagen subida a Cloudinary para DNI ${dni}, Fila ${row}: ${finalProfileImage}`);
        } catch (error) {
          logger.error(`Error al procesar imagen para DNI ${dni}, Fila ${row}: ${error.message}`);
          errors.push(`Fila ${row}, DNI ${dni}: Error al procesar la imagen - ${error.message}`);
          return;
        }
      }

      try {
        const newStudent = new Student({
          name,
          lastName,
          dni,
          birthDate: new Date(normalizedDate),
          address,
          guardianName,
          guardianPhone,
          category,
          mail,
          state: state || 'Activo',
          profileImage: finalProfileImage,
          hasSiblingDiscount
        });

        const savedStudent = await newStudent.save();
        importedStudents.push(savedStudent);
      } catch (error) {
        if (error.name === 'ValidationError') {
          const errorMessages = Object.values(error.errors).map(err => err.message);
          errors.push(`Fila ${row}, DNI ${dni}: Errores de validación - ${errorMessages.join(', ')}`);
        } else if (error.code === 11000 && error.keyPattern.dni) {
          errors.push(`Fila ${row}, DNI ${dni}: DNI ya existe`);
        } else {
          errors.push(`Fila ${row}, DNI ${dni}: Error al guardar estudiante - ${error.message}`);
        }
      }
    };

    await Promise.all(students.map(student => limit(() => processStudent(student))));

    const importedCount = importedStudents.length;
    const success = importedCount > 0;

    logger.info({ importedCount, errors }, 'Importación de estudiantes procesada');

    if (success) {
      res.status(200).json({
        message: `Se importaron ${importedCount} estudiantes correctamente`,
        success: true,
        students: importedStudents,
        errors,
      });
    } else {
      res.status(400).json({
        message: 'No se importaron estudiantes debido a errores',
        success: false,
        errors,
      });
    }
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al importar estudiantes');
    res.status(500).json({ message: 'Error al importar estudiantes', error: error.message, success: false });
  }
};
