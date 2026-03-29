import { body, param, validationResult } from 'express-validator';
import sanitize from 'mongo-sanitize';

export const validateUser = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
    .trim()
    .customSanitizer(sanitize),
  body('mail')
    .isEmail()
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .withMessage('Se requiere un correo electrónico válido')
    .normalizeEmail()
    .customSanitizer(sanitize),
  body('password')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/)
    .withMessage('La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('El rol debe ser "user" o "admin"')
    .customSanitizer(sanitize),
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
  },
];

export const validateUserUpdate = [
  param('id').isMongoId().withMessage('Valid user ID is required'),
  body('name')
    .optional()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres')
    .trim()
    .customSanitizer(sanitize),
  body('mail').optional().isEmail().withMessage('Correo inválido').normalizeEmail().customSanitizer(sanitize),
  // No permitimos cambiar password vía esta ruta
  body('password').not().exists().withMessage('La contraseña no puede actualizarse desde esta ruta'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Rol inválido').customSanitizer(sanitize),
  body('state').optional().isBoolean().withMessage('State must be a boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Errores de validación', errors: errors.array() });
    }
    next();
  }
];