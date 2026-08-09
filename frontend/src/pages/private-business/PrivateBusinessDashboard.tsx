import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAxios } from '../../hooks/useAxios';
import { useTheme } from '../../context/ThemeContext';
import { endpoints } from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import {
  ShoppingBag,
  Scale,
  Calendar,
  DollarSign,
  Truck,
  TrendingUp,
  ArrowRight,
  Filter,
  BarChart2,
  PieChart as PieIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const CHART_COLORS = ['#10b981', '#9333ea', '#f59e0b', '#ec4899', '#3b82f6', '#0d9488', '#6366f1'];

export const PrivateBusinessDashboard: React.FC = () => {
  const api = useAxios();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${endpoints.privateBusiness.dashboard}?range=${range}`;
      if (range === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load private business dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [api, range, startDate, endDate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const trends = data?.trends || [];
  const topVegetables = data?.topVegetables || [];
  const supplierDistribution = data?.supplierDistribution || [];
  const recentPurchases = data?.recentPurchases || [];

  const tooltipStyle = {
    fontSize: '12px',
    borderRadius: '16px',
    background: isDark ? 'rgba(20,20,28,0.92)' : 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.12)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
    color: isDark ? '#fff' : '#0f172a'
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & DATE RANGE FILTER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Vegetable Purchase Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics for vegetable procurement, rates, suppliers, and quantities.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
          <Filter className="h-4 w-4 text-teal-600 dark:text-teal-400 ml-1" />
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-2"
          >
            <option value="today" className="dark:bg-slate-900">Today</option>
            <option value="this_week" className="dark:bg-slate-900">This Week</option>
            <option value="this_month" className="dark:bg-slate-900">This Month</option>
            <option value="last_3_months" className="dark:bg-slate-900">Last 3 Months</option>
            <option value="last_6_months" className="dark:bg-slate-900">Last 6 Months</option>
            <option value="this_year" className="dark:bg-slate-900">This Year</option>
            <option value="custom" className="dark:bg-slate-900">Custom Date Range</option>
          </select>

          {range === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          <Button
            onClick={() => navigate('/admin/private-business/purchases/add')}
            variant="primary"
            className="text-xs py-1.5 px-3.5 ml-1"
          >
            + Add Purchase
          </Button>
        </div>
      </div>

      {/* ── TOP 6 SUMMARY METRIC CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. Today's Purchase Amount */}
        <Card className="p-4 border-l-4 border-l-teal-500 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Amount</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            ₹{(summary.todayAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
            <DollarSign className="h-3 w-3" /> Today Procurement
          </div>
        </Card>

        {/* 2. Today's Purchased KG */}
        <Card className="p-4 border-l-4 border-l-emerald-500 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's KG</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {(summary.todayKG || 0).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">KG</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <Scale className="h-3 w-3" /> Quantity Weight
          </div>
        </Card>

        {/* 3. This Month Purchase Amount */}
        <Card className="p-4 border-l-4 border-l-purple-500 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month Amount</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            ₹{(summary.monthAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
            <Calendar className="h-3 w-3" /> Monthly Spend
          </div>
        </Card>

        {/* 4. This Month Purchased KG */}
        <Card className="p-4 border-l-4 border-l-amber-500 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month KG</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {(summary.monthKG || 0).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">KG</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            <ShoppingBag className="h-3 w-3" /> Volume KG
          </div>
        </Card>

        {/* 5. Total Purchase Amount */}
        <Card className="p-4 border-l-4 border-l-indigo-500 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Amount</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            ₹{(summary.totalAmount || 0).toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
            <TrendingUp className="h-3 w-3" /> Cumulative
          </div>
        </Card>

        {/* 6. Total Purchased KG */}
        <Card className="p-4 border-l-4 border-l-rose-500 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total KG</span>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {(summary.totalKG || 0).toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-400">KG</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
            <Scale className="h-3 w-3" /> All Purchases
          </div>
        </Card>
      </div>

      {/* ── SECONDARY METRICS RIBBON ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Purchases Count</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">{summary.totalPurchases || 0} Bills</div>
          </div>
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <ShoppingBag className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Active Suppliers</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">{summary.activeSuppliers || 0} Dealers</div>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Truck className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Vegetable Types</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">{summary.activeVegetables || 0} Items</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <BarChart2 className="h-4 w-4" />
          </div>
        </Card>

        <Card className="p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Rate / KG</span>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">₹{summary.avgRatePerKG || '0.00'}</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </Card>
      </div>

      {/* ── CHARTS SECTION ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Purchase Spending Trend Line Chart (Styled matching Profile 2 / Admin 2) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Purchase Spending Trend (₹)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Procurement expenditure history for selected period.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{range.replace('_', ' ')}</span>
          </div>

          <div className="h-72 w-full mt-2">
            {trends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No purchase records for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                  <XAxis
                    dataKey="date"
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
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Purchase Spending']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '14px', color: isDark ? '#cbd5e1' : '#334155' }} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Purchase Spending (₹)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* 2. Vegetable Quantity Trend Bar Chart (Styled matching Profile 2 / Admin 2) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="h-4 w-4 text-purple-500" /> Quantity Purchased Trend (KG)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Volume weight procurement history in KG.
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{range.replace('_', ' ')}</span>
          </div>

          <div className="h-72 w-full mt-2">
            {trends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No purchase records for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                  <XAxis
                    dataKey="date"
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
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`${Number(val).toLocaleString('en-IN')} KG`, 'Quantity Weight']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '14px', color: isDark ? '#cbd5e1' : '#334155' }} />
                  <Bar
                    dataKey="kg"
                    name="Quantity Purchased (KG)"
                    fill="#9333ea"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ── TOP VEGETABLES & SUPPLIER DISTRIBUTION ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vegetables by Quantity */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-amber-500" /> Top Vegetables by Quantity (KG)
          </h3>
          <div className="h-64 w-full">
            {topVegetables.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVegetables} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#cbd5e1' : '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#cbd5e1' : '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`${Number(val).toLocaleString('en-IN')} KG`, 'Total Quantity']}
                  />
                  <Bar dataKey="kg" name="Quantity (KG)" radius={[0, 8, 8, 0]}>
                    {topVegetables.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Supplier Purchase Distribution */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="h-4 w-4 text-teal-500" /> Supplier Purchase Distribution (₹)
          </h3>
          <div className="h-64 w-full">
            {supplierDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supplierDistribution}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={50}
                    paddingAngle={4}
                  >
                    {supplierDistribution.map((_: any, index: number) => (
                      <Cell key={`cell-sup-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount Spent']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: isDark ? '#cbd5e1' : '#334155' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ── RECENT PURCHASES TABLE ────────────────────────────────────────── */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-teal-500" /> Recent Vegetable Purchases
          </h3>
          <Button
            onClick={() => navigate('/admin/private-business/purchases')}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400"
          >
            View All Purchases <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Purchase ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4 rounded-r-xl">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {recentPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No purchases recorded yet. Click <strong>+ Add Purchase</strong> to record your first transaction.
                  </td>
                </tr>
              ) : (
                recentPurchases.map((p: any) => {
                  const itemsSummary = (p.items || [])
                    .map((i: any) => `${i.vegetableName} (${i.quantity} ${i.unit})`)
                    .join(', ');

                  return (
                    <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">{p.purchaseId}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(p.purchaseDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.supplierName}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{itemsSummary}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                        ₹{(p.grandTotal || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PrivateBusinessDashboard;
