import { Schema, model } from 'mongoose';

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

export const Notification = model('Notification', NotificationSchema);
export default Notification;
