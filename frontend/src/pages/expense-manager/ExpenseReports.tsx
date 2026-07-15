import React, { useState, useEffect } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { exportToExcel } from '../../utils/exportExcel';
import { 
  Download, 
  Calendar, 
  BarChart3, 
  IndianRupee,
  PieChart as PieChartIcon
} from 'lucide-react';
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
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export const ExpenseReports: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const [range, setRange] = useState('monthly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params: any = { range };
      if (range === 'custom') {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      
      const res = await api.get(endpoints.expenses.detailedReport, { params });
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching expense report:', error);
      showToast('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range !== 'custom' || (range === 'custom' && customStart && customEnd)) {
      fetchReport();
    }
  }, [range, customStart, customEnd]);

  const handleExport = () => {
    if (!reportData || !reportData.expenses) return;
    setIsExporting(true);
    
    try {
      // Map data for Excel export
      const excelData = reportData.expenses.map((exp: any) => ({
        Date: new Date(exp.expenseDate).toLocaleDateString(),
        Category: exp.category,
        'Expense Name': exp.expenseName,
        Vendor: exp.vendor || '',
        'Invoice Number': exp.invoiceNumber || '',
        'Payment Method': exp.paymentMethod,
        Description: exp.description || '',
        Status: exp.status,
        Amount: exp.amount
      }));

      // Calculate totals
      const totals = {
        Amount: reportData.total,
        Status: `Count: ${reportData.count}`
      };

      const filename = `Expense_Report_${range}_${new Date().toISOString().split('T')[0]}`;
      exportToExcel(excelData, filename, 'Expenses', totals);
      
      showToast('Export successful', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export to Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expense Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate and export detailed analysis of your expenses.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleExport}
            disabled={!reportData || isExporting || loading}
            loading={isExporting}
          >
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export to Excel
            </div>
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {['monthly', '3months', '6months', 'yearly', 'custom'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === r 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {r === 'monthly' && 'This Month'}
              {r === '3months' && 'Last 3 Months'}
              {r === '6months' && 'Last 6 Months'}
              {r === 'yearly' && 'This Year'}
              {r === 'custom' && 'Custom Date'}
            </button>
          ))}
        </div>
        
        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : reportData ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <h3 className="text-sm font-medium">Total Expenses</h3>
                <IndianRupee className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(reportData.total)}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <h3 className="text-sm font-medium">Average Expense</h3>
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(reportData.average)}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <h3 className="text-sm font-medium">Highest Expense</h3>
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-red-500">
                {reportData.highest ? formatCurrency(reportData.highest.amount) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {reportData.highest?.expenseName || 'N/A'}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <h3 className="text-sm font-medium">Lowest Expense</h3>
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-teal-500">
                {reportData.lowest ? formatCurrency(reportData.lowest.amount) : '₹0'}
              </p>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {reportData.lowest?.expenseName || 'N/A'}
              </p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Category Wise Total</h2>
                <PieChartIcon className="h-5 w-5 text-slate-400" />
              </div>
              <div className="h-[300px] w-full">
                {reportData.categories?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="total"
                        nameKey="_id"
                      >
                        {reportData.categories.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), 'Amount']}
                        contentStyle={{ borderRadius: '8px', border: 'none' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No data available</div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Category Breakdown</h2>
                <BarChart3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="h-[300px] w-full">
                {reportData.categories?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      layout="vertical"
                      data={reportData.categories}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.2} />
                      <XAxis type="number" tickFormatter={(val) => `₹${val/1000}k`} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="_id" type="category" width={100} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        formatter={(val: number) => [formatCurrency(val), 'Total']}
                        contentStyle={{ borderRadius: '8px', border: 'none' }}
                      />
                      <Line dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No data available</div>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-500 py-12">
          Select a date range to generate a report.
        </div>
      )}
    </div>
  );
};

export default ExpenseReports;
