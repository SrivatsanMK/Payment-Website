import React, { useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { FileSpreadsheet, Download } from 'lucide-react';
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

  const handleDownload = async (type: 'invoices' | 'customers' | 'payments') => {
    setDownloading(prev => ({ ...prev, [type]: true }));
    
    let url = '';
    if (type === 'invoices') url = endpoints.reports.invoicesCSV;
    if (type === 'customers') url = endpoints.reports.customersCSV;
    if (type === 'payments') url = endpoints.reports.paymentsCSV;

    try {
      const res = await api.get(url, { responseType: 'blob' });
      
      // Create local file download link
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      const filePrefix = type === 'invoices' 
        ? 'invoices-statement-report' 
        : type === 'customers' 
        ? 'client-database-registry' 
        : 'payment-settlement-logs';
      link.setAttribute('download', `${filePrefix}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      const reportName = type === 'invoices'
        ? 'Invoices Statement Report'
        : type === 'customers'
        ? 'Client Database Registry'
        : 'Payment Settlement Logs';
      showToast(`${reportName} downloaded successfully`, 'success');

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
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
    </div>
  );
};

export default Reports;
