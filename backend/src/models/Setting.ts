import { Schema, model } from 'mongoose';

const SettingSchema = new Schema({
  companyName: { type: String, default: 'Dealer Business Hub' },
  companyLogo: { type: String, default: '' }, // base64 or path
  upiId: { type: String, default: 'dealer@okaxis' },
  backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
  backupEmail: { type: String, default: '' },
  supportPhone: { type: String, default: '' }
}, {
  timestamps: true
});

export const Setting = model('Setting', SettingSchema);
export default Setting;
