
import Student from '../../models/student/student.model.js';
import Share from '../../models/share/share.model.js';
import Attendance from '../../models/attendance/attendance.model.js';
import mongoose from 'mongoose';
import multer from 'multer';
import cloudinary from 'cloudinary';
import sanitize from 'mongo-sanitize';
import pino from 'pino';
import xlsx from 'xlsx';
import pLimit from 'p-limit';
import { parse, isValid, format } from 'date-fns';
import axios from 'axios';
import { Parser } from 'json2csv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino/file',
    options: { destination: path.join(logDir, 'import.log') },
  },
});

const cloudinaryV2 = cloudinary.v2;

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

const normalizeDate = (dateInput) => {
  if (!dateInput) {
    logger.warn('Fecha de nacimiento vacía');
    return '';
  }
  const dateStr = String(dateInput).trim();
  let parsedDate;
  const formats = [
    'dd/MM/yyyy', 'd/MM/yyyy', 'dd/M/yyyy', 'd/M/yyyy',
    'dd-MM-yyyy', 'd-MM-yyyy', 'dd-M-yyyy', 'd-M-yyyy',
    'yyyy-MM-dd', 'dd/MM/yy', 'd/MM/yy', 'dd/M/yy', 'd/M/yy',
    'MM/dd/yyyy', 'M/d/yyyy', 'MM/d/yyyy', 'M/dd/yyyy', 'MM/dd/yy', 'M/d/yy',
  ];
  for (const fmt of formats) {
    parsedDate = parse(dateStr, fmt, new Date());
    if (isValid(parsedDate)) {
      const year = parsedDate.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year >= 1900 && year <= currentYear + 1) {
        logger.info(`Fecha parseada: ${dateStr} como ${fmt} -> ${format(parsedDate, 'yyyy-MM-dd')}`);
        break;
      }
    }
  }
  if (!isValid(parsedDate)) {
    logger.warn(`Fecha inválida: ${dateStr}`);
    return '';
  }
  return format(parsedDate, 'yyyy-MM-dd');
};
const createUTCDate = (dateStr) => {
  if (!dateStr) return null;
  // Validar formato yyyy-MM-dd
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    logger.warn(`Formato de fecha inválido: ${dateStr}`);
    return null;
  }
  // Crear fecha en UTC directamente desde yyyy-MM-dd
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (!isValid(utcDate)) {
    logger.warn(`Fecha UTC inválida: ${dateStr}`);
    return null;
  }
  return utcDate;
};

const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const downloadImage = async (url) => {
  try {
    if (url.includes('drive.google.com')) {
      const fileId = url.match(/[-\w]{25,}/);
      if (!fileId) throw new Error('URL de Google Drive inválida');
      url = `https://drive.google.com/uc?export=download&id=${fileId[0]}`;
    }
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 5000,
    });
    const mimeType = response.headers['content-type'];
    if (!['image/jpeg', 'image/png'].includes(mimeType)) {
      throw new Error('Formato de imagen no válido');
    }
    return { buffer: Buffer.from(response.data), mimetype: mimeType };
  } catch (error) {
    logger.error(`Error al descargar imagen: ${error.message}`);
    throw error;
  }
};

const uploadToCloudinary = async (file, folder, publicId) => {
  try {
    const result = await cloudinaryV2.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      { folder, public_id: publicId, resource_type: 'image', overwrite: true }
    );
    return result.secure_url;
  } catch (error) {
    logger.error(`Error al subir imagen a Cloudinary: ${error.message}`);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }
};

const extractPublicId = (url) => {
  try {
    if (!url || typeof url !== 'string') return '';
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    const publicId = `students/${fileName.split('.')[0]}`; // Ejemplo: 'students/student_12345678'
    return publicId;
  } catch (error) {
    logger.error(`Error al extraer el ID público de la URL: ${error.message}`);
    return '';
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().lean();
    res.status(200).json(students.length ? students : { message: "No hay estudiantes disponibles" });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener estudiantes');
    res.status(500).json({ message: 'Error al obtener estudiantes' });
  }
};

