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
import { jsPDF } from 'jspdf';
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
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width || 210;
      const textColor = "#334155";
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(settings.companyName || "Apex Machinery & Hardware", 15, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Premium Machinery, Hardware & Operations", 15, 25);
      doc.text(`Phone: ${settings.supportPhone || "+91 98765 43210"}  |  UPI ID: ${settings.upiId || "apexdealer@okaxis"}`, 15, 32);
      
      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("INVOICE DETAILS", 15, 55);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 15, 63);
      doc.text(`Date of Issue: ${new Date(invoice.createdAt).toLocaleDateString()}`, 15, 70);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 87, pageWidth - 15, 87);
      
      const customer = invoice.customer || {};
      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("BILL TO:", 15, 98);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(customer.name || "Customer", 15, 106);
      doc.setFont("helvetica", "normal");
      doc.text(`Email: ${customer.email || "N/A"}`, 15, 113);
      doc.text(`Phone: ${customer.phone || "N/A"}`, 15, 120);
      doc.text(`Address: ${customer.address || "N/A"}`, 15, 127);
      
      let currentY = 145;
      doc.setFillColor(30, 41, 59);
      doc.rect(15, currentY, pageWidth - 30, 8, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("S.No", 18, currentY + 5.5);
      doc.text("Product Details", 32, currentY + 5.5);
      doc.text("Packets count", 110, currentY + 5.5, { align: "right" });
      doc.text("Price/Packet", 145, currentY + 5.5, { align: "right" });
      doc.text("Subtotal", 190, currentY + 5.5, { align: "right" });
      
      currentY += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor);
      
      let subtotal = 0;
      invoice.products.forEach((p: any, idx: number) => {
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, currentY, pageWidth - 30, 8, "F");
        }
        
        doc.text(String(idx + 1), 18, currentY + 5.5);
        doc.text(p.name, 32, currentY + 5.5);
        doc.text(String(p.quantity), 110, currentY + 5.5, { align: "right" });
        doc.text(p.price.toLocaleString('en-IN'), 145, currentY + 5.5, { align: "right" });
        
        const lineTotal = p.price * p.quantity;
        doc.text(lineTotal.toLocaleString('en-IN'), 190, currentY + 5.5, { align: "right" });
        
        subtotal += lineTotal;
        currentY += 8;
      });
      
      doc.setDrawColor(203, 213, 225);
      doc.line(15, currentY, pageWidth - 15, currentY);
      currentY += 6;
      
      const discount = invoice.discount || 0;
      const taxableAmount = Math.max(0, subtotal - discount);
      const gstRate = invoice.gst || 0;
      const gstAmount = taxableAmount * (gstRate / 100);
      const cgstAmount = gstAmount / 2;
      const sgstAmount = gstAmount / 2;
      const finalAmount = invoice.finalAmount;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const drawSummaryLine = (label: string, value: string, isBold = false) => {
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.text(label, 145, currentY, { align: "right" });
        doc.text(value, 190, currentY, { align: "right" });
        currentY += 5.5;
      };
      
      drawSummaryLine("Subtotal:", `INR ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      if (discount > 0) {
        drawSummaryLine("Discount:", `- INR ${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        drawSummaryLine("Taxable Amount:", `INR ${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
      
      if (gstRate > 0) {
        drawSummaryLine(`CGST (${gstRate / 2}%):`, `INR ${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        drawSummaryLine(`SGST (${gstRate / 2}%):`, `INR ${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
      
      doc.line(120, currentY - 2, pageWidth - 15, currentY - 2);
      currentY += 2;
      
      doc.setFontSize(10.5);
      drawSummaryLine("Grand Total:", `INR ${finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, true);
      
      currentY = Math.max(currentY + 8, 245);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, currentY, pageWidth - 15, currentY);
      currentY += 5;
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor("#64748b");
      doc.text("Thank you for your business!", pageWidth / 2, currentY, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("This is a computer generated invoice and requires no physical signature.", pageWidth / 2, currentY + 4.5, { align: "center" });
      
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
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((card, idx) => (
          <Card key={idx} hoverable className={`glass-card border-l-4 ${card.borderColor} flex flex-col justify-between h-36 py-5 px-6`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 dark:text-slate-300">
                {card.title}
              </span>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                {card.icon}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-white dark:text-white">
                {card.value}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {card.subtext}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Invoices and Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices list */}
        <Card className="lg:col-span-2 glass-card p-0 overflow-hidden flex flex-col justify-between">
          <div className="p-7 border-b border-white/10">
            <h3 className="text-base font-bold text-white dark:text-white">
              Recent Bills & Statements
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your newly issued invoices.
            </p>
          </div>

          <div className="flex-grow max-h-[300px] overflow-y-auto">
            <Table headers={['Invoice No', 'Issue Date', 'Total', 'Actions']}>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-xs text-slate-400">
                    No unpaid billing statements found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="text-xs glass-table-row">
                    <td className="px-6 py-4 font-bold text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      ₹{inv.finalAmount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-4">
                      {inv.status !== 'Paid' ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/pay-invoice/${inv._id}`)}
                          className="py-1.5 px-4 text-xs font-semibold glass-button"
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                            <FileCheck className="h-4 w-4" />
                            Settled
                          </span>
                          <button
                            onClick={() => handleDownloadInvoice(inv.invoiceNumber)}
                            disabled={downloadingInvoice !== null}
                            className="p-1.5 text-slate-300 hover:text-white rounded-xl transition-colors glass-button-secondary"
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
            </Table>
          </div>
        </Card>

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
