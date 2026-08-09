import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseItem {
  vegetable: mongoose.Types.ObjectId;
  vegetableName: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  itemTotal: number;
}

export interface IVegetablePurchase extends Document {
  purchaseId: string;
  purchaseDate: Date;
  purchaseTime?: string;
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  items: IPurchaseItem[];
  vegetableSubtotal: number;
  charges: {
    transportation: number;
    loadingUnloading: number;
    commission: number;
    other: number;
  };
  additionalChargesTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAmount: number;
  balanceAmount: number;
  billNumber?: string;
  vehicleNumber?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema(
  {
    vegetable: {
      type: Schema.Types.ObjectId,
      ref: 'Vegetable',
      required: true,
    },
    vegetableName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.001, 'Quantity must be greater than 0'],
    },
    unit: {
      type: String,
      required: true,
      default: 'KG',
    },
    ratePerUnit: {
      type: Number,
      required: true,
      min: [0, 'Rate cannot be negative'],
    },
    itemTotal: {
      type: Number,
      required: true,
      min: [0, 'Item total cannot be negative'],
    },
  },
  { _id: true }
);

const VegetablePurchaseSchema: Schema = new Schema(
  {
    purchaseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    purchaseTime: {
      type: String,
      default: '',
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [PurchaseItemSchema],
      required: true,
      validate: [(val: any[]) => val.length > 0, 'At least one vegetable item is required'],
    },
    vegetableSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    charges: {
      transportation: { type: Number, default: 0, min: 0 },
      loadingUnloading: { type: Number, default: 0, min: 0 },
      commission: { type: Number, default: 0, min: 0 },
      other: { type: Number, default: 0, min: 0 },
    },
    additionalChargesTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Other'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['Paid', 'Partially Paid', 'Pending'],
      default: 'Paid',
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    balanceAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    billNumber: {
      type: String,
      default: '',
      trim: true,
    },
    vehicleNumber: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance dashboard aggregations & filters
VegetablePurchaseSchema.index({ purchaseDate: -1 });
VegetablePurchaseSchema.index({ supplier: 1 });
VegetablePurchaseSchema.index({ paymentStatus: 1 });
VegetablePurchaseSchema.index({ createdBy: 1 });
VegetablePurchaseSchema.index({ 'items.vegetable': 1 });

export default mongoose.model<IVegetablePurchase>('VegetablePurchase', VegetablePurchaseSchema);
