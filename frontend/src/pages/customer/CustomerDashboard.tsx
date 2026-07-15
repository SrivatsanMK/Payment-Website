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
  CreditCard,
  ChevronRight,
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
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';

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
      
      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width || 210;
      const primaryColor = "#1e293b";
      const accentColor = invoice.status === 'Paid' ? "#10b981" : "#ef4444";
      const textColor = "#334155";
      
      // Top header band (slate-900 background)
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
      
      // Invoice meta info
      doc.setTextColor(textColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("INVOICE DETAILS", 15, 55);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(`Invoice No: ${invoice.invoiceNumber}`, 15, 63);
      doc.text(`Date of Issue: ${new Date(invoice.createdAt).toLocaleDateString()}`, 15, 70);
      
      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 87, pageWidth - 15, 87);
      
      // Customer Info
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
      
      // Products Table Headers
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
      
      // Products Table Rows
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
      
      // Summary Calculations
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
      
      // Footer
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
      // 1. Get customer details with financial metrics
      const detailsRes = await api.get(endpoints.customers.single(user?.id || ''));
      if (detailsRes.data.success) {
        setMetrics(detailsRes.data.metrics);
        setChartData(detailsRes.data.chartData || []);
      }

      // 2. Get recent invoices (unpaid only)
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
      icon: <Package className="h-5 w-5 text-amber-500" />,
      subtext: 'Including paid and unpaid',
      color: 'border-l-4 border-amber-500'
    },
    {
      title: 'Total Amount Purchased',
      value: `₹${(metrics?.totalPurchased || 0).toLocaleString('en-IN')}`,
      icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
      subtext: 'Total ordered items volume',
      color: 'border-l-4 border-indigo-500'
    },
    {
      title: 'Total Amount Paid',
      value: `₹${(metrics?.totalPaid || 0).toLocaleString('en-IN')}`,
      icon: <IndianRupee className="h-5 w-5 text-emerald-500" />,
      subtext: 'Amount successfully settled',
      color: 'border-l-4 border-emerald-500'
    },
    {
      title: 'Remaining Balance Due',
      value: `₹${(metrics?.remainingBalance || 0).toLocaleString('en-IN')}`,
      icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
      subtext: 'Outstanding unpaid balance',
      color: 'border-l-4 border-rose-500'
    },
    {
      title: 'Invoices Issued',
      value: metrics?.totalInvoices || 0,
      icon: <Receipt className="h-5 w-5 text-sky-500" />,
      subtext: 'Total billing statements',
      color: 'border-l-4 border-sky-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Customer Portal Dashboard
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review orders, invoices, and settle outstanding balances safely.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {metricCards.map((card, idx) => (
          <Card key={idx} hoverable className={`${card.color} flex flex-col justify-between h-32 py-4 px-5 bg-white dark:bg-slate-850`}>
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

      {/* Invoices and Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Invoices list */}
        <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col justify-between">
          <div className="p-6">
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-150">
              Recent Bills & Statements
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Your newly issued invoices.
            </p>
          </div>

          <div className="flex-grow max-h-[300px] overflow-y-auto">
            <Table headers={['Invoice No', 'Issue Date', 'Total', 'Actions']}>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-xs text-slate-400">
                    No unpaid billing statements found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      ₹{inv.finalAmount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-6 py-3.5">
                      {inv.status !== 'Paid' ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/pay-invoice/${inv._id}`)}
                          className="py-1 px-3 text-[11px] font-semibold"
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                            <FileCheck className="h-3.5 w-3.5" />
                            Settled
                          </span>
                          <button
                            onClick={() => handleDownloadInvoice(inv.invoiceNumber)}
                            disabled={downloadingInvoice !== null}
                            className="p-1 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 rounded transition-colors"
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
        <Card className="flex flex-col justify-between p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-850 dark:text-slate-100">
              Purchases vs Payments
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 9 }} 
                    stroke="#94a3b8" 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 9 }} 
                    stroke="#94a3b8" 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="purchases" 
                    name="Purchases" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#6366f1", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="payments" 
                    name="Payments" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981", strokeWidth: 2 }}
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
