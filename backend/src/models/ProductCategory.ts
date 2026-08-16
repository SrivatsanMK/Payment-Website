import mongoose, { Schema, Document } from 'mongoose';

export interface IProductItem {
  _id?: mongoose.Types.ObjectId;
  name: string;
  colors: string[];
  unit?: string;
  isActive: boolean;
}

export interface IProductCategory extends Document {
  name: string;
  isActive: boolean;
  items: IProductItem[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProductItemSchema = new Schema<IProductItem>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    colors: {
      type: [String],
      default: [],
    },
    unit: {
      type: String,
      required: false,
      enum: ['grams', 'kg', 'ml', 'liter'],
      default: 'grams',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const ProductCategorySchema = new Schema<IProductCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    items: {
      type: [ProductItemSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Case-insensitive unique index on name
ProductCategorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const ProductCategory = mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema);
export default ProductCategory;
