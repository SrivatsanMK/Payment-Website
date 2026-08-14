import { Schema, model } from 'mongoose';

const ProductItemSchema = new Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }
});

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  products: [ProductItemSchema],
  discount: { type: Number, default: 0 }, // Amount
  gst: { type: Number, default: 0 }, // Percentage
  finalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  qrCodeImage: { type: String }, // Optional path to uploaded QR Code image
  shippedAddress: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  transportMode: { type: String, default: 'Road' },
  dueDate: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  paymentApprovedAt: { type: Date } // Set when payment is approved; used for 7-day QR code expiry
}, {
  timestamps: true
});

export const Invoice = model('Invoice', InvoiceSchema);
export default Invoice;
