import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import { 
  IndianRupee, 
  Receipt, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Package
} from 'lucide-react';
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
import Spinner from '../../components/ui/Spinner';
import { useNavigate } from 'react-router-dom';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const api = useAxios();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [metrics, setMetrics] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const detailsRes = await api.get(endpoints.customers.single(user?.id || ''));
      if (detailsRes.data.success) {
        setMetrics(detailsRes.data.metrics);
        setChartData(detailsRes.data.chartData || []);
      }

      const invoicesRes = await api.get(endpoints.invoices.base, {
        params: { limit: 50, status: 'Unpaid' }
      });
      if (invoicesRes.data.success) {
        // Strictly filter to ONLY invoices requiring payment (remainingAmount > 0 and not fully Paid)
        const unpaidOnly = (invoicesRes.data.invoices || []).filter((inv: any) => {
          const isSettled = inv.status === 'Paid' || (inv.remainingAmount !== undefined && inv.remainingAmount <= 0);
          return !isSettled;
        });

        // Sort newest first
        unpaidOnly.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setInvoices(unpaidOnly);
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

  // Real-time automatic refresh on payment approval or invoice creation
  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchDashboardData();
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket, user]);

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
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-stretch">
        {/* LEFT: Purchases vs Payments Chart */}
        <Card className="glass-card flex flex-col justify-between p-7 h-full">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white dark:text-white">
              Purchases vs Payments
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Monthly purchases vs actual settled payments.
            </p>
          </div>

          <div className="h-64 w-full mt-2">
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

        {/* RIGHT: Recent Bills & Statements (Outstanding Invoices Only) */}
        <div className="flex flex-col h-full">
          <Card className="glass-card p-0 flex flex-col justify-between h-full" hoverable={false}>
            <div className="p-6 sm:p-7 border-b border-white/10 flex-shrink-0">
              <h3 className="text-base font-bold text-white dark:text-white">
                Recent Bills & Statements
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your newly issued invoices.
              </p>
            </div>

            {invoices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 shadow-lg shadow-emerald-950/40">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  All invoices are paid
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  You have no pending bills or outstanding payments at this time.
                </p>
              </div>
            ) : (
              <div className="flex-1 max-h-[300px] overflow-y-auto overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <table className="w-full min-w-[480px] text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md">
                    <tr className="border-b border-white/10">
                      {['Invoice No', 'Issue Date', 'Total', 'Actions'].map((h, i) => (
                        <th key={i} className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-xs">
                    {invoices.map((inv) => (
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
                          <button
                            onClick={() => navigate(`/pay-invoice/${inv._id}`)}
                            className="inline-flex items-center justify-center py-1.5 px-4 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-lg shadow-purple-900/40 whitespace-nowrap"
                          >
                            Pay Now
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
