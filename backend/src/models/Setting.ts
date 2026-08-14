import { Schema, model } from 'mongoose';

const SettingSchema = new Schema({
  companyName: { type: String, default: 'Green Glide Logistics' },
  companyLogo: { type: String, default: '' }, // base64 or path
  upiId: { type: String, default: 'greenglide@okaxis' },
  supportPhone: { type: String, default: '+91 98765 43210' },
  gmailAddress: { type: String, default: 'greenglidelogistics@gmail.com' },
  email: { type: String, default: 'greenglidelogistics@gmail.com' }
}, {
  timestamps: true
});

export const Setting = model('Setting', SettingSchema);
export default Setting;
