import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { endpoints } from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useSocket } from '../../context/SocketContext';
import { ShoppingBag, CalendarDays, Download, Search, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

const formatAdminName = (adminObj: any): string => {
  if (!adminObj) return 'Unknown';
  if (typeof adminObj === 'string') {
    if (adminObj.toLowerCase().includes('srivatsan')) return 'Akash';
    return adminObj;
  }
  const role = adminObj.role;
  if (role === 'ADMIN_1') return 'Akash';
  if (role === 'ADMIN_2') return 'Hrithik';
  
  const name = adminObj.displayName || adminObj.username || '';
  if (name.toLowerCase().includes('srivatsan')) return 'Akash';
  return name || (role === 'ADMIN_1' ? 'Akash' : 'Hrithik');
};

export const Payments: React.FC = () => {
  const api = useAxios();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/invoices/orders/history');
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (err) {
      showToast('Failed to load payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handleDataUpdated = () => {
      fetchOrders();
    };
    socket.on('DATA_UPDATED', handleDataUpdated);
    return () => {
      socket.off('DATA_UPDATED', handleDataUpdated);
    };
  }, [socket]);

  const handleApprovePayment = async (paymentId: string) => {
    if (!paymentId) return;
    setApprovingId(paymentId);
    try {
      const res = await api.put(endpoints.payments.approve(paymentId));
      if (res.data.success) {
        showToast('Payment received & confirmed successfully', 'success');
        fetchOrders();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve payment', 'error');
      fetchOrders();
    } finally {
      setApprovingId(null);
    }
  };

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
          Payment Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Historical record of all invoice payment transactions & audit logs.
        </p>
      </div>

      {/* Orders Table */}
      <Card className="p-0 overflow-hidden" scrollable>
        <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Table headers={['Invoice Number', 'Customer', 'Product', 'Qty', 'Price', 'CGST', 'SGST', 'Grand Total', 'Billing Date', 'Created By', 'Approved By', 'Status', 'Actions']} minWidth="min-w-[1400px]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-6 py-8 text-center text-xs text-slate-400">
                  No payment transactions recorded.
                </td>
              </tr>
            ) : (
              orders.map((ord) => {
                const cgst = (ord.gst || 0) / 2;
                const sgst = (ord.gst || 0) / 2;
                const dynamicGrandTotal = (ord.price * ord.quantity) - (ord.discount || 0) + (ord.gst || 0);

                const createdByName = ord.createdBy ? formatAdminName(ord.createdBy) : 'Unknown';
                const approvedByName = ord.approvedBy ? formatAdminName(ord.approvedBy) : (ord.invoiceStatus === 'Paid' ? 'Not Recorded' : 'Pending');

                return (
                  <tr key={ord._id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-3.5 py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {ord.invoiceNumber}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                      {ord.customer?.name || 'N/A'}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {ord.productName}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                      {ord.quantity}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                      ₹{ord.price.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 font-medium whitespace-nowrap">
                      ₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 font-medium whitespace-nowrap">
                      ₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      ₹{dynamicGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(ord.purchaseDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {createdByName}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {approvedByName}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {ord.invoiceStatus === 'Paid' ? (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center gap-1.5 justify-center">
                        {ord.invoiceStatus !== 'Paid' && ord.paymentId && (
                          <button
                            onClick={() => handleApprovePayment(ord.paymentId)}
                            disabled={approvingId === ord.paymentId}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                            title="Confirm Payment Received"
                          >
                            {approvingId === ord.paymentId ? (
                              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Confirm
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoice(ord.invoiceNumber)}
                          disabled={downloadingInvoice !== null}
                          className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 text-white rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                          title="Download PDF Invoice"
                        >
                          {downloadingInvoice === ord.invoiceNumber ? (
                            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default Payments;
