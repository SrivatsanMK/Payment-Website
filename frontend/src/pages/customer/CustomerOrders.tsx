import React, { useEffect, useState } from 'react';
import { useAxios } from '../../hooks/useAxios';
import { useToast } from '../../components/ui/Toast';
import { ShoppingBag, CalendarDays, Download } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { jsPDF } from 'jspdf';

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
      
      // Status Badge removed
      
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
