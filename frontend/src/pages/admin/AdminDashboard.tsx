import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  LineChart, 
  Line 
} from 'recharts';
import { 
  IndianRupee, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  FileCheck,
  Package
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const api = useAxios();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(endpoints.reports.dashboard);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchDashboardStats();
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { stats, chartData, recentLogs, recentPayments } = data || {};

  const lowerCards = [
    {
      title: 'Total Packages Dispatched',
      value: stats?.totalPackages || 0,
      icon: <Package className="h-5 w-5 text-amber-500" />,
      subtext: 'Including paid and unpaid',
      color: 'border-l-4 border-amber-500'
    },
    {
      title: 'Total Collected',
      value: `₹${(stats?.totalCollected || 0).toLocaleString('en-IN')}`,
      icon: <IndianRupee className="h-5 w-5 text-emerald-500" />,
      subtext: 'Settled transactions',
      color: 'border-l-4 border-emerald-500'
    },
    {
      title: 'Outstanding Dues',
      value: `₹${(stats?.totalOutstanding || 0).toLocaleString('en-IN')}`,
      icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
      subtext: 'Uncollected balances',
      color: 'border-l-4 border-rose-500'
    },
    {
      title: 'Total Customers',
      value: stats?.customers?.total || 0,
      icon: <Users className="h-5 w-5 text-sky-500" />,
      subtext: `${stats?.customers?.active || 0} active customer accounts`,
      color: 'border-l-4 border-sky-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Executive Dashboard
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Dealer operational health and collection performance tracking.
        </p>
      </div>

      {/* Metric Cards Section */}
      <div className="space-y-4">
        {/* Top Highlighted Metric */}
        <div className="w-full lg:w-1/2">
          <Card hoverable className="bg-gradient-to-br from-indigo-600 to-purple-700 flex flex-col justify-between h-36 py-5 px-6 shadow-xl shadow-indigo-500/20 border-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">
                Total Packing Revenue
              </span>
              <TrendingUp className="h-6 w-6 text-indigo-200" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-white">
                ₹{(stats?.totalSales || 0).toLocaleString('en-IN')}
              </span>
              <p className="text-[11px] text-indigo-200 mt-1 font-medium">
                Cumulative invoice volume
              </p>
            </div>
          </Card>
        </div>

        {/* 4 Bottom Metric Cards Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {lowerCards.map((card, idx) => (
            <Card key={idx} hoverable className={`${card.color} flex flex-col justify-between h-32 py-4 px-5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                {card.icon}
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {card.value}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {card.subtext}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Column */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100">
              Packing Revenue vs Collections History
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Monthly invoicing totals compared against actual customer settlements.
            </p>
          </div>
          
          <div className="h-72 w-full mt-4">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }} 
                    stroke="#94a3b8" 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    stroke="#94a3b8" 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: '11px', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    name="Packing Revenue Billed" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#6366f1", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="collections" 
                    name="Collections Received" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                Insufficient sales history data to build chart.
              </div>
            )}
          </div>
        </Card>

        {/* Invoice Summary Distribution */}
        <Card className="flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100">
              Invoice Summary
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Outstanding bills categorized by due statuses.
            </p>
          </div>

          <div className="space-y-4 my-6">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Paid Invoices</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{stats?.invoices?.paid}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${(stats?.invoices?.paid / (stats?.invoices?.total || 1)) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Pending Dues</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{stats?.invoices?.pending}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full" 
                style={{ width: `${(stats?.invoices?.pending / (stats?.invoices?.total || 1)) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Overdue Accounts</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{stats?.invoices?.overdue}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-rose-500 h-full rounded-full" 
                style={{ width: `${(stats?.invoices?.overdue / (stats?.invoices?.total || 1)) * 100}%` }}
              />
            </div>
          </div>

          <Link to="/invoices" className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
            Manage Invoices
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      {/* Details Lists (Recent payments & Logs) */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Recent Payments list */}
        <Card className="flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100">
              Recent Settlements
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Newly logged collection payments.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden flex-1">
            {recentPayments && recentPayments.length > 0 ? (
              recentPayments.map((p: any) => (
                <div key={p._id} className="py-3.5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">
                      {p.customer?.name || 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      Inv: {p.invoiceNumber} | Method: {p.paymentMethod}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-emerald-650 dark:text-emerald-400">
                      +₹{p.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-slate-405 mt-0.5">
                      {new Date(p.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent payment transactions.
              </div>
            )}
          </div>
        </Card>

        {/* Audit Activity Logs */}
        <Card className="flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100">
              Activity Logs
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              System event log feed for security audibility.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto overflow-hidden flex-1">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log: any) => (
                <div key={log._id} className="py-3 flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-750 dark:text-slate-300">
                      {log.action}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-450 dark:text-slate-400 leading-snug">
                    {log.details}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No system activity logs found.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
