import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true, 
  },
  value: {
    type: mongoose.Schema.Types.Mixed, 
    required: true,
    validate: {
      validator: (v) => {
        return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'object';
      },
      message: 'Value must be a string, number, boolean, or object'
    }
  },
}, { timestamps: true });

export default mongoose.model('Config', configSchema);