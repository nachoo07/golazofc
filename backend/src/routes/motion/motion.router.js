import { Router } from 'express';
import { createMotion, getMotions, updateMotion, deleteMotion, getMotionsByDate, getMotionsByDateRange } from '../../controllers/motion/motion.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js';
import { body, param, query } from 'express-validator';
import { isSupportedPaymentMethod } from '../../utils/payment/payment.utils.js';

const router = Router();

router.post('/create', protect, admin ,[
    body('concept').isString().trim().notEmpty(),
  body('date').isISO8601(),
  body('amount').isFloat({ gt: 0 }).toFloat(),
  body('paymentMethod').custom(isSupportedPaymentMethod),
  body('incomeType').isIn(['ingreso', 'egreso'])
], createMotion);

router.get('/', protect, admin, getMotions);

router.put('/update/:id', protect, admin, [
    param('id').isMongoId(),
  body('concept').optional().isString().trim().notEmpty(),
  body('date').optional().isISO8601(),
  body('amount').optional().isFloat({ gt: 0 }).toFloat(),
  body('paymentMethod').optional().custom(isSupportedPaymentMethod),
  body('incomeType').optional().isIn(['ingreso', 'egreso'])
], updateMotion);

router.delete('/delete/:id', protect, admin, [
  param('id')
  .isMongoId()
], deleteMotion);

router.get('/date/:date', [param('date').isDate()], protect, admin, getMotionsByDate);

router.get('/date-range', protect, admin, [
  query('start').optional().isISO8601().withMessage('Valid start date is required'),
  query('end').optional().isISO8601().withMessage('Valid end date is required'),
  query('startDate').optional().isISO8601().withMessage('Valid startDate is required'),
  query('endDate').optional().isISO8601().withMessage('Valid endDate is required')
], getMotionsByDateRange);


export default router;