import mongoose from "mongoose";

const shareSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, "El estudiante es obligatorio"]
  },
  date: {
    type: Date,
    required: [true, "La fecha es obligatoria"]
  },
  amount: {
    type: Number,
    required: [true, "El monto es obligatorio"],
    min: [0, "El monto no puede ser negativo"]
  },
  state: {
    type: String,
    enum: ['Pendiente', 'Vencido', 'Pagado'],
    default: 'Pendiente',
  },
  paymentmethod: {
    type: String,
    enum: ['Efectivo', 'Tarjeta', 'Transferencia'],
    required: function () { return this.state === 'Pagado'; }
  },

  paymentdate: {
    type: Date,
    required: function () { return this.state === 'Pagado'; }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

shareSchema.index({ student: 1, date: 1 });

const Share = mongoose.model('Share', shareSchema);
export default Share;