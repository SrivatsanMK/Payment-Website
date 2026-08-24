import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import {
  findCustomerById,
  findCustomerByEmail,
  findCustomerByPhone,
  findCustomersPaginated,
  createCustomer as repoCreateCustomer,
  updateCustomer as repoUpdateCustomer,
  deleteCustomer as repoDeleteCustomer,
} from '../repositories/customerRepository';
import { findInvoicesByCustomerId, deleteInvoice } from '../repositories/invoiceRepository';
import { findOrdersByCustomerId } from '../repositories/orderRepository';
import { findPaymentsByCustomerId } from '../repositories/paymentRepository';

/**
 * Create Customer (Admin Only)
 */
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, address, gstNumber, password } = req.body;

    // Validation
    if (!name || !email || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, and address are required' });
    }

    // Check duplicate email
    const existingCustomer = await findCustomerByEmail(email.toLowerCase().trim());
    if (existingCustomer) {
      return res.status(400).json({ success: false, message: 'Customer with this email already exists' });
    }

    const customer = await repoCreateCustomer({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      gstNumber: gstNumber ? gstNumber.trim() : undefined,
      password: password || 'customer123',
      status: 'Active',
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer: {
        id: customer.id || customer._id,
        _id: customer.id || customer._id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        joiningDate: customer.joiningDate
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update Customer (Admin and Owner Customer)
 */
export const updateCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, password } = req.body;

    // Security check: Customer can only update their own profile, Admin can update anyone
    if (req.user?.role === 'Customer' && req.user?.id !== id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update other profiles' });
    }

    const customer = await findCustomerById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // If the updater is a Customer and they are modifying email or phone, require valid OTP profileToken
    if (req.user?.role === 'Customer') {
      const isEmailChanging = email && email.toLowerCase().trim() !== customer.email;
      const isPhoneChanging = phone && phone.trim() !== customer.phone;

      if (isEmailChanging || isPhoneChanging) {
        const profileToken = (req.headers['x-profile-token'] as string) || req.body.profileToken;
        if (!profileToken) {
          return res.status(403).json({
            success: false,
            message: 'OTP verification is required to update email or phone number.'
          });
        }

        try {
          const decoded = jwt.verify(
            profileToken,
            process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456'
          ) as any;

          const custId = customer.id || customer._id;
          if (decoded.id !== custId || decoded.purpose !== 'customer_profile_update') {
            return res.status(403).json({
              success: false,
              message: 'Invalid or expired verification session. Please verify with OTP again.'
            });
          }
        } catch (tokenErr) {
          return res.status(403).json({
            success: false,
            message: 'Invalid or expired verification session. Please verify with OTP again.'
          });
        }
      }
    }

    const updates: any = {};

    // Check duplicate email or phone if updated
    if (email && email.toLowerCase().trim() !== customer.email) {
      const emailExists = await findCustomerByEmail(email.toLowerCase().trim());
      if (emailExists && (emailExists.id || emailExists._id) !== id) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      updates.email = email.toLowerCase().trim();
    }

    if (phone && phone.trim() !== customer.phone) {
      const phoneExists = await findCustomerByPhone(phone.trim());
      if (phoneExists && (phoneExists.id || phoneExists._id) !== id) {
        return res.status(400).json({ success: false, message: 'Phone number already in use' });
      }
      updates.phone = phone.trim();
    }

    if (name) updates.name = name.trim();
    if (address) updates.address = address.trim();
    if (password) {
      updates.password = password;
      updates.forcedPasswordReset = false;
    }

    // Check profile image upload (from multer)
    if (req.file) {
      updates.profilePicture = `/uploads/${req.file.filename}`;
    }

    const updated = await repoUpdateCustomer(id, updates);

    req.app.get('io')?.emit('DATA_UPDATED');
    const custId = updated?.id || updated?._id || id;
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      customer: {
        id: custId,
        _id: custId,
        customerId: updated?.customerId,
        name: updated?.name,
        email: updated?.email,
        phone: updated?.phone,
        address: updated?.address,
        profilePicture: updated?.profilePicture
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Customers (Admin Only, supports search and pagination)
 */
export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const result = await findCustomersPaginated({ page, limit, search });

    res.status(200).json({
      success: true,
      total: result.total,
      page: result.page,
      pages: result.pages,
      customers: result.customers.map((c) => {
        const { password, ...safe } = c as any;
        return safe;
      })
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get Customer Details & Financial Metrics (Admin and Owner Customer)
 */
export const getCustomerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (req.user?.role === 'Customer' && req.user?.id !== id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view other customer details' });
    }

    const customer = await findCustomerById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Retrieve financial metrics
    const invoices = await findInvoicesByCustomerId(id);
    const orders = await findOrdersByCustomerId(id);

    let totalPackages = 0;
    orders.forEach((o) => {
      totalPackages += Number(o.quantity) || 0;
    });

    let totalInvoices = invoices.length;
    let pendingPaymentsCount = 0;
    let completedPaymentsCount = 0;
    let totalPurchased = 0;
    let totalPaid = 0;
    let remainingBalance = 0;

    invoices.forEach((inv) => {
      totalPurchased += Number(inv.finalAmount) || 0;
      totalPaid += Number(inv.paidAmount) || 0;
      remainingBalance += Number(inv.remainingAmount) || 0;

      if (inv.remainingAmount <= 0) {
        completedPaymentsCount++;
      } else {
        pendingPaymentsCount++;
      }
    });

    // Retrieve monthly purchases vs payments chart data (Last 6 Months)
    const monthlyData: Record<string, { month: string; purchases: number; payments: number }> = {};
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
      monthlyData[key] = { month: name, purchases: 0, payments: 0 };
    }

    // Filter invoices by this customer in the last 6 months
    invoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      if (date >= sixMonthsAgo) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = { month: name, purchases: 0, payments: 0 };
        }
        monthlyData[key].purchases += Number(inv.finalAmount) || 0;
      }
    });

    // Filter payments by this customer in the last 6 months
    const payments = await findPaymentsByCustomerId(id);
    payments.forEach((pay) => {
      const date = new Date(pay.date);
      if (date >= sixMonthsAgo) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;

        if (!monthlyData[key]) {
          monthlyData[key] = { month: name, purchases: 0, payments: 0 };
        }
        monthlyData[key].payments += Number(pay.amount) || 0;
      }
    });

    // Sort chart data
    const chartData = Object.keys(monthlyData)
      .sort()
      .map((k) => monthlyData[k]);

    const { password, ...safeCustomer } = customer as any;

    res.status(200).json({
      success: true,
      customer: safeCustomer,
      metrics: {
        totalInvoices,
        pendingPaymentsCount,
        completedPaymentsCount,
        totalPurchased,
        totalPaid,
        remainingBalance,
        totalPackages
      },
      chartData
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Change Customer Account Status (Admin Only - Suspend/Activate)
 */
export const updateCustomerStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const customer = await repoUpdateCustomer(id, { status });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: `Status updated successfully.`,
      customer: {
        id: customer.id || customer._id,
        _id: customer.id || customer._id,
        customerId: customer.customerId
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reset Customer Password (Admin Only)
 */
export const resetCustomerPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword, forceReset } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    const customer = await findCustomerById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const updated = await repoUpdateCustomer(id, {
      password: newPassword,
      forcedPasswordReset: forceReset !== undefined ? forceReset : false,
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: `Password successfully reset for Customer ${customer.name}. Last Password Change Date: ${updated?.lastPasswordChangeDate}`
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete Customer (Admin Only)
 */
export const deleteCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await findCustomerById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check if customer has outstanding invoices
    const customerInvoices = await findInvoicesByCustomerId(id);
    const outstandingInvoices = customerInvoices.filter((i) => i.remainingAmount > 0);
    if (outstandingInvoices.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete customer with pending/outstanding invoices' });
    }

    // Delete customer
    await repoDeleteCustomer(id);

    // Clean up completed invoices for this customer
    for (const inv of customerInvoices) {
      await deleteInvoice(inv.id || inv._id || '');
    }

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Customer and related records deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};
