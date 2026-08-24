import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import {
  createPayment as repoCreatePayment,
  findPaymentById,
  findPaymentsPaginated,
  approvePaymentAtomic,
} from '../repositories/paymentRepository';
import {
  findInvoiceById,
  findInvoiceByInvoiceNumber,
  updateInvoice as repoUpdateInvoice,
} from '../repositories/invoiceRepository';
import { updateOrderStatusByInvoiceNumber } from '../repositories/orderRepository';
import { getGlobalSettings } from '../repositories/settingRepository';
import { findCustomerById } from '../repositories/customerRepository';
import { findAdminById } from '../repositories/adminRepository';
import { createNotification } from '../repositories/notificationRepository';
import { generateUPIQRCode, generateUPILink } from '../utils/upi';
import { sendPaymentConfirmationEmail, sendPaymentAttemptAlertEmail } from '../utils/email';

/**
 * Generate UPI Details & QR Code for Pay Invoice
 */
export const getUPIPaymentDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const invoice = await findInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer = invoice.customer || (await findCustomerById(invoice.customerId));
    const customerId = customer?.id || customer?._id || invoice.customerId;

    // Role check: Customer can only view their own invoice payment details
    if (req.user?.role === 'Customer' && customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const settings = await getGlobalSettings();
    const upiId = settings.upiId || 'greenglide@okaxis';
    const businessName = settings.companyName || 'Green Glide Logistics';
    const amount = invoice.remainingAmount;
    const invoiceNumber = invoice.invoiceNumber;

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invoice is already fully paid' });
    }

    // Generate UPI Link and QR Code Data URI
    const upiLink = generateUPILink({ upiId, businessName, amount, invoiceNumber });
    let qrCode: string;
    if (invoice.qrCodeImage) {
      qrCode = `http://${req.headers.host}${invoice.qrCodeImage}`;
    } else {
      qrCode = await generateUPIQRCode({ upiId, businessName, amount, invoiceNumber });
    }

    res.status(200).json({
      success: true,
      invoice: {
        id: invoice.id || invoice._id,
        _id: invoice.id || invoice._id,
        invoiceNumber,
        products: invoice.products,
        discount: invoice.discount,
        gst: invoice.gst,
        finalAmount: invoice.finalAmount,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
        createdAt: invoice.createdAt,
        customer
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

    const invoice = await findInvoiceByInvoiceNumber(invoiceNumber);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer = invoice.customer || (await findCustomerById(invoice.customerId));
    const customerId = customer?.id || customer?._id || invoice.customerId;

    // Role check: Customer can only pay their own invoices
    if (req.user?.role === 'Customer' && customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to record this transaction' });
    }

    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];

    const paymentAmount = Number(amount) || 0;

    const payment = await repoCreatePayment({
      invoiceNumber,
      customerId,
      customer: {
        _id: customerId,
        id: customerId,
        customerId: customer?.customerId,
        name: customer?.name,
        email: customer?.email,
        phone: customer?.phone,
      },
      amount: paymentAmount,
      date: now.toISOString(),
      time: timeString,
      status: 'Completed',
      transactionId: transactionId ? transactionId.trim() : `TXN-${Date.now()}`,
      paymentMethod
    });

    // Update invoice amounts
    const newPaidAmount = (Number(invoice.paidAmount) || 0) + paymentAmount;
    const newRemainingAmount = Math.max(0, (Number(invoice.finalAmount) || 0) - newPaidAmount);

    const updatedInvoiceUpdates: any = {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
    };

    if (newRemainingAmount === 0) {
      updatedInvoiceUpdates.paymentApprovedAt = now.toISOString();
      await updateOrderStatusByInvoiceNumber(invoiceNumber, 'Paid');
    }

    await repoUpdateInvoice(invoice.id || invoice._id || '', updatedInvoiceUpdates);

    // Notify customer
    if (customer) {
      await createNotification({
        customerId,
        customer: {
          _id: customerId,
          customerId: customer.customerId,
          name: customer.name,
        },
        title: 'Payment Received successfully',
        message: `We received ₹${paymentAmount.toLocaleString('en-IN')} for Invoice ${invoiceNumber}. Transaction ID: ${payment.transactionId}`
      });

      // Send confirmation email
      if (customer.email) {
        try {
          await sendPaymentConfirmationEmail(
            customer.email,
            customer.name || 'Valued Customer',
            invoiceNumber,
            paymentAmount,
            payment.transactionId,
            paymentMethod
          );
        } catch (eErr) {
          console.error('Customer payment email error:', eErr);
        }
      }
    }

    // Notify Admins
    try {
      await sendPaymentAttemptAlertEmail(
        '',
        '',
        customer?.name || 'Customer',
        invoiceNumber,
        paymentAmount,
        now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        customer?.customerId || ''
      );
    } catch (eErr) {
      console.error('Non-fatal admin payment email notification error:', eErr);
    }

    // In-app notification for admin portal
    await createNotification({
      isAdminNotification: true,
      title: 'New Customer Payment Submitted',
      message: `Customer ${customer?.name || 'Customer'} (${customer?.customerId || 'N/A'}) submitted ₹${paymentAmount.toLocaleString('en-IN')} for Invoice ${invoiceNumber}.`
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      remainingAmount: newRemainingAmount
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Payments History
 */
export const getPaymentsHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const isAdmin = ['ADMIN_1', 'ADMIN_2'].includes(req.user?.role || '');
    const customerId = req.user?.role === 'Customer' ? req.user.id : undefined;

    const result = await findPaymentsPaginated({
      page,
      limit,
      search,
      customerId,
      isAdmin,
    });

    let processedPayments: any[] = [];
    if (isAdmin) {
      processedPayments = result.payments;
    } else {
      processedPayments = result.payments.map((p) => {
        const doc: any = { ...p };
        delete doc.approvedBy;
        delete doc.approvedAt;
        delete doc.createdBy;
        return doc;
      });
    }

    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      pages: result.pages,
      payments: processedPayments
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Notify Admin of a Payment Attempt
 */
export const notifyPaymentAttempt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await findInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer = invoice.customer || (await findCustomerById(invoice.customerId));
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

    await createNotification({
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
 */
export const approvePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const role = req.user?.role;
    const adminObjId = req.user?.id;

    if (!role || !['ADMIN_1', 'ADMIN_2'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied. Admin authorization required.' });
    }

    let adminSnapshot: any = adminObjId;
    if (adminObjId) {
      const admin = await findAdminById(adminObjId);
      if (admin) {
        adminSnapshot = {
          _id: admin.id || admin._id,
          id: admin.id || admin._id,
          username: admin.username,
          displayName: admin.displayName || admin.username,
          role: admin.role,
          email: admin.email,
          adminId: admin.adminId,
        };
      }
    }

    const approvalTime = new Date();

    // Atomic update
    const payment = await approvePaymentAtomic(id, adminSnapshot);

    if (!payment) {
      const existing = await findPaymentById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Payment record not found' });
      }
      return res.status(400).json({ success: false, message: 'Payment has already been approved or processed.' });
    }

    // Update invoice balance and set paymentApprovedAt
    const invoice = await findInvoiceByInvoiceNumber(payment.invoiceNumber);
    if (invoice) {
      const newPaidAmount = (Number(invoice.paidAmount) || 0) + Number(payment.amount);
      const newRemainingAmount = Math.max(0, (Number(invoice.finalAmount) || 0) - newPaidAmount);

      const invUpdates: any = {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
      };

      if (!invoice.paymentApprovedAt) {
        invUpdates.paymentApprovedAt = approvalTime.toISOString();
      }

      if (newRemainingAmount === 0) {
        await updateOrderStatusByInvoiceNumber(payment.invoiceNumber, 'Paid');
      }

      await repoUpdateInvoice(invoice.id || invoice._id || '', invUpdates);
    }

    // Notify customer
    const customer = payment.customer || (await findCustomerById(payment.customerId));
    if (customer) {
      await createNotification({
        customerId: customer.id || customer._id,
        customer: {
          _id: customer.id || customer._id,
          customerId: customer.customerId,
          name: customer.name,
        },
        title: 'Payment Received',
        message: `We received ₹${Number(payment.amount).toLocaleString('en-IN')} for Invoice ${payment.invoiceNumber}. Transaction ID: ${payment.transactionId}`
      });

      if (customer.email) {
        try {
          await sendPaymentConfirmationEmail(
            customer.email,
            customer.name || 'Valued Customer',
            payment.invoiceNumber,
            payment.amount,
            payment.transactionId,
            payment.paymentMethod
          );
        } catch (eErr) {
          console.error('Non-fatal customer confirmation email error:', eErr);
        }
      }
    }

    req.app.get('io')?.emit('DATA_UPDATED');

    res.status(200).json({
      success: true,
      message: 'Payment received and confirmed successfully.',
      payment: {
        _id: payment.id || payment._id,
        id: payment.id || payment._id,
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
