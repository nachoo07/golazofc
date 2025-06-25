import { Router } from 'express';
import { createMotion, getMotions, updateMotion, deleteMotion, getMotionsByDate, getMotionsByDateRange } from '../../controllers/motion/motion.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js';
import { param, query } from 'express-validator';

const router = Router();

router.post('/create', protect, admin ,createMotion);
router.get('/', protect, admin, getMotions);
router.put('/update/:id', [param('id').isMongoId()], protect, admin, updateMotion);
router.delete('/delete/:id', [param('id').isMongoId()], protect, admin, deleteMotion);
router.get('/date/:date', [param('date').isDate()], protect, admin, getMotionsByDate);
router.get('/date-range', [
  query('start').isDate().withMessage('Valid start date is required'),
  query('end').isDate().withMessage('Valid end date is required')
], protect, admin, getMotionsByDateRange);


export default router;