export const createStudent = async (req, res) => {
  try {
    const {
      name, lastName, dni, birthDate, address, guardianName, guardianPhone,
      category, mail, state, hasSiblingDiscount, profileImage,
    } = sanitize(req.body);

    let finalProfileImage = profileImage || 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    if (req.file) {
      try {
        finalProfileImage = await uploadToCloudinary(
          { buffer: req.file.buffer, mimetype: req.file.mimetype },
          'students',
          `student_${dni}`
        );
        logger.info(`Imagen subida a Cloudinary para estudiante con DNI ${dni}: ${finalProfileImage}`);
      } catch (error) {
        logger.error(`Error al subir imagen para estudiante con DNI ${dni}: ${error.message}`);
        return res.status(400).json({ error: `Error al procesar imagen: ${error.message}` });
      }
    } else if (profileImage) {
      try {
        new URL(profileImage);
        const { buffer, mimetype } = await downloadImage(profileImage);
        finalProfileImage = await uploadToCloudinary(
          { buffer, mimetype },
          'students',
          `student_${dni}`
        );
        logger.info(`Imagen subida a Cloudinary para estudiante con DNI ${dni}: ${finalProfileImage}`);
      } catch (error) {
        logger.error(`Error al procesar imagen para estudiante con DNI ${dni}: ${error.message}`);
        return res.status(400).json({ error: `Error al procesar imagen: ${error.message}` });
      }
    }

    if (!name || !lastName || !dni || !birthDate || !address || !category ) {
      const missingFields = [];
      if (!name) missingFields.push('Nombre');
      if (!lastName) missingFields.push('Apellido');
      if (!dni) missingFields.push('DNI');
      if (!birthDate) missingFields.push('Fecha de Nacimiento');
      if (!address) missingFields.push('Dirección');
      if (!category) missingFields.push('Categoría');
      return res.status(400).json({ error: `Faltan datos obligatorios: ${missingFields.join(', ')}` });
    }

    if (!/^\d{8,10}$/.test(dni)) {
      return res.status(400).json({ error: 'DNI debe contener entre 8 y 15 dígitos' });
    }

    const normalizedDate = normalizeDate(birthDate);
    if (!normalizedDate) {
      return res.status(400).json({ error: 'Formato de fecha de nacimiento inválido' });
    }

    const newStudent = new Student({
      name,
      lastName,
      dni,
      birthDate: createUTCDate(normalizedDate),
      address,
      guardianName,
      guardianPhone,
      category,
      mail,
      state: state || 'Activo',
      profileImage: finalProfileImage,
      hasSiblingDiscount,
    });

    const savedStudent = await newStudent.save();

    logger.info({ studentId: savedStudent._id }, 'Estudiante creado con éxito');
    res.status(201).json({ message: 'Estudiante creado exitosamente', student: savedStudent });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al crear estudiante');
    res.status(500).json({ error: 'Error al crear estudiante' });
  }

};

