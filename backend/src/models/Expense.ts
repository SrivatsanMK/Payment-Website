import { Schema, model } from 'mongoose';

const ExpenseSchema = new Schema({
  expenseDate: { type: Date, required: true },
  category: { type: String, required: true, trim: true },
  expenseName: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  vendor: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, {
  timestamps: true
});

// Indexes for faster querying, especially for reports and filters
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ category: 1 });

export const Expense = model('Expense', ExpenseSchema);
export default Expense;
