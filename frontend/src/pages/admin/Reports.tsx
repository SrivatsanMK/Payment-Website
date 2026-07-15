import React, { useState, useEffect } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import { 
  FileSpreadsheet, 
  Download, 
  BarChart4, 
  Printer, 
  RefreshCw,
  Package,
  IndianRupee,
  Users,
  AlertCircle
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
import Spinner from '../../components/ui/Spinner';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export const Reports: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();
  
  const [downloading, setDownloading] = useState<Record<string, boolean>>({
    invoices: false,
    customers: false,
    payments: false
  });
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.get(endpoints.reports.dashboard);
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchDashboard();
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket]);

  const handleDownload = async (type: 'invoices' | 'customers' | 'payments') => {
    setDownloading(prev => ({ ...prev, [type]: true }));
    
    let url = '';
    if (type === 'invoices') url = endpoints.reports.invoicesCSV;
    if (type === 'customers') url = endpoints.reports.customersCSV;
    if (type === 'payments') url = endpoints.reports.paymentsCSV;

    try {
      const res = await api.get(url, { responseType: 'blob' });
      
      // Create local file download link
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${type}-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded successfully`, 'success');

    } catch (error) {
      showToast(`Failed to export ${type} report`, 'error');
    } finally {
      setDownloading(prev => ({ ...prev, [type]: false }));
    }
  };

  const reportsList = [
    {
      id: 'invoices',
      title: 'Invoices Statement Report',
      description: 'Comprehensive sheet containing billing amount, GST, discounts, payment status and customer associations.',
      icon: <FileSpreadsheet className="h-6 w-6 text-indigo-500" />
    },
    {
      id: 'customers',
      title: 'Client Database Registry',
      description: 'Directory of registered clients including profile details, contact settings, GST registry and status states.',
      icon: <FileSpreadsheet className="h-6 w-6 text-sky-500" />
    },
    {
      id: 'payments',
      title: 'Payment Settlement Logs',
      description: 'Audit tracking sheet containing transaction codes, billing numbers, amount received and payment channels.',
      icon: <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Analytics & Export Panel
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Download CSV and Excel compliant spreadsheets representing business operational states.
        </p>
      </div>

      {/* Reports Listing Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportsList.map((report) => (
          <Card key={report.id} className="flex flex-col justify-between h-56 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {report.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  CSV / XLS
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
                {report.title}
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {report.description}
              </p>
            </div>
            
            <Button
              onClick={() => handleDownload(report.id as any)}
              loading={downloading[report.id]}
              className="w-full text-xs font-semibold py-2 flex gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download Spreadsheet
            </Button>
          </Card>
        ))}
      </div>

      {/* Printable summary section trigger */}
      <Card className="p-6 space-y-4 print:hidden">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-100">
              Printable Business Summary
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Generate a printable dashboard overview showing critical business graphs.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="flex gap-1.5 text-xs py-2">
            <Printer className="h-4 w-4" />
            Print Dashboard
          </Button>
        </div>
      </Card>
      {/* The Printable Dashboard Overview */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 print:block">
          Business Overview Summary
        </h2>
        {loadingDashboard ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="p-4 border-l-4 border-amber-500 flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Packages Dispatched</span>
                <span className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{dashboardData?.stats?.totalPackages || 0}</span>
              </Card>
              <Card className="p-4 border-l-4 border-emerald-500 flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Collected</span>
                <span className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">₹{(dashboardData?.stats?.totalCollected || 0).toLocaleString('en-IN')}</span>
              </Card>
              <Card className="p-4 border-l-4 border-rose-500 flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Outstanding Dues</span>
                <span className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">₹{(dashboardData?.stats?.totalOutstanding || 0).toLocaleString('en-IN')}</span>
              </Card>
              <Card className="p-4 border-l-4 border-sky-500 flex flex-col">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Customers</span>
                <span className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{dashboardData?.stats?.customers?.total || 0}</span>
              </Card>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-4 flex flex-col">
                <h3 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-100">Packing Revenue vs Collections</h3>
                <div className="h-64">
                  {dashboardData?.chartData && dashboardData.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="sales" name="Revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="collections" name="Collections" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No chart data available.</div>
                  )}
                </div>
              </Card>

              <Card className="p-4 flex flex-col">
                <h3 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-100">Invoice Status Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { name: 'Paid', value: dashboardData?.stats?.invoices?.paid || 0, fill: '#10b981' },
                      { name: 'Pending', value: dashboardData?.stats?.invoices?.pending || 0, fill: '#f59e0b' },
                      { name: 'Overdue', value: dashboardData?.stats?.invoices?.overdue || 0, fill: '#f43f5e' }
                    ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                      <Line dataKey="value" name="Count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
