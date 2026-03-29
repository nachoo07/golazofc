import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres.'],
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'El apellido debe tener al menos 2 caracteres.'],
  },
  dni: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (v) => /^\d{7,9}$/.test(v),
      message: 'El DNI debe contener de 7 a 9 dígitos.',
    },
  },
  birthDate: {
    type: Date,
    required: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
    minlength: [5, 'La dirección debe tener al menos 5 caracteres.'],
  },
  guardianName: {
    type: String,
    required: [true, 'El nombre del tutor es obligatorio.'],
    trim: true,
    minlength: [3, 'El nombre del tutor debe tener al menos 3 caracteres.'],
  },
  guardianPhone: {
    type: String,
    required: [true, 'El teléfono del tutor es obligatorio.'],
    trim: true,
    validate: {
      validator: (v) => /^\d{10,15}$/.test(v),
      message: 'El número de teléfono del tutor debe tener entre 10 y 15 dígitos.',
    },
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  mail: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio.'],
    lowercase: true,
    trim: true,
    validate: {
      validator: (v) => !v || /\S+@\S+\.\S+/.test(v),
      message: 'Formato de correo electrónico no válido.',
    },
  },
  state: {
    type: String,
    enum: ['Activo', 'Inactivo'],
    default: 'Activo',
  },
  profileImage: {
    type: String,
    trim: true,
    default: 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg',
  },
  hasSiblingDiscount: {
    type: Boolean,
    default: false,
  },
league: {
    type: String,
    enum: ['Si', 'No', 'Sin especificar'], 
    default: 'Sin especificar',   
  },
sure: {
  type: String,
  enum: ['Si', 'No', 'Sin especificar'],
  default: 'Sin especificar',
},

}, {
  timestamps: true,
});

const Student = mongoose.model('Student', studentSchema);
export default Student;