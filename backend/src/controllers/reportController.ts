import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { findAllInvoices } from '../repositories/invoiceRepository';
import { findAllCustomers } from '../repositories/customerRepository';
import { findAllPayments } from '../repositories/paymentRepository';
import { getActiveCategories } from '../repositories/categoryRepository';

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
    const invoices = await findAllInvoices();
    
    let totalSales = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;
    let overdueInvoicesCount = 0;
    const now = new Date();

    invoices.forEach((inv) => {
      totalSales += Number(inv.finalAmount) || 0;
      totalCollected += Number(inv.paidAmount) || 0;
      totalOutstanding += Number(inv.remainingAmount) || 0;

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
    const allCustomers = await findAllCustomers();
    const totalCustomers = allCustomers.length;

    // 2.5. Category-wise and Total Packages Dispatched calculation
    const categories = await getActiveCategories();

    const categoryMap = new Map<string, { categoryId: string; categoryName: string; packagesDispatched: number }>();
    for (const cat of categories) {
      const catId = cat.id || cat._id || '';
      categoryMap.set(cat.name.toLowerCase().trim(), {
        categoryId: catId,
        categoryName: cat.name,
        packagesDispatched: 0
      });
    }

    const matchCategoryForItem = (p: any): string | null => {
      if (p.category && String(p.category).trim()) {
        const catKey = String(p.category).toLowerCase().trim();
        if (categoryMap.has(catKey)) return catKey;
        for (const [key] of categoryMap) {
          if (key === catKey || key.startsWith(catKey) || catKey.startsWith(key)) {
            return key;
          }
        }
      }

      const productName = String(p.name || '').toLowerCase().trim();
      for (const cat of categories) {
        const catKey = cat.name.toLowerCase().trim();
        for (const item of (cat.items || [])) {
          if (item.isActive === false) continue;
          const itemName = item.name.toLowerCase().trim();
          if (productName.startsWith(itemName) || productName.includes(itemName)) {
            return catKey;
          }
        }
        if (productName.includes(catKey)) {
          return catKey;
        }
      }

      return null;
    };

    let totalPackages = 0;
    let otherPackages = 0;

    invoices.forEach((inv) => {
      if (Array.isArray(inv.products)) {
        inv.products.forEach((p: any) => {
          const qty = Number(p.quantity) || 0;
          totalPackages += qty;

          const matchedKey = matchCategoryForItem(p);
          if (matchedKey && categoryMap.has(matchedKey)) {
            const entry = categoryMap.get(matchedKey)!;
            entry.packagesDispatched += qty;
          } else {
            otherPackages += qty;
          }
        });
      }
    });

    const categoryPackages = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      percentage: totalPackages > 0 ? Number(((c.packagesDispatched / totalPackages) * 100).toFixed(1)) : 0
    }));

    if (otherPackages > 0) {
      categoryPackages.push({
        categoryId: 'other',
        categoryName: 'Other Items',
        packagesDispatched: otherPackages,
        percentage: totalPackages > 0 ? Number(((otherPackages / totalPackages) * 100).toFixed(1)) : 0
      });
    }

    categoryPackages.sort((a, b) => b.packagesDispatched - a.packagesDispatched);

    // 3. Monthly Sales and Collection Chart Data (Last 6 Months)
    const monthlyData: Record<string, { month: string; sales: number; collections: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      monthlyData[key] = { month: name, sales: 0, collections: 0 };
    }

    invoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      if (date >= sixMonthsAgo) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = { month: name, sales: 0, collections: 0 };
        }
        monthlyData[key].sales += Number(inv.finalAmount) || 0;
        monthlyData[key].collections += Number(inv.paidAmount) || 0;
      }
    });

    const payments = await findAllPayments();
    payments.forEach((pay) => {
      const date = new Date(pay.date);
      if (date >= sixMonthsAgo) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;

        if (!monthlyData[key]) {
          monthlyData[key] = { month: name, sales: 0, collections: 0 };
        }
        monthlyData[key].collections += Number(pay.amount) || 0;
      }
    });

    const chartData = Object.keys(monthlyData)
      .sort()
      .map((k) => monthlyData[k]);

    res.status(200).json({
      success: true,
      stats: {
        totalSales,
        totalCollected,
        totalOutstanding,
        totalPackages,
        categoryPackages,
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
 */
export const exportInvoicesCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoices = await findAllInvoices();
    invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const payments = await findAllPayments();
    const paymentMap: Record<string, any> = {};
    payments.forEach((p) => {
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

    invoices.forEach((inv) => {
      const cust: any = inv.customer || {};
      const customerName = cust.name || 'N/A';
      const customerId = cust.customerId || 'N/A';
      const customerEmail = cust.email || 'N/A';

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

      const isPaid = (inv.remainingAmount <= 0) || (inv.paidAmount >= inv.finalAmount);
      const status = isPaid ? 'Paid' : 'Not Paid';

      const createdDateStr = formatDate(inv.createdAt, 'N/A');

      let approvedDateStr = 'Not Approved';
      let approvedByStr = 'Not Approved';

      if (isPaid) {
        const p = paymentMap[inv.invoiceNumber];
        const approvalDateVal = p?.approvedAt || inv.paymentApprovedAt || p?.date || p?.createdAt;
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
 */
export const exportCustomersCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await findAllCustomers();
    customers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const headers = [
      'Customer ID',
      'Name',
      'Email',
      'Phone',
      'Address',
      'Joining Date'
    ];

    let csv = '\uFEFF' + headers.join(',') + '\n';

    customers.forEach((cust) => {
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
 */
export const exportPaymentsCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await findAllPayments();
    payments.sort((a, b) => new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime());

    const invoices = await findAllInvoices();
    const invoiceMap: Record<string, any> = {};
    invoices.forEach((inv) => {
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

    payments.forEach((pay) => {
      const cust: any = pay.customer || invoiceMap[pay.invoiceNumber]?.customer || {};
      const customerName = cust.name || 'N/A';
      const customerId = cust.customerId || 'N/A';
      const amountStr = Number(pay.amount || 0).toFixed(2);
      const paymentMethod = 'Manual Admin Approval';

      const isPending = pay.status === 'Pending' && !pay.approvedAt;
      let approvalDateStr = 'Not Approved';
      let approvalTimeStr = 'Not Approved';

      if (!isPending) {
        const approvalTimestamp = pay.approvedAt || invoiceMap[pay.invoiceNumber]?.paymentApprovedAt || pay.date || pay.createdAt;
        approvalDateStr = formatDate(approvalTimestamp, 'Not Approved');
        
        if (pay.approvedAt || invoiceMap[pay.invoiceNumber]?.paymentApprovedAt) {
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
