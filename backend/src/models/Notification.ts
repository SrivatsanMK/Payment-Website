import { Schema, model } from 'mongoose';

const NotificationSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

export const Notification = model('Notification', NotificationSchema);
export default Notification;
