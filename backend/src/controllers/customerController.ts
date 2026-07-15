import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Customer from '../models/Customer';
import Invoice from '../models/Invoice';
import ActivityLog from '../models/ActivityLog';
import Payment from '../models/Payment';
import Order from '../models/Order';

/**
 * Helper to generate unique Customer ID
 */
const generateCustomerId = async (): Promise<string> => {
  let uniqueId = '';
  let exists = true;
  while (exists) {
    const randomNum = Math.floor(10000 + Math.random() * 90000); // 5 digits
    uniqueId = `CUST${randomNum}`;
    const check = await Customer.findOne({ customerId: uniqueId });
    if (!check) exists = false;
  }
  return uniqueId;
};

/**
 * Create Customer (Admin Only)
 */
export const createCustomer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, address, password } = req.body;

    if (!name || !email || !phone || !address || !password) {
      return res.status(400).json({ success: false, message: 'Please enter all required fields' });
    }

    // Check duplicate email or phone
    const emailExists = await Customer.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const phoneExists = await Customer.findOne({ phone: phone.trim() });
    if (phoneExists) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    const customerId = await generateCustomerId();

    const customer = await Customer.create({
      customerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      password, // hashed in pre-save middleware
      forcedPasswordReset: true // forces password change on first login
    });

    // Log activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Customer Created',
      details: `Created customer ${name} with ID: ${customerId}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Customer successfully created',
      customer: {
        id: customer._id,
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

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check duplicate email or phone if updated
    if (email && email.toLowerCase().trim() !== customer.email) {
      const emailExists = await Customer.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) return res.status(400).json({ success: false, message: 'Email already in use' });
      customer.email = email.toLowerCase().trim();
    }

    if (phone && phone.trim() !== customer.phone) {
      const phoneExists = await Customer.findOne({ phone: phone.trim() });
      if (phoneExists) return res.status(400).json({ success: false, message: 'Phone number already in use' });
      customer.phone = phone.trim();
    }

    if (name) customer.name = name.trim();
    if (address) customer.address = address.trim();
    if (password) {
      customer.password = password;
      customer.forcedPasswordReset = false;
    }

    // Check profile image upload (from multer)
    if (req.file) {
      // Save local path e.g. /uploads/filename.ext
      customer.profilePicture = `/uploads/${req.file.filename}`;
    }

    await customer.save();

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Customer Updated',
      details: `Updated details of customer ID: ${customer.customerId}`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      customer: {
        id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        profilePicture: customer.profilePicture
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get All Customers (Admin Only, supports search, filter and pagination)
 */
export const getCustomers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const skip = (page - 1) * limit;

    const query: any = {};

    // Status filter removed

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      customers
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

    const customer = await Customer.findById(id).select('-password');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Retrieve financial metrics
    const invoices = await Invoice.find({ customer: id });
    const orders = await Order.find({ customer: id });

    let totalPackages = 0;
    orders.forEach(o => {
      totalPackages += o.quantity;
    });

    let totalInvoices = invoices.length;
    let pendingPaymentsCount = 0;
    let completedPaymentsCount = 0;
    let totalPurchased = 0;
    let totalPaid = 0;
    let remainingBalance = 0;

    invoices.forEach(inv => {
      totalPurchased += inv.finalAmount;
      totalPaid += inv.paidAmount;
      remainingBalance += inv.remainingAmount;

      if (inv.remainingAmount === 0) {
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
    const recentInvoices = await Invoice.find({ customer: id, createdAt: { $gte: sixMonthsAgo } });
    recentInvoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = { month: name, purchases: 0, payments: 0 };
      }
      monthlyData[key].purchases += inv.finalAmount;
    });

    // Filter payments by this customer in the last 6 months
    const recentPayments = await Payment.find({ customer: id, date: { $gte: sixMonthsAgo } });
    recentPayments.forEach(pay => {
      const date = new Date(pay.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const name = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;

      if (!monthlyData[key]) {
        monthlyData[key] = { month: name, purchases: 0, payments: 0 };
      }
      monthlyData[key].payments += pay.amount;
    });

    // Sort chart data
    const chartData = Object.keys(monthlyData)
      .sort()
      .map(k => monthlyData[k]);

    res.status(200).json({
      success: true,
      customer,
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

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: `Status update deprecated.`,
      customer: {
        id: customer._id,
        customerId: customer.customerId
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Force Password Reset or Reset Customer Password (Admin Only)
 */
export const resetCustomerPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword, forceReset } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    customer.password = newPassword; // gets hashed by save middleware
    if (forceReset !== undefined) {
      customer.forcedPasswordReset = forceReset;
    }
    await customer.save();

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Customer Password Reset Force',
      details: `Password reset forced for customer: ${customer.name} (ID: ${customer.customerId})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: `Password successfully reset for Customer ${customer.name}. Last Password Change Date: ${customer.lastPasswordChangeDate}`
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

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check if customer has outstanding invoices
    const outstandingInvoices = await Invoice.countDocuments({ customer: id, remainingAmount: { $gt: 0 } });
    if (outstandingInvoices > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete customer with pending/outstanding invoices' });
    }

    // Delete customer
    await Customer.findByIdAndDelete(id);

    // Clean up all completed invoices for this customer
    await Invoice.deleteMany({ customer: id });

    // Log Activity
    await ActivityLog.create({
      userId: req.user?.id,
      userRole: req.user?.role || 'ADMIN_1',
      action: 'Customer Deleted',
      details: `Deleted Customer: ${customer.name} (ID: ${customer.customerId})`,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Customer and related records deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};
