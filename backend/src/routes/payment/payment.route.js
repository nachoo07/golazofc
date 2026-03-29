import express from 'express';
import { body, param, query } from 'express-validator';
import { getPaymentsByStudent, createPayment, deletePayment, updatePayment, getAllPayments, getPaymentsByDateRange } from '../../controllers/payment/payment.controller.js';
import { getAllConcepts, createConcept, deleteConcept } from '../../controllers/concept/paymentConcept.controller.js';
import { protect, admin } from '../../middlewares/login/protect.js';
import { isSupportedPaymentMethod } from '../../utils/payment/payment.utils.js';

const router = express.Router();

const validatePayment = [
  body('studentId').isMongoId().withMessage('ID de estudiante inválido'),
  body('amount').isFloat({ gt: 0 }).withMessage('Monto debe ser un número positivo'),
  body('paymentDate').isDate().withMessage('Fecha de pago inválida'),
  body('paymentMethod').custom(isSupportedPaymentMethod).withMessage('Método de pago inválido'),
  body('concept').notEmpty().withMessage('Concepto es requerido'),
];

const validateConcept = [
  body('name').notEmpty().withMessage('El nombre del concepto es requerido').isLength({ max: 50 }).withMessage('El concepto no puede exceder 50 caracteres'),
];

router.get( '/concepts', protect, admin, getAllConcepts );

router.post( '/concepts', validateConcept, protect, admin, createConcept ); 

router.delete('/concepts/:id',
  [param('id').isMongoId().withMessage('ID de concepto inválido')],
  protect, admin, deleteConcept
);

router.get('/', protect, admin, getAllPayments );

router.post('/create', validatePayment, protect, admin, createPayment);

router.put( '/update/:id',
  [param('id').isMongoId().withMessage('ID de pago inválido'), ...validatePayment],
  protect, admin, updatePayment );

router.delete( '/delete/:id',
  [param('id').isMongoId().withMessage('ID de pago inválido')],
  protect, admin, deletePayment );

router.get( '/student/:studentId',
  [param('studentId').isMongoId().withMessage('ID de estudiante inválido')],
  protect, admin, getPaymentsByStudent );
  
router.get(
  '/date-range',
  protect,
  admin,
  [
    query('startDate').isISO8601().withMessage('Fecha de inicio inválida'),
    query('endDate').isISO8601().withMessage('Fecha de fin inválida'),
  ],
  getPaymentsByDateRange
);


export default router;