export const deleteStudent = async (req, res) => {
  const { id } = sanitize(req.params);
  try {
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    if (student.profileImage && student.profileImage !== 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg') {
      try {
        const publicId = extractPublicId(student.profileImage);
        if (publicId) {
          await cloudinaryV2.uploader.destroy(publicId);
          logger.info(`Imagen eliminada de Cloudinary para estudiante con ID ${id}: ${publicId}`);
        }
      } catch (error) {
        logger.error(`Error al eliminar imagen de Cloudinary para estudiante con ID ${id}: ${error.message}`);
      }
    }

    await Share.deleteMany({ student: id });
    await Attendance.updateMany(
      { 'attendance.studentId': id },
      { $pull: { attendance: { studentId: id } } }
    );
    await Attendance.deleteMany({ attendance: [] });
    await Student.findByIdAndDelete(id);
    logger.info({ studentId: id }, 'Estudiante eliminado');
    res.status(200).json({ message: 'Estudiante eliminado exitosamente' });
  } catch (error) {
    logger.error('Error al eliminar estudiante:', error);
    res.status(500).json({ message: 'Error al eliminar estudiante', error: error.message });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const { id } = sanitize(req.params);
    const {
      name, lastName, dni, birthDate, address, guardianName, guardianPhone,
      category, mail, state, hasSiblingDiscount, profileImage,
    } = sanitize(req.body);

    if (!name || !lastName || !dni || !address || !category ) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (!/^\d{8,10}$/.test(dni)) {
      return res.status(400).json({ error: 'El DNI debe contener entre 8 y 15 dígitos' });
    }

    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    let finalProfileImage = existingStudent.profileImage || 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    if (req.file || (profileImage && profileImage !== existingStudent.profileImage)) {
      try {
        if (existingStudent.profileImage && existingStudent.profileImage !== 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg') {
          const publicId = extractPublicId(existingStudent.profileImage);
          if (publicId) {
            await cloudinaryV2.uploader.destroy(publicId);
            logger.info(`Imagen antigua eliminada de Cloudinary para ID ${id}: ${publicId}`);
          }
        }

        if (req.file) {
          finalProfileImage = await uploadToCloudinary(
            { buffer: req.file.buffer, mimetype: req.file.mimetype },
            'students',
            `student_${dni}`
          );
          logger.info(`Nueva imagen subida desde archivo para ID ${id}: ${finalProfileImage}`);
        } else if (profileImage) {
          try {
            new URL(profileImage);
            const { buffer, mimetype } = await downloadImage(profileImage);
            finalProfileImage = await uploadToCloudinary(
              { buffer, mimetype },
              'students',
              `student_${dni}`
            );
            logger.info(`Nueva imagen subida desde URL para ID ${id}: ${finalProfileImage}`);
          } catch (error) {
            logger.error(`Error al procesar imagen URL para DNI ${dni}: ${error.message}`);
            return res.status(400).json({ error: `Error al procesar imagen: ${error.message}` });
          }
        }
      } catch (error) {
        logger.error(`Error al procesar imagen para ID ${id}: ${error.message}`);
        return res.status(400).json({ error: `Error al procesar imagen: ${error.message}` });
      }
    }

    const updates = {
      name,
      lastName,
      dni,
      address,
      guardianName,
      guardianPhone,
      category,
      mail,
      state,
      profileImage: finalProfileImage,
      hasSiblingDiscount,
    };

    if (birthDate && birthDate !== format(existingStudent.birthDate, 'yyyy-MM-dd')) {
      const normalizedDate = normalizeDate(birthDate);
      if (!normalizedDate) {
        return res.status(400).json({ error: 'Formato de fecha de nacimiento inválido' });
      }
      updates.birthDate = createUTCDate(normalizedDate);
    }

    const student = await Student.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();

    logger.info({ studentId: id }, 'Estudiante actualizado con éxito');
    res.status(200).json({ message: 'Estudiante actualizado exitosamente', student });
  } catch (error) {
    logger.error({ error: error.message }, 'Error al actualizar estudiante');
    res.status(500).json({ error: 'Error al actualizar estudiante' });
  }
};

export const getStudentById = async (req, res) => {
  const { id } = sanitize(req.params);

  try {
    const student = await Student.findById(id).lean();
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    res.status(200).json(student);
  } catch (error) {
    logger.error({ error: error.message }, 'Error al obtener estudiante');
    res.status(500).json({ message: 'Error al obtener estudiante' });
  }
};

export const generateCloudinarySignature = async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Falta la configuración de Cloudinary');
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: 'students' },
      process.env.CLOUDINARY_API_SECRET
    );
    res.status(200).json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error al generar la firma de Cloudinary');
    res.status(500).json({ message: 'Error al generar la firma de Cloudinary', error: error.message });
  }
};

export const importStudents = async (req, res) => {
  try {
    const { students } = sanitize(req.body);

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar una lista de estudiantes válida', success: false });
    }

    const errors = [];
    const importedStudents = [];
    const limit = pLimit(5);

    const processStudent = async (studentData) => {
      const {
        name, lastName, dni, birthDate, address, guardianName, guardianPhone,
        category, mail, state, hasSiblingDiscount, profileImage, rowNumber,
      } = sanitize(studentData);

      const row = rowNumber || 'Desconocida';

      // Validaciones iniciales
      if (!name || !lastName || !dni || !birthDate || !address || !category ) {
        errors.push(`Fila ${row}, DNI ${dni || 'desconocido'}: Faltan campos obligatorios`);
        return;
      }

      if (!/^\d{8,10}$/.test(dni)) {
        errors.push(`Fila ${row}, DNI ${dni}: DNI debe contener 8 a 10 dígitos`);
        return;
      }

      const normalizedDate = normalizeDate(birthDate);
      if (!normalizedDate) {
        errors.push(`Fila ${row}, DNI ${dni}: Formato de fecha de nacimiento inválido`);
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
          hasSiblingDiscount,
        });

        const savedStudent = await newStudent.save();
        importedStudents.push(savedStudent);
      } catch (error) {
        errors.push(`Fila ${row}, DNI ${dni}: ${error.message}`);
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
