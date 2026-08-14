import { Schema, model } from 'mongoose';

// 30 days in seconds
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60; // 2592000

const NotificationSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  isAdminNotification: { type: Boolean, default: false },
  readByAdmins: [{ type: Schema.Types.ObjectId, ref: 'Admin' }]
}, {
  timestamps: true
});

// Auto-delete notifications after 30 days using MongoDB TTL index
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: THIRTY_DAYS_SECONDS });

export const Notification = model('Notification', NotificationSchema);
export default Notification;
