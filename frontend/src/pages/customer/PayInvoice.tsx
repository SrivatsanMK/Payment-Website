import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAxios } from "../../hooks/useAxios";
import { useToast } from "../../components/ui/Toast";
import {
  ArrowLeft, QrCode, Zap, FileText,
  Calendar, Tag, Percent, Receipt, Loader2
} from "lucide-react";
import Card from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";

export const PayInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const api = useAxios();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [paying, setPaying] = useState(false);

  /* ─── Fetch invoice details ─── */
  const fetchData = async () => {
    try {
      const res = await api.get(`/payments/upi-details/${id}`);
      if (res.data.success) {
        setData(res.data);
        if (res.data.invoice.status === "Paid") setPaid(true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to fetch payment details", "error");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handlePayNow = async () => {
    if (data?.upi?.upiLink) {
      setPaying(true);
      try {
        // Notify admin that payment was attempted
        await api.post('/payments/notify-attempt', { invoiceId: id });
      } catch (err) {
        console.error("Failed to notify admin", err);
      } finally {
        setPaying(false);
        // Redirect to UPI app regardless of whether notification succeeded
        window.location.href = data.upi.upiLink;
      }
    } else {
      showToast("UPI Link not available", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { upi, invoice } = data || {};
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const subtotal = (invoice.products || []).reduce((s: number, p: any) => s + p.price * p.quantity, 0);
  const discount = invoice.discount || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const gstRate = invoice.gst || 0;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgstAmt = afterDiscount * (cgstRate / 100);
  const sgstAmt = afterDiscount * (sgstRate / 100);

  /* ─── PAID SUCCESS SCREEN ─── */
  if (paid) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-bounce">
            <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Payment Confirmed!</h2>
          <p className="text-sm text-slate-500">
            Invoice <strong className="text-slate-800 dark:text-slate-200">{invoice.invoiceNumber}</strong> has been marked as <strong className="text-emerald-500">Paid</strong>. Thank you!
          </p>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl px-5 py-3 w-full text-sm font-bold text-emerald-700 dark:text-emerald-300">
            ₹{fmt(invoice.finalAmount)} — Fully Settled
          </div>
          <Button onClick={() => navigate("/dashboard")} className="w-full">Back to Dashboard</Button>
          <Link to="/payments/history" className="text-xs text-primary-500 hover:underline">View Payment History</Link>
        </div>
      </div>
    );
  }

  /* ─── PAYMENT PAGE ─── */
  return (
    <div className="p-4 md:p-6 space-y-5">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">

        {/* ── LEFT: Invoice Details ── */}
        <div className="w-full lg:max-w-lg">
          <Card className="p-6 space-y-5 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                <FileText className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Invoice Details</h3>
                <p className="text-xs text-slate-400">{invoice.invoiceNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoice Date</span>
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Products</p>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-xs min-w-[320px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/50">
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500">Item</th>
                      <th className="text-center px-3 py-2.5 font-bold text-slate-500">Qty</th>
                      <th className="text-right px-3 py-2.5 font-bold text-slate-500">Price</th>
                      <th className="text-right px-3 py-2.5 font-bold text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.products || []).map((p: any, i: number) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{p.name}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{p.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-500">₹{fmt(p.price)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-100">₹{fmt(p.price * p.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Breakdown</p>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">₹{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-red-500">
                  <span>Flat Discount</span>
                  <span className="font-semibold">− ₹{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> CGST ({cgstRate}%)</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">₹{fmt(cgstAmt)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1"><Percent className="h-3 w-3" /> SGST ({sgstRate}%)</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">₹{fmt(sgstAmt)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-2">
                <span className="flex items-center gap-1.5"><Receipt className="h-4 w-4 text-primary-500" /> Grand Total</span>
                <span className="text-primary-500">₹{fmt(invoice.finalAmount)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Already Paid</span>
                  <span className="font-semibold">− ₹{fmt(invoice.paidAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-2.5 mt-1">
                <span>Amount Payable Now</span>
                <span>₹{fmt(upi?.amount ?? invoice.remainingAmount)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── RIGHT: Pay via UPI ── */}
        <div className="w-full lg:max-w-sm">
          <Card className="flex flex-col items-center p-6 text-center space-y-5 shadow-xl border border-slate-100 dark:border-slate-800">
            <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-inner border border-slate-200">
              {data?.upi?.qrCode ? (
                <img src={data.upi.qrCode} alt="UPI Payment QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                  <QrCode className="h-10 w-10 mb-2" />
                  <span className="text-[10px] font-semibold">QR NOT AVAILABLE</span>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Scan QR Code to Pay</h3>
              <p className="text-xs text-slate-400 mt-1">Scan using any UPI Payment App</p>
            </div>

            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              ₹{fmt(upi?.amount ?? invoice.remainingAmount)}
            </div>

            <div className="w-full pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={handlePayNow}
                disabled={paying}
                className="w-full py-3 text-sm font-bold shadow-lg bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" /> Pay via UPI Apps
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PayInvoice;
