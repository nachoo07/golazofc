import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, "El nombre debe tener al menos 3 caracteres."]
    },
    mail: {
        type: String,
        required: true,
        unique: true, // Garantiza que no haya correos duplicados
        lowercase: true, // Convierte a minúsculas automáticamente
        trim: true,
        validate: {
            validator: (v) => /\S+@\S+\.\S+/.test(v),
            message: "Formato de correo inválido.",
          },
    },
    password: {
        type: String,
        required: true,
        minlength: [8, "La contraseña debe tener al menos 8 caracteres."],
    },
    role: {
        type: String,
        enum: ['user', 'admin'], // Valores permitidos
        default: 'user' // Si no se especifica, será 'user'
    },
    state: {
        type: Boolean,
        default: true // Controlar si el usuario está activo o inactivo
    },
    lastLogin: {
      type: Date
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

const User = mongoose.model('User', userSchema);

export default User;