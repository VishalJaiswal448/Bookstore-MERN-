import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160, index: true },
  password: { type: String, required: true, minlength: 8, maxlength: 200, select: false },
  role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer', index: true },
  isActive: { type: Boolean, default: true, index: true },
  lastLogin: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
