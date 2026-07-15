import { Schema, model } from 'mongoose';

const PaymentSchema = new Schema({
  invoiceNumber: { type: String, required: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  time: { type: String, required: true }, // e.g. "14:35:00"
  transactionId: { type: String, trim: true, default: '' },
  paymentMethod: { type: String, required: true }
}, {
  timestamps: true
});

export const Payment = model('Payment', PaymentSchema);
export default Payment;
