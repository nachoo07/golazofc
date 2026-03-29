import express from 'express';
import { validateAndNormalizeEmailPayload } from '../../validators/email/email.validator.js';
import { sendEmail, streamEmailProgress } from '../../controllers/email/email.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js'; // Ajusta la ruta según tu estructura

const router = express.Router();

router.post('/send', [ validateAndNormalizeEmailPayload, protect, admin ], sendEmail);

router.get('/progress/:progressId', [protect, admin], streamEmailProgress);

export default router;