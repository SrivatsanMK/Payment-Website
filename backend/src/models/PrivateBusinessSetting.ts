import mongoose, { Schema, Document } from 'mongoose';

export interface IPrivateBusinessSetting extends Document {
  businessName: string;
  ownerName: string;
  currency: string;
  defaultUnit: string;
  defaultPaymentMethod: string;
  address: string;
  phone: string;
  email: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PrivateBusinessSettingSchema: Schema = new Schema(
  {
    businessName: {
      type: String,
      required: true,
      default: 'Private Business',
      trim: true,
    },
    ownerName: {
      type: String,
      default: 'Owner',
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    defaultUnit: {
      type: String,
      default: 'KG',
      trim: true,
    },
    defaultPaymentMethod: {
      type: String,
      default: 'Cash',
      trim: true,
    },
    address: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPrivateBusinessSetting>('PrivateBusinessSetting', PrivateBusinessSettingSchema);
