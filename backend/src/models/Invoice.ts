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
  dueDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Invoice = model('Invoice', InvoiceSchema);
export default Invoice;
