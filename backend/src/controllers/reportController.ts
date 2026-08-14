import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Invoice from '../models/Invoice';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
import Order from '../models/Order';

/**
 * Helper to escape CSV field values (RFC 4180 compliant)
 */
const escapeCsv = (val: any): string => {
  if (val === undefined || val === null) return 'N/A';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Format date in DD/MM/YYYY format using business timezone (Asia/Kolkata)
 */
const formatDate = (date: Date | string | undefined | null, fallback = 'Not Approved'): string => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
    return formatter.format(d);
  } catch (e) {
    return fallback;
  }
};

/**
 * Format time in HH:MM:SS (24-hour) using business timezone (Asia/Kolkata)
 */
const formatTime = (date: Date | string | undefined | null, fallback = 'Not Available'): string => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
    return formatter.format(d);
  } catch (e) {
    return fallback;
  }
};

/**
 * Get Dashboard Summary Statistics and Chart Data (Admin Only)
 */
export const getAdminDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Core financial metrics
    const invoices = await Invoice.find({});
    
    let totalSales = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    let overdueInvoicesCount = 0;
    const now = new Date();

    invoices.forEach(inv => {
      totalSales += inv.finalAmount || 0;
      totalCollected += inv.paidAmount || 0;
      totalOutstanding += inv.remainingAmount || 0;

      if (inv.remainingAmount <= 0) {
        paidInvoicesCount++;
      } else {
        if (inv.dueDate && new Date(inv.dueDate) < now) {
          overdueInvoicesCount++;
        } else {
          pendingInvoicesCount++;
        }
      }
    });

    // 2. Customer metrics
    const totalCustomers = await Customer.countDocuments({});

    // 2.5. Total Packages (sum of order quantities)
    const totalPackagesResult = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);
    const totalPackages = totalPackagesResult[0]?.total || 0;

    // 3. Monthly Sales and Collection Chart Data (Last 6 Months)
    const monthlyData: Record<string, { month: string; sales: number; collections: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Pre-populate last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      monthlyData[key] = { month: name, sales: 0, collections: 0 };
    }

    // Group invoices by month
    const recentInvoices = await Invoice.find({ createdAt: { $gte: sixMonthsAgo } });
    recentInvoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { month: name, sales: 0, collections: 0 };
      }
      monthlyData[key].sales += inv.finalAmount || 0;
      monthlyData[key].collections += inv.paidAmount || 0;
    });

    // Handle payments received in last 6 months (for collection accuracy in chart)
    const sixMonthPayments = await Payment.find({ date: { $gte: sixMonthsAgo } });
    sixMonthPayments.forEach(pay => {
      const date = new Date(pay.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;

      if (!monthlyData[key]) {
        monthlyData[key] = { month: name, sales: 0, collections: 0 };
      }
      monthlyData[key].collections += pay.amount || 0;
    });

    // Sort chart data
    const chartData = Object.keys(monthlyData)
      .sort()
      .map(k => monthlyData[k]);

    res.status(200).json({
      success: true,
      stats: {
        totalSales,
        totalCollected,
        totalOutstanding,
        totalPackages,
        customers: {
          total: totalCustomers
        },
        invoices: {
          total: invoices.length,
          paid: paidInvoicesCount,
          pending: pendingInvoicesCount,
          overdue: overdueInvoicesCount
        }
      },
      chartData
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export Invoices Statement Report to CSV / Excel Format (Admin Only)
 * 
 * Column Order:
 * 1. Invoice Number
 * 2. Customer Name
 * 3. Customer ID
 * 4. Customer Email
 * 5. CGST Amount
 * 6. SGST Amount
 * 7. Final Amount
 * 8. Status (Paid / Not Paid)
 * 9. Invoice Created Date (DD/MM/YYYY)
 * 10. Invoice Approved Date (DD/MM/YYYY or Not Approved)
 * 11. Approved By (Admin Name/Username or Not Approved)
 */
export const exportInvoicesCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoices = await Invoice.find({})
      .populate('customer', 'name customerId email phone')
      .sort({ createdAt: -1 });

    const invoiceNumbers = invoices.map(i => i.invoiceNumber);

    // Fetch related payment records for approval lookup
    const payments = await Payment.find({ invoiceNumber: { $in: invoiceNumbers } })
      .populate('approvedBy', 'username displayName role email adminId')
      .sort({ approvedAt: -1, createdAt: -1 });

    const paymentMap: Record<string, any> = {};
    payments.forEach(p => {
      if (!paymentMap[p.invoiceNumber] || p.approvedBy || p.approvedAt) {
        paymentMap[p.invoiceNumber] = p;
      }
    });

    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer ID',
      'Customer Email',
      'CGST Amount',
      'SGST Amount',
      'Final Amount',
      'Status',
      'Invoice Created Date',
      'Invoice Approved Date',
      'Approved By'
    ];

    let csv = '\uFEFF' + headers.join(',') + '\n';

    invoices.forEach(inv => {
      const cust: any = inv.customer || {};
      const customerName = cust.name || 'N/A';
      const customerId = cust.customerId || 'N/A';
      const customerEmail = cust.email || 'N/A';

      // Calculation of CGST and SGST
      const subtotal = (inv.products || []).reduce(
        (acc: number, p: any) => acc + (Number(p.price || 0) * Number(p.quantity || 0)),
        0
      );
      const discountAmount = Number(inv.discount || 0);
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const gstRate = Number(inv.gst || 0);
      const cgstRate = gstRate / 2;
      const sgstRate = gstRate / 2;
      const cgstAmount = (taxableAmount * (cgstRate / 100)).toFixed(2);
      const sgstAmount = (taxableAmount * (sgstRate / 100)).toFixed(2);
      const finalAmount = Number(inv.finalAmount || 0).toFixed(2);

      // Status determination
      const isPaid = (inv.remainingAmount <= 0) || (inv.paidAmount >= inv.finalAmount);
      const status = isPaid ? 'Paid' : 'Not Paid';

      // Created date
      const createdDateStr = formatDate(inv.createdAt, 'N/A');

      // Approval details
      let approvedDateStr = 'Not Approved';
      let approvedByStr = 'Not Approved';

      if (isPaid) {
        const p = paymentMap[inv.invoiceNumber];
        const approvalDateVal = p?.approvedAt || (inv as any).paymentApprovedAt || p?.date || p?.createdAt;
        approvedDateStr = formatDate(approvalDateVal, 'Not Approved');

        const adminObj = p?.approvedBy;
        if (adminObj) {
          approvedByStr = adminObj.displayName || adminObj.username || adminObj.name || 'Admin';
        } else {
          approvedByStr = 'Admin';
        }
      }

      const row = [
        escapeCsv(inv.invoiceNumber),
        escapeCsv(customerName),
        escapeCsv(customerId),
        escapeCsv(customerEmail),
        escapeCsv(cgstAmount),
        escapeCsv(sgstAmount),
        escapeCsv(finalAmount),
        escapeCsv(status),
        escapeCsv(createdDateStr),
        escapeCsv(approvedDateStr),
        escapeCsv(approvedByStr)
      ];

      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-statement-report-${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};

/**
 * Export Client Database Registry to CSV / Excel Format (Admin Only)
 * Dynamically queries current Customer collection in MongoDB Atlas.
 * 
 * Column Order:
 * 1. Customer ID
 * 2. Name
 * 3. Email
 * 4. Phone
 * 5. Address
 * 6. Joining Date
 */
export const exportCustomersCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 });

    const headers = [
      'Customer ID',
      'Name',
      'Email',
      'Phone',
      'Address',
      'Joining Date'
    ];

    let csv = '\uFEFF' + headers.join(',') + '\n';

    customers.forEach(cust => {
      const customerId = cust.customerId || 'N/A';
      const name = cust.name || 'N/A';
      const email = cust.email || 'N/A';
      const phone = cust.phone || 'N/A';
      const address = cust.address || 'N/A';
      const joiningDateStr = formatDate(cust.joiningDate || cust.createdAt, 'N/A');

      const row = [
        escapeCsv(customerId),
        escapeCsv(name),
        escapeCsv(email),
        escapeCsv(phone),
        escapeCsv(address),
        escapeCsv(joiningDateStr)
      ];

      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=client-database-registry-${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};

/**
 * Export Payment Settlement Logs to CSV / Excel Format (Admin Only)
 * 
 * Column Order:
 * 1. Invoice Number
 * 2. Customer Name
 * 3. Customer ID
 * 4. Amount
 * 5. Payment Method ("Manual Admin Approval")
 * 6. Admin Approval Date (DD/MM/YYYY)
 * 7. Admin Approval Time (HH:MM:SS)
 */
export const exportPaymentsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await Payment.find({})
      .populate('customer', 'customerId name email phone')
      .populate('approvedBy', 'username displayName role email adminId')
      .sort({ approvedAt: -1, createdAt: -1 });

    const invoiceNumbers = Array.from(new Set(payments.map(p => p.invoiceNumber)));
    const invoices = await Invoice.find({ invoiceNumber: { $in: invoiceNumbers } })
      .populate('customer', 'customerId name email phone');

    const invoiceMap: Record<string, any> = {};
    invoices.forEach(inv => {
      invoiceMap[inv.invoiceNumber] = inv;
    });

    const headers = [
      'Invoice Number',
      'Customer Name',
      'Customer ID',
      'Amount',
      'Payment Method',
      'Admin Approval Date',
      'Admin Approval Time'
    ];

    let csv = '\uFEFF' + headers.join(',') + '\n';

    payments.forEach(pay => {
      const cust: any = pay.customer || invoiceMap[pay.invoiceNumber]?.customer || {};
      const customerName = cust.name || 'N/A';
      const customerId = cust.customerId || 'N/A';
      const amountStr = Number(pay.amount || 0).toFixed(2);
      
      // Payment method is fixed to "Manual Admin Approval" per business requirement
      const paymentMethod = 'Manual Admin Approval';

      // Admin approval timestamp
      const isPending = pay.status === 'Pending' && !pay.approvedAt;
      let approvalDateStr = 'Not Approved';
      let approvalTimeStr = 'Not Approved';

      if (!isPending) {
        const approvalTimestamp = pay.approvedAt || (invoiceMap[pay.invoiceNumber] as any)?.paymentApprovedAt || pay.date || pay.createdAt;
        approvalDateStr = formatDate(approvalTimestamp, 'Not Approved');
        
        // If time is stored as HH:MM:SS string on the payment record, we can use it or format the Date
        if (pay.approvedAt || (invoiceMap[pay.invoiceNumber] as any)?.paymentApprovedAt) {
          approvalTimeStr = formatTime(approvalTimestamp, 'Not Available');
        } else if (pay.time) {
          approvalTimeStr = pay.time;
        } else {
          approvalTimeStr = formatTime(approvalTimestamp, 'Not Available');
        }
      }

      const row = [
        escapeCsv(pay.invoiceNumber || 'N/A'),
        escapeCsv(customerName),
        escapeCsv(customerId),
        escapeCsv(amountStr),
        escapeCsv(paymentMethod),
        escapeCsv(approvalDateStr),
        escapeCsv(approvalTimeStr)
      ];

      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=payment-settlement-logs-${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};
