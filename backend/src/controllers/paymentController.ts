import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import Order from '../models/Order';
import Setting from '../models/Setting';
import Customer from '../models/Customer';
import Notification from '../models/Notification';
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
        companyName: 'Green Glide Logistics',
        upiId: 'greenglide@okaxis'
      });
    }

    const upiId = settings.upiId || 'greenglide@okaxis';
    const businessName = settings.companyName || 'Green Glide Logistics';
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

    // Notify BOTH ADMIN_1 and ADMIN_2 registered emails
    try {
      await sendPaymentAttemptAlertEmail(
        '',
        '',
        customer.name,
        invoiceNumber,
        amount,
        now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        customer.customerId
      );
    } catch (eErr) {
      console.error('Non-fatal admin payment email notification error:', eErr);
    }

    // Create in-app notification for both admin portals
    await Notification.create({
      isAdminNotification: true,
      title: 'New Customer Payment Submitted',
      message: `Customer ${customer.name} (${customer.customerId || 'N/A'}) submitted ₹${amount.toLocaleString('en-IN')} for Invoice ${invoiceNumber}.`
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

    const isAdmin = ['ADMIN_1', 'ADMIN_2'].includes(req.user?.role || '');

    const total = await Payment.countDocuments(query);
    const rawPayments = await Payment.find(query)
      .populate('customer', 'customerId name email phone')
      .populate('approvedBy', 'username displayName role email adminId')
      .populate('createdBy', 'username displayName role email adminId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    let processedPayments: any[] = [];

    if (isAdmin) {
      const invoiceNumbers = Array.from(new Set(rawPayments.map(p => p.invoiceNumber)));
      const invoices = await Invoice.find({ invoiceNumber: { $in: invoiceNumbers } }).populate('createdBy', 'username displayName role email adminId');
      const invoiceMap: Record<string, any> = {};
      invoices.forEach(inv => {
        invoiceMap[inv.invoiceNumber] = inv;
      });

      processedPayments = rawPayments.map(p => {
        const doc = p.toObject();
        if (!doc.createdBy && invoiceMap[p.invoiceNumber]?.createdBy) {
          doc.createdBy = invoiceMap[p.invoiceNumber].createdBy;
        }
        return doc;
      });
    } else {
      processedPayments = rawPayments.map(p => {
        const doc = p.toObject();
        delete doc.approvedBy;
        delete doc.approvedAt;
        delete doc.createdBy;
        return doc;
      });
    }

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      payments: processedPayments
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

    const invoice = await Invoice.findById(invoiceId).populate('customer', 'customerId name email phone');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Send email to BOTH ADMIN_1 and ADMIN_2 registered emails
    const customer = invoice.customer as any;
    const customerName = customer?.name || 'Customer';
    const customerId = customer?.customerId || '';
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    await sendPaymentAttemptAlertEmail(
      '',
      '',
      customerName,
      invoice.invoiceNumber,
      invoice.remainingAmount,
      timestamp,
      customerId
    );

    // Create in-app notification for both admin portals
    await Notification.create({
      isAdminNotification: true,
      title: 'New Customer Payment Attempt',
      message: `Customer ${customerName} (${customerId || 'N/A'}) initiated payment for Invoice ${invoice.invoiceNumber} (₹${invoice.remainingAmount.toLocaleString('en-IN')}).`
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Both Admins notified successfully'
    });
  } catch (error) {
    console.error('Error in notifyPaymentAttempt:', error);
    res.status(500).json({ success: false, message: 'Failed to notify admins' });
  }
};

/**
 * Approve / Confirm Customer Payment (ADMIN_1 or ADMIN_2)
 * Uses atomic database update to prevent race conditions and double approval.
 * Sets paymentApprovedAt on the Invoice to start the 7-day QR code retention countdown.
 */
export const approvePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const adminObjId = req.user?.id;

    if (!role || !['ADMIN_1', 'ADMIN_2'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin authorization required.' });
    }

    const approvalTime = new Date();

    // Atomic update: transition status from 'Pending' to 'Received'
    const payment = await Payment.findOneAndUpdate(
      { _id: id, status: 'Pending' },
      { $set: { status: 'Received', approvedAt: approvalTime, approvedBy: adminObjId } },
      { new: true }
    ).populate('customer', 'customerId name email phone');

    if (!payment) {
      const existing = await Payment.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Payment record not found' });
      }
      return res.status(400).json({ success: false, message: 'Payment has already been approved or processed.' });
    }

    // Update invoice balance and record paymentApprovedAt for 7-day QR cleanup
    const invoice = await Invoice.findOne({ invoiceNumber: payment.invoiceNumber });
    if (invoice) {
      invoice.paidAmount += payment.amount;
      invoice.remainingAmount = Math.max(0, invoice.finalAmount - invoice.paidAmount);

      // Set paymentApprovedAt to start the 7-day QR code retention countdown
      if (!(invoice as any).paymentApprovedAt) {
        (invoice as any).paymentApprovedAt = approvalTime;
      }

      if (invoice.remainingAmount === 0) {
        await Order.updateMany(
          { invoiceNumber: payment.invoiceNumber },
          { invoiceStatus: 'Paid' }
        );
      }
      await invoice.save();
    }

    // Notify customer
    const customer: any = payment.customer;
    if (customer) {
      await Notification.create({
        customer: customer._id,
        title: 'Payment Received',
        message: `We received ₹${payment.amount.toLocaleString('en-IN')} for Invoice ${payment.invoiceNumber}. Transaction ID: ${payment.transactionId}`
      });

      try {
        await sendPaymentConfirmationEmail(
          customer.email,
          customer.name,
          payment.invoiceNumber,
          payment.amount,
          payment.transactionId,
          payment.paymentMethod
        );
      } catch (eErr) {
        console.error('Non-fatal customer confirmation email error:', eErr);
      }
    }

    req.app.get('io')?.emit('DATA_UPDATED');

    res.status(200).json({
      success: true,
      message: 'Payment received and confirmed successfully.',
      payment: {
        _id: payment._id,
        invoiceNumber: payment.invoiceNumber,
        amount: payment.amount,
        status: payment.status,
        date: payment.date,
        time: payment.time,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod
      }
    });
  } catch (error) {
    next(error);
  }
};
