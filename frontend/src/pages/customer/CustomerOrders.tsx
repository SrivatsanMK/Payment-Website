import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { ShoppingBag, CalendarDays, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

export const CustomerOrders: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/invoices/orders/history');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      showToast('Failed to load order history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDownloadInvoice = async (invoiceNumber: string) => {
    setDownloadingInvoice(invoiceNumber);
    try {
      // 1. Fetch exact invoice details
      const invoicesRes = await api.get('/invoices', { params: { search: invoiceNumber } });
      const invoice = invoicesRes.data.invoices.find((inv: any) => inv.invoiceNumber === invoiceNumber);
      
      if (!invoice) {
        showToast('Invoice details not found', 'error');
        return;
      }
      
      // 2. Fetch business configurations (settings)
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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          My Order History
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical overview of all inventory materials and machinery purchased.
        </p>
      </div>

      {/* Orders Table */}
      <Card className="p-0 overflow-hidden overflow-x-auto">
        <Table headers={['Invoice Number', 'Quantity per packet', 'Packets count', 'Price', 'CGST', 'SGST', 'Grand Total', 'Billing Date', 'Status', 'Download Invoice']}>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={10} className="px-6 py-8 text-center text-xs text-slate-400">
                No orders recorded.
              </td>
            </tr>
          ) : (
            orders.map((ord, idx) => {
              const cgst = (ord.gst || 0) / 2;
              const sgst = (ord.gst || 0) / 2;
              // Calculate grand total dynamically: (price * quantity) - discount + gst
              const dynamicGrandTotal = (ord.price * ord.quantity) - (ord.discount || 0) + (ord.gst || 0);

              return (
                <tr key={ord._id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                  <td className="px-3.5 py-3 font-bold text-slate-800 dark:text-slate-200">
                    {ord.invoiceNumber}
                  </td>
                  <td className="px-3.5 py-3 font-bold text-slate-800 dark:text-slate-100">
                    {ord.productName}
                  </td>
                  <td className="px-3.5 py-3 text-slate-500">
                    {ord.quantity}
                  </td>
                  <td className="px-3.5 py-3 text-slate-500">
                    ₹{ord.price.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3.5 py-3 text-slate-500 font-medium">
                    ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3.5 py-3 text-slate-500 font-medium">
                    ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3.5 py-3 font-bold text-slate-800 dark:text-slate-100">
                    ₹{dynamicGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3.5 py-3 text-slate-500">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(ord.purchaseDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${ord.invoiceStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {ord.invoiceStatus || 'Unpaid'}
                    </span>
                  </td>

                  <td className="px-3.5 py-3 text-center">
                    {ord.invoiceStatus === 'Paid' ? (
                      <button
                        onClick={() => handleDownloadInvoice(ord.invoiceNumber)}
                        disabled={downloadingInvoice !== null}
                        className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                        title="Download real-looking PDF Invoice"
                      >
                        {downloadingInvoice === ord.invoiceNumber ? (
                          <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        PDF
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Unpaid</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </Card>
    </div>
  );
};

export default CustomerOrders;
