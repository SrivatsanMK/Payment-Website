import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { 
  IndianRupee, 
  Receipt, 
  TrendingUp, 
  AlertCircle,
  FileCheck,
  Package,
  Download
} from 'lucide-react';
import { generateInvoicePdf } from '../../utils/pdfGenerator';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useAxios();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const handleDownloadInvoice = async (invoiceNumber: string) => {
    setDownloadingInvoice(invoiceNumber);
    try {
      const invoicesRes = await api.get('/invoices', { params: { search: invoiceNumber } });
      const invoice = invoicesRes.data.invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);
      
      if (!invoice) {
        showToast('Invoice details not found', 'error');
        return;
      }
      
      const settingsRes = await api.get('/settings');
      const settings = settingsRes.data.settings || {};
      
      const doc = await generateInvoicePdf(invoice, settings);
      doc.save(`invoice_${invoice.invoiceNumber}.pdf`);
      showToast(`Invoice ${invoice.invoiceNumber} downloaded successfully`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to download invoice PDF', 'error');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const detailsRes = await api.get(endpoints.customers.single(user?.id || ''));
      if (detailsRes.data.success) {
        setMetrics(detailsRes.data.metrics);
        setChartData(detailsRes.data.chartData || []);
      }

      const invoicesRes = await api.get(endpoints.invoices.base, {
        params: { limit: 10, status: 'Unpaid' }
      });
      if (invoicesRes.data.success) {
        setInvoices(invoicesRes.data.invoices);
      }
    } catch (err) {
      showToast('Failed to load dashboard summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Packages Received',
      value: metrics?.totalPackages || 0,
      icon: <Package className="h-5 w-5 text-amber-400" />,
      subtext: 'Including paid and unpaid',
      borderColor: 'border-amber-500/40'
    },
    {
      title: 'Total Amount Purchased',
      value: `₹${(metrics?.totalPurchased || 0).toLocaleString('en-IN')}`,
      icon: <TrendingUp className="h-5 w-5 text-purple-400" />,
      subtext: 'Total ordered items volume',
      borderColor: 'border-purple-500/40'
    },
    {
      title: 'Total Amount Paid',
      value: `₹${(metrics?.totalPaid || 0).toLocaleString('en-IN')}`,
      icon: <IndianRupee className="h-5 w-5 text-emerald-400" />,
      subtext: 'Amount successfully settled',
      borderColor: 'border-emerald-500/40'
    },
    {
      title: 'Remaining Balance Due',
      value: `₹${(metrics?.remainingBalance || 0).toLocaleString('en-IN')}`,
      icon: <AlertCircle className="h-5 w-5 text-rose-400" />,
      subtext: 'Outstanding unpaid balance',
      borderColor: 'border-rose-500/40'
    },
    {
      title: 'Invoices Issued',
      value: metrics?.totalInvoices || 0,
      icon: <Receipt className="h-5 w-5 text-sky-400" />,
      subtext: 'Total billing statements',
      borderColor: 'border-sky-500/40'
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white dark:text-white">
          Customer Portal Dashboard
        </h1>
        <p className="text-xs text-slate-300 dark:text-slate-400 mt-1.5 font-medium">
          Review orders, invoices, and settle outstanding balances safely.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((card, idx) => (
          <Card key={idx} hoverable className={`glass-card border-l-4 ${card.borderColor} flex flex-col justify-between py-5 px-4 min-h-[9rem]`}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300 leading-tight">
                {card.title}
              </span>
              <div className="flex-shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                {card.icon}
              </div>
            </div>
            <div className="mt-3">
              <span className="block text-lg font-bold text-white dark:text-white break-all leading-tight">
                {card.value}
              </span>
              <p className="text-[10px] text-slate-400 mt-1 font-medium leading-snug">
                {card.subtext}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Invoices and Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col">
          <Card className="glass-card p-0 flex flex-col justify-between" hoverable={false}>
            <div className="p-7 border-b border-white/10 flex-shrink-0">
              <h3 className="text-base font-bold text-white dark:text-white">
                Recent Bills & Statements
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your newly issued invoices.
              </p>
            </div>

            <div className="flex-grow max-h-[300px] overflow-y-auto overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <table className="w-full min-w-[480px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    {['Invoice No', 'Issue Date', 'Total', 'Actions'].map((h, i) => (
                      <th key={i} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-xs">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-400">
                        No unpaid billing statements found.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv._id} className="text-xs glass-table-row hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-5 py-4 text-slate-300 whitespace-nowrap">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                          ₹{inv.finalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {inv.status !== 'Paid' ? (
                            <button
                              onClick={() => navigate(`/pay-invoice/${inv._id}`)}
                              className="inline-flex items-center justify-center py-1.5 px-4 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-lg shadow-purple-900/40 whitespace-nowrap"
                            >
                              Pay Now
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                                <FileCheck className="h-4 w-4" />
                                Settled
                              </span>
                              <button
                                onClick={() => handleDownloadInvoice(inv.invoiceNumber)}
                                disabled={downloadingInvoice !== null}
                                className="p-1.5 text-slate-300 hover:text-white rounded-xl transition-colors"
                                title="Download PDF Invoice"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Purchases vs Payments Chart */}
        <Card className="glass-card flex flex-col justify-between p-7">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white dark:text-white">
              Purchases vs Payments
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Monthly purchases vs actual settled payments.
            </p>
          </div>

          <div className="h-60 w-full mt-2">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#cbd5e1' }} 
                    stroke="rgba(255,255,255,0.2)" 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#cbd5e1' }} 
                    stroke="rgba(255,255,255,0.2)" 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: '11px', 
                      borderRadius: '14px', 
                      background: 'rgba(20,20,28,0.85)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.2)', 
                      boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                      color: '#fff'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#cbd5e1' }} />
                  <Line 
                    type="monotone" 
                    dataKey="purchases" 
                    name="Purchases" 
                    stroke="#a855f7" 
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: "#a855f7", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="payments" 
                    name="Payments" 
                    stroke="#34d399" 
                    strokeWidth={3}
                    dot={{ r: 3.5, fill: "#34d399", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No billing history found.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDashboard;
