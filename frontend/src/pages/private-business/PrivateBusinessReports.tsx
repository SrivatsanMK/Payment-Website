import React, { useEffect, useState, useCallback } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { endpoints } from '../../services/api';
import { exportToExcel } from '../../utils/exportExcel';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import {
  FileText,
  Download,
  Filter,
  ShoppingBag,
  Truck
} from 'lucide-react';

export const PrivateBusinessReports: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [range, setRange] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'vegetable' | 'supplier' | 'purchases'>('summary');
  const [isExporting, setIsExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${endpoints.privateBusiness.reports}?range=${range}`;
      if (range === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      showToast('Failed to load reports data', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, range, startDate, endDate, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Excel Export Handler using exportToExcel
  const handleExportExcel = () => {
    if (!reportData || !reportData.purchases) {
      showToast('No data available to export', 'error');
      return;
    }

    try {
      setIsExporting(true);

      const excelRows: any[] = [];

      reportData.purchases.forEach((p: any) => {
        (p.items || []).forEach((item: any) => {
          excelRows.push({
            'Purchase ID': p.purchaseId,
            'Purchase Date': new Date(p.purchaseDate).toLocaleDateString('en-GB'),
            'Purchase Time': p.purchaseTime || '',
            Supplier: p.supplierName,
            Vegetable: item.vegetableName,
            Quantity: item.quantity,
            Unit: item.unit || 'KG',
            'Rate / Unit (₹)': item.ratePerUnit,
            'Item Amount (₹)': item.itemTotal,
            'Grand Total (₹)': p.grandTotal,
            'Bill Number': p.billNumber || '',
            'Vehicle Number': p.vehicleNumber || ''
          });
        });
      });

      const totals = {
        'Purchase ID': `TOTAL (${reportData.summary?.totalPurchases || 0} Bills)`,
        'Grand Total (₹)': reportData.summary?.totalAmount || 0
      };

      const filename = `Vegetable_Purchase_Report_${range}_${new Date().toISOString().slice(0, 10)}`;
      exportToExcel(excelRows, filename, 'Vegetable Purchases', totals);
      showToast('Excel report downloaded successfully!', 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      showToast('Failed to export report to Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading && !reportData) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const summary = reportData?.summary || {};
  const vegReport = reportData?.vegetableReport || [];
  const supplierReport = reportData?.supplierReport || [];
  const purchases = reportData?.purchases || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" /> Vegetable Purchase Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate procurement summaries, vegetable-wise breakdowns, supplier reports, and export to Excel.
          </p>
        </div>

        <Button
          onClick={handleExportExcel}
          loading={isExporting}
          variant="primary"
          className="flex items-center gap-2 text-xs font-bold py-2 px-4 shadow-lg shadow-teal-600/30"
        >
          <Download className="h-4 w-4" /> Export to Excel
        </Button>
      </div>

      {/* Date Range Filter Ribbon */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-teal-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">Report Period:</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-1.5 font-bold rounded-xl border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="last_6_months">Last 6 Months</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {range === 'custom' && (
              <div className="flex items-center gap-1.5 ml-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 text-[11px] rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 text-[11px] rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <span className="text-[11px] font-semibold text-slate-400">
            Period: {new Date(reportData?.dateFilter?.startDate).toLocaleDateString('en-GB')} — {new Date(reportData?.dateFilter?.endDate).toLocaleDateString('en-GB')}
          </span>
        </div>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Purchase Amount</span>
          <div className="text-base font-black text-slate-900 dark:text-white">
            ₹{(summary.totalAmount || 0).toLocaleString('en-IN')}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Purchased KG</span>
          <div className="text-base font-black text-slate-900 dark:text-white">
            {(summary.totalKG || 0).toLocaleString('en-IN')} KG
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Bills</span>
          <div className="text-base font-black text-slate-900 dark:text-white">
            {summary.totalPurchases || 0}
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Rate / KG</span>
          <div className="text-base font-black text-slate-900 dark:text-white">
            ₹{summary.avgRate || '0.00'}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold gap-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 transition-colors ${activeTab === 'summary' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Summary & Overview
        </button>
        <button
          onClick={() => setActiveTab('vegetable')}
          className={`pb-3 transition-colors ${activeTab === 'vegetable' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Vegetable-wise Breakdown ({vegReport.length})
        </button>
        <button
          onClick={() => setActiveTab('supplier')}
          className={`pb-3 transition-colors ${activeTab === 'supplier' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Supplier-wise Breakdown ({supplierReport.length})
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 transition-colors ${activeTab === 'purchases' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          All Purchase Bills ({purchases.length})
        </button>
      </div>

      {/* Tab 1: Summary Overview */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-teal-500" /> Top Purchased Vegetables
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {vegReport.slice(0, 6).map((v: any) => (
                <div key={v.vegetableName} className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{v.vegetableName}</div>
                    <span className="text-[10px] text-slate-400">{v.count} purchase transactions</span>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900 dark:text-white">{v.totalQuantity} KG</div>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">₹{(v.totalAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-500" /> Top Suppliers / Dealers
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {supplierReport.slice(0, 6).map((s: any) => (
                <div key={s.supplierName} className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{s.supplierName}</div>
                    <span className="text-[10px] text-slate-400">{s.count} bills ({s.totalQuantity} KG)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-slate-900 dark:text-white">₹{(s.totalAmount || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Vegetable-wise Report Table */}
      {activeTab === 'vegetable' && (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Vegetable Name</th>
                  <th className="py-3 px-4">Total Quantity (KG)</th>
                  <th className="py-3 px-4">Average Rate / KG</th>
                  <th className="py-3 px-4">Total Amount Spent</th>
                  <th className="py-3 px-4 rounded-r-xl">Number of Purchases</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {vegReport.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No vegetable data available</td></tr>
                ) : (
                  vegReport.map((v: any) => (
                    <tr key={v.vegetableName} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{v.vegetableName}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">{v.totalQuantity} KG</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">₹{Number(v.avgRate || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 font-extrabold text-teal-600 dark:text-teal-400">₹{(v.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{v.count} purchases</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Supplier-wise Report Table */}
      {activeTab === 'supplier' && (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Supplier / Dealer</th>
                  <th className="py-3 px-4">Total Quantity (KG)</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4 rounded-r-xl">Total Bills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {supplierReport.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No supplier data available</td></tr>
                ) : (
                  supplierReport.map((s: any) => (
                    <tr key={s.supplierName} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.supplierName}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-bold">{s.totalQuantity} KG</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">₹{(s.totalAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{s.count} bills</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 4: All Purchases Table */}
      {activeTab === 'purchases' && (
        <Card className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-white/5 text-slate-500 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Purchase ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 rounded-r-xl">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                {purchases.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No purchase records for selected period</td></tr>
                ) : (
                  purchases.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">{p.purchaseId}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{new Date(p.purchaseDate).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.supplierName}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">₹{(p.grandTotal || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PrivateBusinessReports;
