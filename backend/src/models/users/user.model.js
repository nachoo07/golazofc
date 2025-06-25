import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true // Elimina espacios en blanco al inicio y final
    },
    mail: {
        type: String,
        required: true,
        unique: true, // Garantiza que no haya correos duplicados
        lowercase: true, // Convierte a minúsculas automáticamente
        trim: true,
        validate: {
            validator: (v) => /\S+@\S+\.\S+/.test(v),
            message: "Invalid email format.",
          },
    },
    password: {
        type: String,
        required: true,
        minlength: [6, "Password must be at least 6 characters long."],
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