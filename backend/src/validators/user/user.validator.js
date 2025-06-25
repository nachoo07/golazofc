import { body, validationResult } from 'express-validator';
import sanitize from 'mongo-sanitize';

export const validateUser = [
  body('name').notEmpty().withMessage('El nombre es obligatorio').trim().customSanitizer(sanitize),
  body('mail')
    .isEmail()
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