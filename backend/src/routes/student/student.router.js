import express from 'express';
import { body, param } from 'express-validator';
import {getAllStudents, createStudent,deleteStudent,updateStudent,getStudentById,importStudents,generateCloudinarySignature,} from '../../controllers/student/student.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

const validateStudent = [
  body('name').notEmpty().withMessage('Nombre es obligatorio'),
  body('lastName').notEmpty().withMessage('Apellido es obligatorio'),
  body('dni').matches(/^\d{8,10}$/).withMessage('DNI debe tener entre 8 y 10 dígitos'),
  body('birthDate').notEmpty().isDate().withMessage('Fecha de nacimiento válida es obligatoria'),
  body('address').notEmpty().withMessage('Dirección es obligatoria'),
  body('category').notEmpty().withMessage('Categoría es obligatoria'),
  body('mail').optional().isEmail().withMessage('Email debe ser válido'),

  body('guardianName').optional().notEmpty().withMessage('Nombre del tutor es obligatorio'),
  body('guardianPhone').optional().matches(/^\d{10,15}$/).withMessage('El número de teléfono del tutor debe tener entre 10 y 15 dígitos'),
  body('hasSiblingDiscount').optional().isBoolean().withMessage('Descuento por hermano debe ser un booleano'),
body('sure').optional().isIn(['Si', 'No']).withMessage('El campo "sure" debe ser "Si" o "No"'),
body('league').optional().isIn(['Si', 'No']).withMessage('El campo "league" debe ser "Si" o "No"'),
];
// Rutas protegidas
router.post('/create', upload.single('profileImageFile'), validateStudent, protect, admin, createStudent);
router.put('/update/:id', [param('id').isMongoId().withMessage('ID inválido')], upload.single('profileImageFile'), validateStudent, protect, admin, updateStudent);
router.delete('/delete/:id', [param('id').isMongoId().withMessage('ID inválido')], protect, admin, deleteStudent);
router.get('/cloudinary-signature', protect, admin, generateCloudinarySignature);
router.get('/:id', [param('id').isMongoId().withMessage('ID inválido')], protect, admin, getStudentById);
router.get('/', protect, getAllStudents);

router.post('/import', protect, admin, [
  body('students').isArray().withMessage('Debe proporcionar una lista de estudiantes'),
  body('students.*').isObject().withMessage('Cada estudiante debe ser un objeto'),
  body('students.*.name').notEmpty().withMessage('Nombre es obligatorio'),
  body('students.*.lastName').notEmpty().withMessage('Apellido es obligatorio'),
  body('students.*.dni').matches(/^\d{8,10}$/).withMessage('DNI debe tener entre 8 y 10 dígitos'),
  body('students.*.birthDate').notEmpty().isDate().withMessage('Fecha de nacimiento válida es obligatoria'),
  body('students.*.address').notEmpty().withMessage('Dirección es obligatoria'),
  body('students.*.category').notEmpty().withMessage('Categoría es obligatoria'),
  body('students.*.profileImage').optional().isURL().withMessage('La imagen de perfil debe ser una URL válida'),
], importStudents);

export default router;
