import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Invoice from '../models/Invoice';
import Customer from '../models/Customer';
import Order from '../models/Order';
import Notification from '../models/Notification';
import ActivityLog from '../models/ActivityLog';
import { sendInvoiceEmail, sendInvoiceUpdateEmail, sendPaymentConfirmationWithPdfEmail } from '../utils/email';
import Payment from '../models/Payment';

/**
 * Generate unique Invoice Number
 */
const generateInvoiceNumber = async (): Promise<string> => {
  let uniqueNum = '';
  let exists = true;
  while (exists) {
    const randomVal = Math.floor(100000 + Math.random() * 900000); // 6 digits
    uniqueNum = `INV-${randomVal}`;
    const check = await Invoice.findOne({ invoiceNumber: uniqueNum });
    if (!check) exists = false;
  }
  return uniqueNum;
};

/**
 * Create Invoice (Admin Only)
 */
export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let { customerId, products, discount, gst, dueDate } = req.body;

    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid products format' });
      }
    }

    if (!customerId || !products || !products.length) {
      return res.status(400).json({ success: false, message: 'Please enter all required fields' });
    }

    let qrCodeImage = '';
    if (req.file) {
      qrCodeImage = `/uploads/${req.file.filename}`;
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Calculate final amount
    // products: Array of { name, quantity, price }
    let subtotal = 0;
    products.forEach((p: any) => {
      subtotal += p.price * p.quantity;
    });

    const discountAmount = parseFloat(discount as any) || 0;
    const gstRate = parseFloat(gst as any) || 0; // percentage, e.g. 18

    // Final = (Subtotal - Discount) * (1 + GST/100)
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const gstAmount = afterDiscount * (gstRate / 100);
    const finalAmount = afterDiscount + gstAmount;

    const invoiceNumber = await generateInvoiceNumber();
    const invoiceDate = new Date();

    const invoice = await Invoice.create({
      invoiceNumber,
      customer: customer._id,
      products,
      discount: discountAmount,
      gst: gstRate,
      finalAmount,
      paidAmount: 0,
      remainingAmount: finalAmount,
      qrCodeImage,
      dueDate: dueDate ? new Date(dueDate) : invoiceDate
    });

    // Create Order records for each product item so it reflects in Order History
    for (const p of products) {
      const orderSubtotal = p.price * p.quantity;
      const orderDiscountShare = subtotal > 0 ? (orderSubtotal / subtotal) * discountAmount : 0;
      const orderAfterDiscount = Math.max(0, orderSubtotal - orderDiscountShare);
      const orderGstShare = orderAfterDiscount * (gstRate / 100);
      const orderGrandTotal = orderAfterDiscount + orderGstShare;

      const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      await Order.create({
        orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        customer: customer._id,
        productName: p.name,
        quantity: p.quantity,
        price: p.price,
        discount: orderDiscountShare,
        gst: orderGstShare,
        grandTotal: orderGrandTotal,
        purchaseDate: invoiceDate
      });
    }

    // Create Notification for customer
    const formattedAmount = finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    await Notification.create({
      customer: customer._id,
      title: 'New Invoice Received',
      message: `Invoice ${invoiceNumber} for ₹${formattedAmount} has been generated.`
    });

    // Send Email Notification
    try {
      await sendInvoiceEmail(
        customer.email,
        customer.name,
        invoiceNumber,
        finalAmount,
        invoiceDate.toLocaleDateString(),
        products,
        subtotal,
        discountAmount,
        gstRate
      );
    } catch (emailErr) {
      console.error('Invoice email error (non-fatal):', emailErr);
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Invoice Created',
      details: `Created invoice ${invoiceNumber} for customer ${customer.name}. Amount: ₹${finalAmount}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice created successfully',
      invoice
    });

  } catch (error) {
    next(error);
  }
};

/**
 * List Invoices (Admin sees all, Customer sees their own)
 */
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const dateFilter = (req.query.dateFilter as string) || ''; // 'today', 'this_month', 'custom'
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';

    const skip = (page - 1) * limit;
    const query: any = {};

    // Role restrictions: Customer only sees their own invoices
    if (req.user?.role === 'Customer') {
      query.customer = req.user.id;
    } else if (req.query.customer) {
      // Admin filter by specific customer
      query.customer = req.query.customer;
    }

    // Date range filter
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (dateFilter === 'today') {
      query.createdAt = { $gte: todayStart, $lte: todayEnd };
    } else if (dateFilter === 'this_month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (dateFilter === 'custom' && startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Search (by invoice number or customer name)
    if (search) {
      if (req.user?.role === 'ADMIN_1' || req.user?.role === 'ADMIN_2') {
        const matchingCustomers = await Customer.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { customerId: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        const customerIds = matchingCustomers.map(c => c._id);
        
        query.$or = [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { customer: { $in: customerIds } }
        ];
      } else {
        query.invoiceNumber = { $regex: search, $options: 'i' };
      }
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'customerId name email phone address gstNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      invoices
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Invoice Details
 */
export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id).populate('customer', 'customerId name email phone address gstNumber');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Role check
    if (req.user?.role === 'Customer' && (invoice.customer as any)._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to view other invoices' });
    }

    res.status(200).json({
      success: true,
      invoice
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update Invoice (Admin Only)
 */
export const updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { products, discount, gst, dueDate, paidAmount } = req.body;

    const invoice = await Invoice.findById(id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer: any = invoice.customer;

    // Save previous state to check changes
    const prevFinal = invoice.finalAmount;
    const prevRemaining = invoice.remainingAmount;

    if (products && products.length) {
      invoice.products = products;
      
      // Re-calculate final amount
      let subtotal = 0;
      products.forEach((p: any) => {
        subtotal += p.price * p.quantity;
      });
      const discountAmount = discount !== undefined ? discount : invoice.discount;
      const gstRate = gst !== undefined ? gst : invoice.gst;

      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const gstAmount = afterDiscount * (gstRate / 100);
      invoice.finalAmount = afterDiscount + gstAmount;
    } else {
      // Just recalculate with previous products if discount/gst updated
      if (discount !== undefined || gst !== undefined) {
        let subtotal = 0;
        invoice.products.forEach((p: any) => {
          subtotal += p.price * p.quantity;
        });
        const discountAmount = discount !== undefined ? discount : invoice.discount;
        const gstRate = gst !== undefined ? gst : invoice.gst;

        const afterDiscount = Math.max(0, subtotal - discountAmount);
        const gstAmount = afterDiscount * (gstRate / 100);
        invoice.finalAmount = afterDiscount + gstAmount;
      }
    }

    if (discount !== undefined) invoice.discount = discount;
    if (gst !== undefined) invoice.gst = gst;
    if (dueDate) invoice.dueDate = new Date(dueDate);

    if (paidAmount !== undefined) {
      invoice.paidAmount = paidAmount;
    }

    // Set remaining amount
    invoice.remainingAmount = Math.max(0, invoice.finalAmount - invoice.paidAmount);
    
    await invoice.save();

    // Trigger Notification to Customer
    let changeMessage = `Invoice ${invoice.invoiceNumber} has been updated by Admin.`;
    if (invoice.finalAmount !== prevFinal) {
      changeMessage += ` New Total: ₹${invoice.finalAmount.toLocaleString('en-IN')}.`;
    }
    if (invoice.remainingAmount !== prevRemaining) {
      changeMessage += ` Remaining amount due: ₹${invoice.remainingAmount.toLocaleString('en-IN')}.`;
    }

    await Notification.create({
      customer: customer._id,
      title: 'Invoice Updated',
      message: changeMessage
    });

    // Send Email Notification for Update
    try {
      await sendInvoiceUpdateEmail(
        customer.email,
        customer.name,
        invoice.invoiceNumber,
        changeMessage
      );
    } catch (emailErr) {
      console.error('Invoice update email error (non-fatal):', emailErr);
    }

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Invoice Updated',
      details: `Updated invoice ${invoice.invoiceNumber}. Final: ₹${invoice.finalAmount}, Remaining: ₹${invoice.remainingAmount}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      invoice
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Invoice (Admin Only)
 */
export const deleteInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Delete related orders using invoiceNumber
    await Order.deleteMany({ invoiceNumber: invoice.invoiceNumber });

    // Delete invoice
    await Invoice.findByIdAndDelete(id);

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Invoice Deleted',
      details: `Deleted invoice number: ${invoice.invoiceNumber}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice and related orders deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Customer Orders History (Admin and Owner Customer)
 */
export const getCustomerOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {};
    if (req.user?.role === 'Customer') {
      query.customer = req.user.id;
    }

    const orders = await Order.find(query)
      .populate('customer', 'customerId name email phone address gstNumber')
      .sort({ purchaseDate: -1 })
      .lean();

    // Fetch corresponding invoices to check their status (Paid, Pending, etc.)
    const invoiceNumbers = orders.map(o => o.invoiceNumber);
    const invoices = await Invoice.find({ invoiceNumber: { $in: invoiceNumbers } });

    // Map invoiceNumber to status
    const invoiceStatusMap: Record<string, string> = {};
    invoices.forEach(inv => {
      invoiceStatusMap[inv.invoiceNumber] = inv.remainingAmount === 0 ? 'Paid' : 'Pending';
    });

    // Attach invoiceStatus to orders
    const ordersWithInvoiceStatus = orders.map(o => ({
      ...o,
      invoiceStatus: invoiceStatusMap[o.invoiceNumber] || 'Pending'
    }));

    res.status(200).json({
      success: true,
      orders: ordersWithInvoiceStatus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark Invoice as Paid (Admin Only)
 */
export const markAsPaid = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { invoicePdf } = req.body; // Base64 PDF string from frontend

    const invoice = await Invoice.findById(id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer: any = invoice.customer;

    // 1. Update Invoice status
    invoice.paidAmount = invoice.finalAmount;
    invoice.remainingAmount = 0;
    await invoice.save();

    // 2. Update Order invoiceStatus
    await Order.updateMany(
      { invoiceNumber: invoice.invoiceNumber },
      { invoiceStatus: 'Paid' }
    );

    // 3. Create Payment record
    await Payment.create({
      invoiceNumber: invoice.invoiceNumber,
      customer: customer._id,
      amount: invoice.finalAmount,
      paymentMethod: 'Manual Admin Approval',
      transactionId: 'MANUAL-' + Date.now().toString().slice(-6),
      status: 'Settled',
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false })
    });

    // 4. Trigger Email with PDF Attachment
    if (invoicePdf) {
      try {
        await sendPaymentConfirmationWithPdfEmail(
          customer.email,
          customer.name,
          invoice.invoiceNumber,
          invoice.finalAmount,
          req.user?.name || 'Admin',
          'Administrator',
          invoicePdf
        );
      } catch (emailErr) {
        console.error('Mark as paid email error (non-fatal):', emailErr);
      }
    }

    // 5. Activity Logging
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Invoice Marked Paid',
      details: `Marked invoice ${invoice.invoiceNumber} as fully paid. Amount: ₹${invoice.finalAmount}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid and confirmation emailed to customer.',
      invoice
    });
  } catch (error) {
    next(error);
  }
};
