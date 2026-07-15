import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN_1', 'ADMIN_2'], default: 'ADMIN_1' },
  profilePicture: { type: String, default: '' },
  lastLogin: { type: Date },
  recentLogins: [{
    timestamp: { type: Date, default: Date.now },
    ipAddress: String,
    device: String
  }]
}, {
  timestamps: true
});

// Hash password before saving
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
AdminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const Admin = model('Admin', AdminSchema);
export default Admin;
