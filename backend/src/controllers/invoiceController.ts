import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import {
  createInvoice as repoCreateInvoice,
  findInvoiceById,
  findInvoicesPaginated,
  updateInvoice as repoUpdateInvoice,
  deleteInvoice as repoDeleteInvoice,
} from '../repositories/invoiceRepository';
import { findCustomerById } from '../repositories/customerRepository';
import {
  createOrdersBulk,
  findAllOrders,
  findOrdersByCustomerId,
  updateOrderStatusByInvoiceNumber,
  deleteOrdersByInvoiceNumber,
} from '../repositories/orderRepository';
import {
  createPayment as repoCreatePayment,
  findPaymentsByInvoiceNumbersBulk,
  findPaymentsByInvoiceNumber,
} from '../repositories/paymentRepository';
import { createNotification } from '../repositories/notificationRepository';
import { findAdminById } from '../repositories/adminRepository';
import { sendInvoiceEmail, sendInvoiceUpdateEmail, sendPaymentConfirmationWithPdfEmail } from '../utils/email';

/**
 * Create Invoice (Admin Only)
 */
export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let { customerId, products, discount, gst, dueDate, deliveryAddress, shippedAddress, vehicleNumber, vehicleNo, transportMode } = req.body;

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

    const customer = await findCustomerById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Calculate final amount
    let subtotal = 0;
    products.forEach((p: any) => {
      subtotal += (Number(p.price) || 0) * (Number(p.quantity) || 0);
    });

    const discountAmount = parseFloat(discount as any) || 0;
    const gstRate = parseFloat(gst as any) || 0;

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const gstAmount = afterDiscount * (gstRate / 100);
    const finalAmount = afterDiscount + gstAmount;

    const invoiceDate = new Date();

    const finalDeliveryAddress = (deliveryAddress !== undefined && deliveryAddress !== null && String(deliveryAddress).trim() !== '')
      ? String(deliveryAddress).trim()
      : ((shippedAddress !== undefined && shippedAddress !== null && String(shippedAddress).trim() !== '')
        ? String(shippedAddress).trim()
        : (customer.address || ''));

    const finalVehicleNumber = (vehicleNumber || vehicleNo || '').trim().toUpperCase();
    if (finalVehicleNumber) {
      const vehicleRegex = /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/;
      if (!vehicleRegex.test(finalVehicleNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid vehicle number in the format LL 00 L 0000 or LL 00 LL 0000.'
        });
      }
    }
    const finalTransportMode = (transportMode || 'Road').trim();

    // Admin createdBy snapshot
    let createdBySnapshot: any = req.user?.id;
    if (req.user?.id) {
      const admin = await findAdminById(req.user.id);
      if (admin) {
        createdBySnapshot = {
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

    const invoice = await repoCreateInvoice({
      customerId: customer.id || customer._id,
      customer: {
        _id: customer.id || customer._id,
        id: customer.id || customer._id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        gstNumber: customer.gstNumber,
      },
      products,
      discount: discountAmount,
      gst: gstRate,
      finalAmount,
      paidAmount: 0,
      remainingAmount: finalAmount,
      qrCodeImage,
      deliveryAddress: finalDeliveryAddress,
      shippedAddress: finalDeliveryAddress,
      vehicleNumber: finalVehicleNumber,
      transportMode: finalTransportMode,
      dueDate: dueDate ? new Date(dueDate).toISOString() : invoiceDate.toISOString(),
      createdBy: createdBySnapshot,
    });

    // Create Order records for each product item
    const orderItemsToCreate: any[] = [];
    for (const p of products) {
      const orderSubtotal = (Number(p.price) || 0) * (Number(p.quantity) || 0);
      const orderDiscountShare = subtotal > 0 ? (orderSubtotal / subtotal) * discountAmount : 0;
      const orderAfterDiscount = Math.max(0, orderSubtotal - orderDiscountShare);
      const orderGstShare = orderAfterDiscount * (gstRate / 100);
      const orderGrandTotal = orderAfterDiscount + orderGstShare;

      orderItemsToCreate.push({
        invoiceNumber: invoice.invoiceNumber,
        customerId: customer.id || customer._id,
        customer: {
          _id: customer.id || customer._id,
          id: customer.id || customer._id,
          customerId: customer.customerId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          gstNumber: customer.gstNumber,
        },
        productName: p.name,
        category: p.category || '',
        quantity: Number(p.quantity) || 0,
        price: Number(p.price) || 0,
        discount: orderDiscountShare,
        gst: orderGstShare,
        grandTotal: orderGrandTotal,
        purchaseDate: invoiceDate.toISOString(),
        invoiceStatus: 'Pending',
      });
    }

    await createOrdersBulk(orderItemsToCreate);

    // Create Notification for customer
    const formattedAmount = finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    await createNotification({
      customerId: customer.id || customer._id,
      customer: {
        _id: customer.id || customer._id,
        customerId: customer.customerId,
        name: customer.name,
      },
      title: 'New Invoice Received',
      message: `Invoice ${invoice.invoiceNumber} for ₹${formattedAmount} has been generated.`
    });

    // Send Email Notification
    try {
      await sendInvoiceEmail(
        customer.email,
        customer.name,
        invoice.invoiceNumber,
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

    req.app.get('io')?.emit('DATA_UPDATED');
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
 * List Invoices
 */
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const dateFilter = (req.query.dateFilter as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';
    const status = (req.query.status as string) || '';

    const isAdmin = ['ADMIN_1', 'ADMIN_2'].includes(req.user?.role || '');
    const customerId = req.user?.role === 'Customer' ? req.user.id : (req.query.customer as string);

    const result = await findInvoicesPaginated({
      page,
      limit,
      search,
      dateFilter,
      startDate,
      endDate,
      status,
      customerId,
      isAdmin,
    });

    let processedInvoices: any[] = [];
    if (isAdmin) {
      const invoiceNumbers = result.invoices.map((inv) => inv.invoiceNumber);
      const payments = await findPaymentsByInvoiceNumbersBulk(invoiceNumbers);

      const paymentMap: Record<string, any> = {};
      payments.forEach((p) => {
        if (p.approvedBy || !paymentMap[p.invoiceNumber]) {
          paymentMap[p.invoiceNumber] = p;
        }
      });

      processedInvoices = result.invoices.map((inv) => {
        const doc: any = { ...inv };
        const linkedPayment = paymentMap[inv.invoiceNumber];
        doc.status = (inv.remainingAmount <= 0) ? 'Paid' : 'Unpaid';
        doc.approvedBy = linkedPayment?.approvedBy || null;
        doc.approvedAt = linkedPayment?.approvedAt || null;
        return doc;
      });
    } else {
      // Customer view
      processedInvoices = result.invoices.map((inv) => {
        const doc: any = { ...inv };
        doc.status = (inv.remainingAmount <= 0) ? 'Paid' : 'Unpaid';
        delete doc.createdBy;
        delete doc.approvedBy;
        delete doc.approvedAt;
        return doc;
      });
    }

    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      pages: result.pages,
      invoices: processedInvoices
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
    const isAdmin = ['ADMIN_1', 'ADMIN_2'].includes(req.user?.role || '');

    const rawInvoice = await findInvoiceById(id);
    if (!rawInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Role check for customer
    if (req.user?.role === 'Customer' && rawInvoice.customerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to view other invoices' });
    }

    const doc: any = { ...rawInvoice };
    doc.status = (rawInvoice.remainingAmount <= 0) ? 'Paid' : 'Unpaid';

    if (isAdmin) {
      const payments = await findPaymentsByInvoiceNumber(rawInvoice.invoiceNumber);
      const approvedPayment = payments.find((p) => p.approvedBy || p.approvedAt) || payments[0];
      doc.approvedBy = approvedPayment?.approvedBy || null;
      doc.approvedAt = approvedPayment?.approvedAt || null;
    } else {
      delete doc.createdBy;
      delete doc.approvedBy;
      delete doc.approvedAt;
    }

    res.status(200).json({
      success: true,
      invoice: doc
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
    const { products, discount, gst, dueDate, paidAmount, deliveryAddress, shippedAddress, vehicleNumber, vehicleNo, transportMode } = req.body;

    const invoice = await findInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer = invoice.customer || (await findCustomerById(invoice.customerId));

    const prevFinal = invoice.finalAmount;
    const prevRemaining = invoice.remainingAmount;

    let updatedProducts = products && products.length ? products : invoice.products;
    let discountAmount = discount !== undefined ? Number(discount) : invoice.discount;
    let gstRate = gst !== undefined ? Number(gst) : invoice.gst;

    let subtotal = 0;
    updatedProducts.forEach((p: any) => {
      subtotal += (Number(p.price) || 0) * (Number(p.quantity) || 0);
    });

    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const gstAmount = afterDiscount * (gstRate / 100);
    const finalAmount = afterDiscount + gstAmount;

    const finalPaidAmount = paidAmount !== undefined ? Number(paidAmount) : invoice.paidAmount;
    const remainingAmount = Math.max(0, finalAmount - finalPaidAmount);

    const updates: any = {
      products: updatedProducts,
      discount: discountAmount,
      gst: gstRate,
      finalAmount,
      paidAmount: finalPaidAmount,
      remainingAmount,
    };

    if (dueDate) updates.dueDate = new Date(dueDate).toISOString();
    if (deliveryAddress !== undefined || shippedAddress !== undefined) {
      const addr = String(deliveryAddress !== undefined ? deliveryAddress : shippedAddress).trim();
      updates.deliveryAddress = addr;
      updates.shippedAddress = addr;
    }
    if (vehicleNumber !== undefined || vehicleNo !== undefined) {
      const vNum = String(vehicleNumber || vehicleNo || '').trim().toUpperCase();
      if (vNum) {
        const vehicleRegex = /^[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}$/;
        if (!vehicleRegex.test(vNum)) {
          return res.status(400).json({
            success: false,
            message: 'Enter a valid vehicle number in the format LL 00 L 0000 or LL 00 LL 0000.'
          });
        }
      }
      updates.vehicleNumber = vNum;
    }
    if (transportMode !== undefined) updates.transportMode = String(transportMode).trim();

    const updated = await repoUpdateInvoice(id, updates);

    // Trigger Notification to Customer
    let changeMessage = `Invoice ${invoice.invoiceNumber} has been updated by Admin.`;
    if (finalAmount !== prevFinal) {
      changeMessage += ` New Total: ₹${finalAmount.toLocaleString('en-IN')}.`;
    }
    if (remainingAmount !== prevRemaining) {
      changeMessage += ` Remaining amount due: ₹${remainingAmount.toLocaleString('en-IN')}.`;
    }

    if (customer) {
      await createNotification({
        customerId: customer.id || customer._id,
        customer: {
          _id: customer.id || customer._id,
          customerId: customer.customerId,
          name: customer.name,
        },
        title: 'Invoice Updated',
        message: changeMessage
      });

      if (customer.email) {
        try {
          await sendInvoiceUpdateEmail(
            customer.email,
            customer.name || 'Valued Customer',
            invoice.invoiceNumber,
            changeMessage
          );
        } catch (emailErr) {
          console.error('Invoice update email error (non-fatal):', emailErr);
        }
      }
    }

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: updated
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

    const invoice = await findInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Delete related orders using invoiceNumber
    await deleteOrdersByInvoiceNumber(invoice.invoiceNumber);

    // Delete invoice
    await repoDeleteInvoice(id);

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice and related orders deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Customer Orders History
 */
export const getCustomerOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAdmin = ['ADMIN_1', 'ADMIN_2'].includes(req.user?.role || '');

    let orders: any[] = [];
    if (req.user?.role === 'Customer') {
      orders = await findOrdersByCustomerId(req.user.id);
    } else {
      orders = await findAllOrders();
    }

    // Sort descending by purchaseDate
    orders.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

    const invoiceNumbers = Array.from(new Set(orders.map((o) => o.invoiceNumber)));
    const payments = await findPaymentsByInvoiceNumbersBulk(invoiceNumbers);

    const paymentMap: Record<string, any> = {};
    payments.forEach((p) => {
      if (p.approvedBy || !paymentMap[p.invoiceNumber]) {
        paymentMap[p.invoiceNumber] = p;
      }
    });

    const ordersWithInvoiceStatus = orders.map((o) => {
      const pymt = paymentMap[o.invoiceNumber];
      const status = o.invoiceStatus || 'Pending';

      const baseObj: any = {
        ...o,
        invoiceStatus: status,
        paymentId: pymt?.id || pymt?._id || null
      };

      if (isAdmin) {
        baseObj.approvedBy = pymt?.approvedBy || null;
        baseObj.approvedAt = pymt?.approvedAt || null;
      } else {
        delete baseObj.createdBy;
        delete baseObj.approvedBy;
        delete baseObj.approvedAt;
      }

      return baseObj;
    });

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
    const { invoicePdf } = req.body;

    const invoice = await findInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const customer: any = invoice.customer || (await findCustomerById(invoice.customerId)) || {};
    const customerId = customer.id || customer._id || invoice.customerId;
    const customerEmail = customer.email || '';
    const customerName = customer.name || 'Valued Customer';

    const approvalTime = new Date();

    // 1. Update Invoice status
    const updatedInvoice = await repoUpdateInvoice(id, {
      paidAmount: invoice.finalAmount,
      remainingAmount: 0,
      paymentApprovedAt: approvalTime.toISOString(),
    });

    // 2. Update Order invoiceStatus
    await updateOrderStatusByInvoiceNumber(invoice.invoiceNumber, 'Paid');

    // Admin createdBy/approvedBy snapshot
    let adminSnapshot: any = req.user?.id;
    if (req.user?.id) {
      const admin = await findAdminById(req.user.id);
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

    // 3. Create Payment record
    if (customerId) {
      await repoCreatePayment({
        invoiceNumber: invoice.invoiceNumber,
        customerId,
        customer: {
          _id: customerId,
          id: customerId,
          customerId: customer.customerId,
          name: customerName,
          email: customerEmail,
        },
        amount: invoice.finalAmount,
        paymentMethod: 'Manual Admin Approval',
        transactionId: 'MANUAL-' + Date.now().toString().slice(-6),
        status: 'Settled',
        date: approvalTime.toISOString(),
        time: approvalTime.toLocaleTimeString('en-US', { hour12: false }),
        approvedBy: adminSnapshot,
        approvedAt: approvalTime.toISOString(),
        createdBy: adminSnapshot,
      });
    }

    // 4. Trigger Email with PDF Attachment (if customer email exists)
    if (invoicePdf && customerEmail) {
      try {
        await sendPaymentConfirmationWithPdfEmail(
          customerEmail,
          customerName,
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

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Invoice marked as paid and confirmation emailed to customer.',
      invoice: updatedInvoice
    });
  } catch (error) {
    next(error);
  }
};
