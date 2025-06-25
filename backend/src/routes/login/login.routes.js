import express from 'express';
import { loginUser, logout, refreshAccessToken } from '../../controllers/login/login.controller.js';
import { body } from 'express-validator';
import { protect } from '../../middlewares/login/protect.js';

const router = express.Router();

router.post('/login', [
    body('mail').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ], loginUser);

router.post('/logout', logout);

router.post('/refresh', refreshAccessToken);

router.get('/verify', protect, (req, res) => {
  res.status(200).json({ message: 'Token válido' });
});

export default router;