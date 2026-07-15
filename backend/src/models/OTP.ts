import { Schema, model } from 'mongoose';

const OTPSchema = new Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  otp: { type: String, required: true },
  purpose: { type: String, required: true, enum: ['forgot_password', 'login', 'reset_password'] },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Auto-delete document when expired (using MongoDB TTL index)
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = model('OTP', OTPSchema);
export default OTP;
