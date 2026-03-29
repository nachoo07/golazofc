import express from "express";
import { body, param } from "express-validator";
import { protect, admin } from "../../middlewares/login/protect.js";
import { getAllAttendances, getAttendanceByStudentId, createAttendance, updateAttendance } from "../../controllers/attendance/attendance.controller.js";

const router = express.Router();

const validateAttendancePayload = [
    body('date').isISO8601().withMessage('Fecha inválida'),
    body('category').notEmpty().withMessage('La categoría es requerida'),
    body('attendance').isArray({ min: 1 }).withMessage('La lista de asistencia no puede estar vacía')
];

router.get("/", protect,  getAllAttendances);
router.post("/create",protect, validateAttendancePayload, createAttendance);
router.put("/update",protect, validateAttendancePayload, updateAttendance);
router.get("/student/:id", protect, [param('id').isMongoId().withMessage('ID de estudiante inválido')], getAttendanceByStudentId);

export default router;