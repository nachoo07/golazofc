import express from 'express';
import { param, query, body } from 'express-validator';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserState
} from '../../controllers/users/user.controller.js';
import sanitize from 'mongo-sanitize';
import { validationResult } from 'express-validator';
import { validateUser } from '../../validators/user/user.validator.js';
import { protect, admin } from '../../middlewares/login/protect.js';

const router = express.Router();

// Obtener todos los usuarios (paginado)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer')
], protect, getAllUsers);

// Crear un nuevo usuario
router.post('/create', validateUser, protect, admin, createUser);

// Actualizar un usuario existente
router.put('/update/:id', [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  // Validación específica para update, haciendo password opcional
  body('name').optional().notEmpty().withMessage('El nombre es obligatorio').trim().customSanitizer(sanitize),
  body('mail').optional()
    .isEmail()
    .withMessage('Se requiere un correo electrónico válido')
    .normalizeEmail()
    .customSanitizer(sanitize),
  body('password').optional()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números'),
  body('role').optional()
    .isIn(['user', 'admin'])
    .withMessage('El rol debe ser "user" o "admin"')
    .customSanitizer(sanitize),
  body('state').optional().isBoolean().withMessage('State must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }
    next();
  }
], protect, admin, updateUser);

// Eliminar un usuario
router.delete('/delete/:id', [
  param('id').isMongoId().withMessage('Valid user ID is required')
], protect, admin, deleteUser);

// Actualizar el estado de un usuario (activo/inactivo)
router.put('/state/:userId', [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('state').isBoolean().withMessage('State must be a boolean')
], protect, admin, updateUserState);

export default router;