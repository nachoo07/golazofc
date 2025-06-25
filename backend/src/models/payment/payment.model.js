import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'El ID del estudiante es requerido'],
  },
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto no puede ser negativo'],
  },
  paymentDate: {
    type: Date,
    required: [true, 'La fecha de pago es requerida'],
  },
  paymentMethod: {
    type: String,
    enum: ['Efectivo', 'Transferencia'],
    required: [true, 'El método de pago es requerido'],
  },
  concept: {
    type: String,
    required: [true, 'El concepto es requerido'],
    trim: true,
  },
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
});

// Nuevo esquema para conceptos
const paymentConceptSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del concepto es requerido'],
    unique: true,
    trim: true,
    lowercase: true, // Normalizar a minúsculas
    minlength: [1, 'El concepto debe tener al menos 1 carácter'],
    maxlength: [50, 'El concepto no puede exceder 50 caracteres'],
  },
}, {
  timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);
const PaymentConcept = mongoose.model('PaymentConcept', paymentConceptSchema);

// Exportar ambos modelos
export { Payment, PaymentConcept };
