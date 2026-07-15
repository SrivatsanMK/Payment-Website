import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ArrowLeft, Save, Upload, Receipt, DollarSign, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

interface ExpenseFormData {
  expenseDate: string;
  category: string;
  expenseName: string;
  amount: number;
  vendor: string;
}

const CATEGORIES = {
  'WAREHOUSE & PACKAGING': [
    'Warehouse Rent / Deposit',
    'Electricity Charges',
    'Packing Raw Materials',
    'Machinery & Tooling (Capex)',
    'Printing Ink & Labels',
    'Warehouse Maintenance'
  ],
  'TRANSPORT & FLEET': [
    'Fuel (Diesel/Petrol/CNG)',
    'Vehicle Maintenance & Spares',
    'Commercial Vehicle Insurance',
    'Driver & Helper Bata'
  ],
  'LABOUR & WORKFORCE': [
    'Packing Staff Salaries',
    'Drivers & Loaders Wages',
    'Supervisor / Manager Salary'
  ]
};

export const AddExpense: React.FC = () => {
  const navigate = useNavigate();
  const api = useAxios();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ExpenseFormData>({
    defaultValues: {
      expenseDate: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const res = await api.post(endpoints.expenses.base, data);

      if (res.data.success) {
        showToast('Expense created successfully', 'success');
        navigate('/expense-manager/history');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create expense', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/expense-manager')}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Add New Expense
            </h1>
          </div>
          <p className="ml-10 text-sm text-slate-500 dark:text-slate-400">
            Record a new business expense or payment.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <div className="grid gap-6">
          
          {/* Main Details */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <Receipt className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Expense Details</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Expense Name"
                placeholder="e.g. Office Stationery"
                {...register('expenseName', { required: 'Expense Name is required' })}
                error={errors.expenseName?.message}
                required
              />

              <Input
                label="Amount (₹)"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register('amount', { required: 'Amount is required', valueAsNumber: true })}
                error={errors.amount?.message}
                required
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    {...register('category', { required: 'Category is required' })}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Select Category...</option>
                    {Object.entries(CATEGORIES).map(([group, options]) => (
                      <optgroup key={group} label={group}>
                        {options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
              </div>

              <Input
                label="Expense Date"
                type="date"
                {...register('expenseDate', { required: 'Date is required' })}
                error={errors.expenseDate?.message}
                required
              />

              <Input
                label="Vendor / Payee Name"
                placeholder="e.g. Amazon, local vendor"
                {...register('vendor')}
              />
            </div>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/expense-manager/history')}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={isSubmitting}
          >
            <div className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Expense
            </div>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;
