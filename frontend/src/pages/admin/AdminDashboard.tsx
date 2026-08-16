import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import {
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
  Package,
  Layers
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const api = useAxios();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCategoryBreakdownOpen, setIsCategoryBreakdownOpen] = useState(false);

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

  const { stats, chartData } = data || {};

  const lowerCards = [
    {
      title: 'Total Packages Dispatched',
      value: (stats?.totalPackages || 0).toLocaleString('en-IN'),
      icon: <Package className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
      subtext: 'Including paid and unpaid',
      borderColor: 'border-amber-500/50',
      isClickable: true,
      onClick: () => setIsCategoryBreakdownOpen(prev => !prev)
    },
    {
      title: 'Total Collected',
      value: `₹${(stats?.totalCollected || 0).toLocaleString('en-IN')}`,
      icon: <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      subtext: 'Settled transactions',
      borderColor: 'border-emerald-500/50',
      isClickable: false
    },
    {
      title: 'Outstanding Dues',
      value: `₹${(stats?.totalOutstanding || 0).toLocaleString('en-IN')}`,
      icon: <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
      subtext: 'Uncollected balances',
      borderColor: 'border-rose-500/50',
      isClickable: false
    },
    {
      title: 'Total Customers',
      value: stats?.customers?.total || 0,
      icon: <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      subtext: 'customer accounts',
      borderColor: 'border-sky-500/50',
      isClickable: false
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Metric Cards Section */}
      <div className="space-y-5">
        {/* Top Highlighted Revenue Card */}
        <div className="w-full lg:w-1/2">
          <Card hoverable className="relative overflow-hidden glass-card border-l-4 border-purple-500 flex flex-col justify-between h-40 py-6 px-7 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Total Packing Revenue
              </span>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 dark:bg-white/10 backdrop-blur-md border border-purple-500/20 dark:border-white/20">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{(stats?.totalSales || 0).toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-purple-700 dark:text-purple-300/90 mt-1 font-medium">
                Cumulative invoice volume
              </p>
            </div>
          </Card>
        </div>

        {/* 4 Bottom Metric Cards Grid */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {lowerCards.map((card, idx) => (
            <Card
              key={idx}
              hoverable
              onClick={card.onClick}
              className={`glass-card border-l-4 ${card.borderColor} flex flex-col justify-between h-36 py-5 px-6 ${
                card.isClickable ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {card.title}
                </span>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md">
                  {card.icon}
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {card.value}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {card.subtext}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* Dynamic Category-Wise Packages Breakdown Section */}
        {isCategoryBreakdownOpen && (
          <div
            className="rounded-3xl glass-card p-6 sm:p-7 shadow-2xl relative overflow-hidden transition-all duration-500 border border-[#BCE2E8]/40"
            style={{
              boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 25px rgba(188,226,232,0.12)'
            }}
          >
            {/* Ambient #BCE2E8 Glow Effects */}
            <div
              className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-60"
              style={{ backgroundColor: '#BCE2E8' }}
            />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            {/* Breakdown Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/40 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-2xl backdrop-blur-md flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(188,226,232,0.15)',
                    border: '1px solid rgba(188,226,232,0.35)'
                  }}
                >
                  <Layers className="h-5 w-5" style={{ color: '#BCE2E8' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span>Category-wise Packages Dispatched</span>
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(188,226,232,0.18)',
                        color: isDark ? '#BCE2E8' : '#0284c7',
                        border: '1px solid rgba(188,226,232,0.4)'
                      }}
                    >
                      {stats?.categoryPackages?.length || 0} Categories
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live breakdown of <span className="font-semibold text-slate-800 dark:text-slate-200">{(stats?.totalPackages || 0).toLocaleString('en-IN')} total packages</span> across all database categories.
                  </p>
                </div>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="relative z-10 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-5">
              {(stats?.categoryPackages || []).map((cat: any) => (
                <div
                  key={cat.categoryId || cat.categoryName}
                  className="relative glass-card border-l-4 p-5 rounded-2xl flex flex-col justify-between h-36 transition-all duration-300 hover:translate-y-[-3px] hover:shadow-xl group"
                  style={{
                    borderLeftColor: '#BCE2E8',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 0 16px rgba(188,226,232,0.06)'
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                      {cat.categoryName}
                    </span>
                    <div
                      className="p-1.5 rounded-xl backdrop-blur-md shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundColor: 'rgba(188,226,232,0.12)',
                        border: '1px solid rgba(188,226,232,0.25)'
                      }}
                    >
                      <Package className="h-4 w-4" style={{ color: '#BCE2E8' }} />
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-2xl font-black tracking-tight"
                        style={{ color: isDark ? '#BCE2E8' : '#0f766e' }}
                      >
                        {(cat.packagesDispatched || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Packages
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, cat.percentage || 0))}%`,
                            backgroundColor: '#BCE2E8'
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{cat.percentage || 0}% of total</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!stats?.categoryPackages || stats.categoryPackages.length === 0) && (
                <div className="col-span-full text-center py-8 text-xs text-slate-400 italic">
                  No categories found. Categories created in Settings → Category & Product Management will appear here automatically.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart Column */}
        <Card className="lg:col-span-2 glass-card flex flex-col justify-between p-7">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Packing Revenue vs Collections History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Monthly invoicing totals compared against actual collections received.
            </p>
          </div>

          <div className="h-72 w-full mt-4">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#475569' }}
                    stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#475569' }}
                    stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: '12px',
                      borderRadius: '16px',
                      background: isDark ? 'rgba(20,20,28,0.92)' : 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(20px)',
                      border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.12)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                      color: isDark ? '#fff' : '#0f172a'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '14px', color: isDark ? '#cbd5e1' : '#334155' }} />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    name="Packing Revenue Billed"
                    stroke="#9333ea"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#9333ea", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="collections"
                    name="Collections Received"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
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
        <Card className="glass-card flex flex-col justify-between p-7">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Invoice Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Outstanding bills categorized by due statuses.
            </p>
          </div>

          <div className="space-y-5 my-6">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Paid Invoices</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats?.invoices?.paid}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-white/10">
                <div
                  className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full shadow-sm"
                  style={{ width: `${(stats?.invoices?.paid / (stats?.invoices?.total || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Pending Dues</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats?.invoices?.pending}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-white/10">
                <div
                  className="bg-amber-500 dark:bg-amber-400 h-full rounded-full shadow-sm"
                  style={{ width: `${(stats?.invoices?.pending / (stats?.invoices?.total || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Overdue Accounts</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats?.invoices?.overdue}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-white/10">
                <div
                  className="bg-rose-500 dark:bg-rose-400 h-full rounded-full shadow-sm"
                  style={{ width: `${(stats?.invoices?.overdue / (stats?.invoices?.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <Link to="/admin/invoices" className="inline-flex items-center justify-center gap-2 w-full py-3 glass-button-secondary rounded-2xl text-xs font-bold transition-all">
            Manage Invoices
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
