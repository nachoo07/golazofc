import express from 'express';
import { param, query, body } from 'express-validator';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserState
} from '../../controllers/users/user.controller.js';
import { validateUser, validateUserUpdate } from '../../validators/user/user.validator.js';
import { protect, admin } from '../../middlewares/login/protect.js';

const router = express.Router();

// Obtener todos los usuarios (paginado)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer')
], protect, admin, getAllUsers);

// Crear un nuevo usuario
router.post('/create', protect, admin, validateUser, createUser);

// Actualizar un usuario existente
router.put('/update/:id', protect, admin, validateUserUpdate, updateUser);

// Eliminar un usuario
router.delete('/delete/:id', protect, admin, [
  param('id').isMongoId().withMessage('Valid user ID is required')
], deleteUser);

// Actualizar el estado de un usuario (activo/inactivo)
router.put('/state/:userId', protect, admin, [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  body('state').isBoolean().withMessage('State must be a boolean')
], updateUserState);

export default router;