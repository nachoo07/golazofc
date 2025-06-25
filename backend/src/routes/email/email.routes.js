import express from 'express';
import { body } from 'express-validator';
import { sendEmail } from '../../controllers/email/email.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js'; // Ajusta la ruta según tu estructura

const router = express.Router();

router.post('/send', [
    body('to').isEmail().withMessage('Valid email is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('html').notEmpty().withMessage('HTML content is required'),
    protect, admin
  ], sendEmail);

export default router;