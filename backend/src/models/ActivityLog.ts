import { Schema, model } from 'mongoose';

const ActivityLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  userRole: { type: String, enum: ['ADMIN_1', 'ADMIN_2', 'Customer', 'Admin'], required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  ipAddress: { type: String },
  userAgent: { type: String }
}, {
  timestamps: true
});

export const ActivityLog = model('ActivityLog', ActivityLogSchema);
export default ActivityLog;
