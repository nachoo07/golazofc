import mongoose from 'mongoose';

const motionSchema = new mongoose.Schema({
  concept: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Concept must not exceed 100 characters']
  },
  date: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['efectivo', 'transferencia'],
  },
  incomeType: {
    type: String,
    required: true,
    enum: ['ingreso', 'egreso'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true,
});

motionSchema.index({ date: 1, incomeType: 1 });
const Motion = mongoose.model('Motion', motionSchema);

export default Motion;