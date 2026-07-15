import React, { useState, useEffect } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Copy,
  Download,
  Calendar,
  Building2,
  FileText
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export const ExpenseHistory: React.FC = () => {
  const navigate = useNavigate();
  const api = useAxios();
  const { showToast } = useToast();
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.expenses.base, {
        params: {
          page,
          limit,
          search: searchTerm,
          category: categoryFilter
        }
      });
      if (res.data.success) {
        setExpenses(res.data.expenses);
        setTotalPages(res.data.pages);
        setTotalItems(res.data.total);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchExpenses();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm, categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      const res = await api.delete(endpoints.expenses.single(id));
      if (res.data.success) {
        showToast('Expense deleted successfully', 'success');
        fetchExpenses();
      }
    } catch (error) {
      showToast('Failed to delete expense', 'error');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expense History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View and manage all recorded business expenses.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => navigate('/expense-manager/reports')}
          >
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </div>
          </Button>
          <Button 
            onClick={() => navigate('/expense-manager/add')}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Expense
            </div>
          </Button>
        </div>
      </div>

      <Card className="flex flex-col overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses or vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="">All Categories</option>
                <option value="Warehouse Rent / Deposit">Warehouse Rent</option>
                <option value="Electricity Charges">Electricity Charges</option>
                <option value="Fuel (Diesel/Petrol/CNG)">Fuel</option>
                <option value="Packing Staff Salaries">Salaries</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Expense Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Vendor</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                      <FileText className="mb-4 h-12 w-12 opacity-20" />
                      <p className="text-base font-medium">No expenses found</p>
                      <p className="mt-1 text-xs">Try adjusting your filters or add a new expense.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {expense.expenseName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="text-[10px]" status={expense.category} />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{expense.vendor || '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleDelete(expense._id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-500"
                          title="Delete Expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing <span className="font-medium text-slate-900 dark:text-white">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium text-slate-900 dark:text-white">
                {Math.min(page * limit, totalItems)}
              </span>{' '}
              of <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ExpenseHistory;
