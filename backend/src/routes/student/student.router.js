import express from 'express';
import { body, param, query } from 'express-validator';
import { getAllStudents, createStudent, deleteStudent, updateStudent, getStudentById, importStudents, generateCloudinarySignature, } from '../../controllers/student/student.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const validateStudent = [
  body('name').notEmpty().withMessage('Nombre es obligatorio').isLength({ min: 2 }).withMessage('Nombre debe tener al menos 2 caracteres'),
  body('lastName').notEmpty().withMessage('Apellido es obligatorio').isLength({ min: 2 }).withMessage('Apellido debe tener al menos 2 caracteres'),
  body('dni').matches(/^\d{7,9}$/).withMessage('DNI debe tener entre 7 y 9 dígitos'),
  body('birthDate').notEmpty().withMessage('Fecha de nacimiento válida es obligatoria'),
  body('address').notEmpty().withMessage('Dirección es obligatoria').isLength({ min: 5 }).withMessage('Dirección debe tener al menos 5 caracteres'),
  body('category').notEmpty().withMessage('Categoría es obligatoria'),
  body('mail').notEmpty().withMessage('Email es obligatorio').isEmail().withMessage('Email debe ser válido'),
  body('guardianName')
    .notEmpty().withMessage('Nombre del tutor es obligatorio')
    .isLength({ min: 3 }).withMessage('Nombre del tutor debe tener al menos 3 caracteres'),
  body('guardianPhone')
    .notEmpty().withMessage('Teléfono del tutor es obligatorio')
    .matches(/^\d{10,15}$/).withMessage('Teléfono del tutor debe tener entre 10 y 15 dígitos'),
  body('hasSiblingDiscount').optional().isBoolean().withMessage('Descuento por hermano debe ser un booleano'),
  body('sure').optional().custom((value, { req }) => {
    if (value === undefined || value === null) return true; // Permitir null o ausencia
    if (['Si', 'No'].includes(value)) return true;
    throw new Error('El campo "sure" debe ser "Si" o "No"');
  }),
  body('league').optional().custom((value, { req }) => {
    if (value === undefined || value === null || value === '') return true; // Permitir null, vacío o ausencia
    if (['Si', 'No', 'Sin especificar'].includes(value)) return true;
    throw new Error('El campo "league" debe ser "Si", "No" o "Sin especificar"');
  }),
  body('profileImage').optional().isURL().withMessage('La imagen de perfil debe ser una URL válida'),
];
// Rutas protegidas
router.post('/create', upload.single('profileImageFile'), validateStudent, protect, admin, createStudent);
router.put('/update/:id', [param('id').isMongoId().withMessage('ID inválido')], upload.single('profileImageFile'), validateStudent, protect, admin, updateStudent);
router.delete('/delete/:id', [param('id').isMongoId().withMessage('ID inválido')], protect, admin, deleteStudent);
router.get('/cloudinary-signature', protect, admin, generateCloudinarySignature);
router.get('/:id', [param('id').isMongoId().withMessage('ID inválido')], protect, admin, getStudentById);
router.get('/', protect, [
  query('state').optional().isIn(['Activo', 'Inactivo']).withMessage('state debe ser Activo o Inactivo')
], getAllStudents);

router.post('/import', protect, admin, [
  body('students').isArray().withMessage('Debe proporcionar una lista de estudiantes'),
  body('students.*').isObject().withMessage('Cada estudiante debe ser un objeto'),
  body('students.*.name').notEmpty().withMessage('Nombre es obligatorio'),
  body('students.*.lastName').notEmpty().withMessage('Apellido es obligatorio'),
  body('students.*.dni').matches(/^\d{7,9}$/).withMessage('DNI debe tener entre 7 y 9 dígitos'),
  body('students.*.birthDate').notEmpty().isDate().withMessage('Fecha de nacimiento válida es obligatoria'),
  body('students.*.address').notEmpty().withMessage('Dirección es obligatoria'),
  body('students.*.category').notEmpty().withMessage('Categoría es obligatoria'),
  body('students.*.profileImage').optional().isURL().withMessage('La imagen de perfil debe ser una URL válida'),
], importStudents);

export default router;
