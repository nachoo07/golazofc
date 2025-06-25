import express from 'express';
import { body, param } from 'express-validator';
import { getConfig, setConfig } from '../../controllers/base/config.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js';

const router = express.Router();

router.get('/:key', [
    param('key').notEmpty().withMessage('Key is required'),
    protect, admin
  ], getConfig);
  
  router.post('/set', [
    body('key').notEmpty().withMessage('Key is required'),
    body('value').notEmpty().withMessage('Value is required'),
    protect, admin
  ], setConfig);

export default router;