import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const CustomerSchema = new Schema({
  customerId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  address: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Customer' },
  joiningDate: { type: Date, default: Date.now },
  profilePicture: { type: String, default: '' }, // base64 or path
  lastPasswordChangeDate: { type: Date, default: Date.now },
  forcedPasswordReset: { type: Boolean, default: false },
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
CustomerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    this.lastPasswordChangeDate = new Date();
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
CustomerSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const Customer = model('Customer', CustomerSchema);
export default Customer;
