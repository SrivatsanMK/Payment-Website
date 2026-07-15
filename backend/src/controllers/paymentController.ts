import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import Order from '../models/Order';
import Setting from '../models/Setting';
import Customer from '../models/Customer';
import Notification from '../models/Notification';
import ActivityLog from '../models/ActivityLog';
import { generateUPIQRCode, generateUPILink } from '../utils/upi';
import { sendPaymentConfirmationEmail, sendPaymentAttemptAlertEmail } from '../utils/email';

/**
 * Generate UPI Details & QR Code for Pay Invoice (Admin or Customer)
 */
export const getUPIPaymentDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // Invoice ID

    const invoice = await Invoice.findById(id).populate('customer', 'customerId name email phone');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Role check: Customer can only view their own invoice payment details
    if (req.user?.role === 'Customer' && invoice.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get company settings
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        companyName: 'Dealer Business Hub',
        upiId: 'dealer@okaxis'
      });
    }

    const upiId = settings.upiId || 'dealer@okaxis';
    const businessName = settings.companyName || 'Dealer Business Hub';
    const amount = invoice.remainingAmount;
    const invoiceNumber = invoice.invoiceNumber;

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice is already fully paid' });
    }

    // Generate UPI Link and QR Code Data URI
    const upiLink = generateUPILink({ upiId, businessName, amount, invoiceNumber });
    let qrCode;
    if ((invoice as any).qrCodeImage) {
      qrCode = `http://${req.headers.host}${(invoice as any).qrCodeImage}`;
    } else {
      qrCode = await generateUPIQRCode({ upiId, businessName, amount, invoiceNumber });
    }

    res.status(200).json({
      success: true,
      invoice: {
        id: invoice._id,
        invoiceNumber,
        products: invoice.products,
        discount: invoice.discount,
        gst: invoice.gst,
        finalAmount: invoice.finalAmount,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
        createdAt: invoice.createdAt,
        customer: invoice.customer
      },
      upi: {
        upiId,
        businessName,
        amount,
        upiLink,
        qrCode
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Process and Log Completed Payment Transaction
 */
export const recordPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { invoiceNumber, amount, transactionId, paymentMethod } = req.body;

    if (!invoiceNumber || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Please enter invoice number, amount and payment method' });
    }

    const invoice = await Invoice.findOne({ invoiceNumber }).populate('customer');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer: any = invoice.customer;

    // Role check: Customer can only pay their own invoices
    if (req.user?.role === 'Customer' && customer._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to record this transaction' });
    }

    // Record the payment in history
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const payment = await Payment.create({
      invoiceNumber,
      customer: customer._id,
      amount,
      date: now,
      time: timeString,
      status: 'Completed',
      transactionId: transactionId ? transactionId.trim() : `TXN-${Date.now()}`,
      paymentMethod
    });

    // Update the invoice amounts
    invoice.paidAmount += amount;
    invoice.remainingAmount = Math.max(0, invoice.finalAmount - invoice.paidAmount);

    if (invoice.remainingAmount === 0) {
      // Update all orders linked to this invoice so Download Invoice button shows for customer
      await Order.updateMany(
        { invoiceNumber: invoiceNumber },
        { invoiceStatus: 'Paid' }
      );
    }

    await invoice.save();

    // Notify customer
    await Notification.create({
      customer: customer._id,
      title: 'Payment Received successfully',
      message: `We received ₹${amount.toLocaleString('en-IN')} for Invoice ${invoiceNumber}. Transaction ID: ${payment.transactionId}`
    });

    // Send confirmation email
    await sendPaymentConfirmationEmail(
      customer.email,
      customer.name,
      invoiceNumber,
      amount,
      payment.transactionId,
      paymentMethod
    );

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id || customer._id,
      userRole: req.user?.role || 'Customer',
      action: 'Payment Recorded',
      details: `Recorded payment of ₹${amount} for invoice ${invoiceNumber}. Method: ${paymentMethod}, Status: Completed`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      remainingAmount: invoice.remainingAmount
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Payments History (Admin sees all, Customer sees their own)
 */
export const getPaymentsHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const skip = (page - 1) * limit;
    const query: any = {};

    // Role restrictions: Customer only sees their own payments
    if (req.user?.role === 'Customer') {
      query.customer = req.user.id;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('customer', 'customerId name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      payments
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Notify Admin of a Payment Attempt (Customer clicking "Pay via UPI Apps")
 */
export const notifyPaymentAttempt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findById(invoiceId).populate('customer', 'name');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const adminSettings = await Setting.findOne();
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@example.com';
    const adminName = 'Admin';
    const customerName = (invoice.customer as any)?.name || 'Customer';
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // We can run this async without awaiting if we don't want to block the response,
    // but waiting ensures it sends. Let's await it.
    await sendPaymentAttemptAlertEmail(
      adminEmail,
      adminName,
      customerName,
      invoice.invoiceNumber,
      invoice.remainingAmount,
      timestamp
    );

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true, message: 'Admin notified successfully' });
  } catch (error) {
    console.error('Error in notifyPaymentAttempt:', error);
    // Even if email fails, we shouldn't break the user's flow, but we can log it.
    res.status(500).json({ success: false, message: 'Failed to notify admin' });
  }
};
