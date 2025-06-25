import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    attendance: [
        {
            idStudent: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
            name: {
                type: String,
                required: true,
                trim: true
            },
            lastName: {
                type: String,
                required: true,
                trim: true
            },
            present: {
                type: Boolean,
                required: true
            }
        }
    ]
}, { timestamps: true });

attendanceSchema.index({ date: 1, category: 1 });
const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;