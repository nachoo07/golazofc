import express from "express";
import { protect, admin } from "../../middlewares/login/protect.js";
import {
    getAllAttendances,
    createAttendance,
    updateAttendance,
    deleteAttendance
} from "../../controllers/attendance/attendance.controller.js";

const router = express.Router();

router.get("/", protect,  getAllAttendances);
router.post("/create",protect, createAttendance);
router.put("/update",protect, updateAttendance); // Se pasa categoría y fecha en el body para actualizar
router.delete("/delete",protect, deleteAttendance); // Se eliminan registros por categoría y fecha

export default router;