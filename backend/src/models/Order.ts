import { Schema, model } from 'mongoose';

const OrderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true, trim: true },
  invoiceNumber: { type: String, required: true, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  gst: { type: Number, default: 0 }, // Amount
  grandTotal: { type: Number, required: true },
  purchaseDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Completed', 'Cancelled'], default: 'Completed' },
  invoiceStatus: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Pending' }
}, {
  timestamps: true
});

export const Order = model('Order', OrderSchema);
export default Order;
