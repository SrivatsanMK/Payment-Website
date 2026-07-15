import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Invoice from '../models/Invoice';
import Customer from '../models/Customer';
import Payment from '../models/Payment';
import ActivityLog from '../models/ActivityLog';
import Order from '../models/Order';

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

    invoices.forEach(inv => {
      totalSales += inv.finalAmount;
      totalCollected += inv.paidAmount;
      totalOutstanding += inv.remainingAmount;
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
      monthlyData[key].sales += inv.finalAmount;
      monthlyData[key].collections += inv.paidAmount;
    });

    // Handle payments received in last 6 months (for collection accuracy)
    const recentPayments = await Payment.find({ date: { $gte: sixMonthsAgo } });
    recentPayments.forEach(pay => {
      const date = new Date(pay.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;

      if (!monthlyData[key]) {
        monthlyData[key] = { month: name, sales: 0, collections: 0 };
      }
      monthlyData[key].collections += pay.amount;
    });

    // Sort chart data
    const chartData = Object.keys(monthlyData)
      .sort()
      .map(k => monthlyData[k]);

    // 4. Recent activities & login logs
    const recentLogs = await ActivityLog.find({})
      .sort({ createdAt: -1 })
      .limit(10);

    // 5. Recent payments
    const recentPaymentsList = await Payment.find({})
      .populate('customer', 'name customerId')
      .sort({ createdAt: -1 })
      .limit(5);

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
          total: invoices.length
        }
      },
      chartData,
      recentLogs,
      recentPayments: recentPaymentsList
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Export Invoices to CSV Format (Admin Only)
 */
export const exportInvoicesCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoices = await Invoice.find({}).populate('customer', 'name customerId email phone');
    
    let csv = 'Invoice Number,Customer Name,Customer ID,Email,Final Amount,Paid Amount,Remaining Amount,Invoice Date\n';
    
    invoices.forEach(inv => {
      const cust: any = inv.customer || {};
      const name = cust.name ? `"${cust.name.replace(/"/g, '""')}"` : 'N/A';
      const email = cust.email || 'N/A';
      const custId = cust.customerId || 'N/A';
      const createdDateStr = new Date(inv.createdAt).toLocaleDateString();
      
      csv += `${inv.invoiceNumber},${name},${custId},${email},${inv.finalAmount},${inv.paidAmount},${inv.remainingAmount},${createdDateStr}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=invoices-report-${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};

/**
 * Export Customers to CSV Format (Admin Only)
 */
export const exportCustomersCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await Customer.find({});
    
    let csv = 'Customer ID,Name,Email,Phone,Address,Joining Date\n';
    
    customers.forEach(cust => {
      const name = `"${cust.name.replace(/"/g, '""')}"`;
      const address = `"${cust.address.replace(/"/g, '""')}"`;
      const joiningDateStr = new Date(cust.joiningDate).toLocaleDateString();
      
      csv += `${cust.customerId},${name},${cust.email},${cust.phone},${address},${joiningDateStr}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers-report-${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};

/**
 * Export Payments to CSV Format (Admin Only)
 */
export const exportPaymentsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await Payment.find({}).populate('customer', 'name customerId');
    
    let csv = 'Transaction ID,Invoice Number,Customer Name,Customer ID,Amount,Payment Method,Date,Time\n';
    
    payments.forEach(pay => {
      const cust: any = pay.customer || {};
      const name = cust.name ? `"${cust.name.replace(/"/g, '""')}"` : 'N/A';
      const custId = cust.customerId || 'N/A';
      const dateStr = new Date(pay.date).toLocaleDateString();
      
      csv += `${pay.transactionId || 'N/A'},${pay.invoiceNumber},${name},${custId},${pay.amount},${pay.paymentMethod},${dateStr},${pay.time}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments-report-${Date.now()}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    next(error);
  }
};
