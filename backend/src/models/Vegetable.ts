import mongoose, { Schema, Document } from 'mongoose';

export interface IVegetable extends Document {
  name: string;
  category: string;
  defaultUnit: string;
  notes?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VegetableSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      default: 'General',
      enum: ['Leafy Vegetables', 'Root Vegetables', 'Fruit Vegetables', 'Bulbs', 'General', 'Other'],
    },
    defaultUnit: {
      type: String,
      required: true,
      default: 'KG',
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Indexes
VegetableSchema.index({ name: 1, createdBy: 1 });

export default mongoose.model<IVegetable>('Vegetable', VegetableSchema);
