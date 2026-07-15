import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart,
  Pie,
  Cell,
  Legend 
} from 'recharts';
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  CalendarDays,
  FileText,
  Activity
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';

export const ExpenseDashboard: React.FC = () => {
  const api = useAxios();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(endpoints.expenses.dashboard);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Error fetching expense dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { summary, recentTransactions, monthlyGraph, categoryPie } = data || {};
  
  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Expense Manager
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Overview of your business expenses and cash flow.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Activity className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Today</h3>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.today || 0)}
          </div>
        </Card>
        
        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary-500">
            <CalendarDays className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">This Month</h3>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.thisMonth || 0)}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-500">
            <TrendingUp className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Last 3 Months</h3>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.last3Months || 0)}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-500">
            <TrendingDown className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Last 6 Months</h3>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.last6Months || 0)}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-teal-500">
            <FileText className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">This Year</h3>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.thisYear || 0)}
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-none">
          <div className="flex items-center gap-2 text-slate-300 dark:text-slate-600">
            <IndianRupee className="h-4 w-4" />
            <h3 className="text-xs font-semibold uppercase tracking-wider">Total</h3>
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(summary?.total || 0)}
          </div>
          <p className="text-[10px] opacity-70 mt-1">{summary?.count || 0} Entries</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Expense Graph */}
        <Card className="lg:col-span-2 p-6 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Monthly Expense Trend</h2>
          </div>
          <div className="h-[300px] w-full flex-1">
            {monthlyGraph?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyGraph} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), 'Expense']}
                  />
                  <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3, fill: "#0ea5e9", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No data available</div>
            )}
          </div>
        </Card>

        {/* Category Pie Chart */}
        <Card className="p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Top Expense Categories</h2>
            <p className="text-xs text-slate-500">Based on this month's data</p>
          </div>
          <div className="h-[260px] w-full flex-1">
            {categoryPie?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryPie} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), 'Amount']}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No data available</div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Expense</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Vendor</th>
                <th className="pb-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions?.length > 0 ? (
                recentTransactions.map((tx: any) => (
                  <tr key={tx._id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {new Date(tx.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-medium text-slate-900 dark:text-white">
                      {tx.expenseName}
                    </td>
                    <td className="py-3 text-slate-500">
                      <Badge className="text-[10px]" status={tx.category} />
                    </td>
                    <td className="py-3 text-slate-500">{tx.vendor || '-'}</td>
                    <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No recent expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ExpenseDashboard;
