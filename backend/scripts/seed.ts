import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin';
import Customer from '../src/models/Customer';
import Invoice from '../src/models/Invoice';
import Order from '../src/models/Order';
import Payment from '../src/models/Payment';
import Setting from '../src/models/Setting';
import Notification from '../src/models/Notification';
import ActivityLog from '../src/models/ActivityLog';
import OTP from '../src/models/OTP';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealer-payment';
    console.log('Connecting to database for seeding...');
    await mongoose.connect(mongoUri);
    console.log('Database connected.');

    console.log('Clearing old collections...');
    await Admin.deleteMany({});
    await Customer.deleteMany({});
    await Invoice.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Setting.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await OTP.deleteMany({});
    console.log('Old collections cleared.');

    console.log('Seeding settings...');
    await Setting.create({
      companyName: 'Apex Machinery & Hardware',
      companyLogo: '',
      upiId: 'apexdealer@okaxis',
      backupFrequency: 'weekly',
      backupEmail: 'backups@apexdealer.com',
      supportPhone: '+91 98765 43210'
    });
    console.log('Settings seeded.');

    console.log('Seeding Admins...');
    const admin1 = await Admin.create({
      username: 'admin',
      email: 'greenglidelogistics@gmail.com',
      phone: '9876543210',
      password: 'AdminPassword123',
      role: 'ADMIN_1'
    });
    console.log(`Admin 1 created: ${admin1.username} (${admin1.email})`);

    const admin2 = await Admin.create({
      username: 'partner',
      email: 'partner@greenglide.com',
      phone: '9876543211',
      password: 'PartnerPassword123',
      role: 'ADMIN_2'
    });
    console.log(`Admin 2 created: ${admin2.username} (${admin2.email})`);

    console.log('Seeding Customers...');
    const customer1 = await Customer.create({
      customerId: 'CUST88102',
      name: 'Rohan Sharma',
      email: 'rohan.sharma@example.com',
      phone: '9988776655',
      address: 'Shop 12, Sector 15, Noida, UP, 201301',
      gstNumber: '09AAAAA1111A1Z1',
      password: 'CustomerPassword123',
      status: 'Active',
      joiningDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      forcedPasswordReset: false
    });

    const customer2 = await Customer.create({
      customerId: 'CUST45218',
      name: 'Mona Industries Ltd',
      email: 'contact@monaind.com',
      phone: '8877665544',
      address: 'Plot 45, Phase III, Industrial Area, Okhla, New Delhi, 110020',
      gstNumber: '07BBBBB2222B2Z2',
      password: 'CustomerPassword123',
      status: 'Active',
      joiningDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      forcedPasswordReset: false
    });

    await Customer.create({
      customerId: 'CUST11295',
      name: 'Vikas Traders',
      email: 'vikas.traders@example.com',
      phone: '7766554433',
      address: 'Chawri Bazar, Old Delhi, 110006',
      gstNumber: '',
      password: 'CustomerPassword123',
      status: 'Suspended',
      joiningDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      forcedPasswordReset: true
    });
    console.log('Customers seeded.');

    console.log('Seeding Invoices & Orders...');

    // INV-100241: Rohan PAID | 100grams x3000 + 500grams x50 | Final=32450
    const inv1Date = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await Invoice.create({
      invoiceNumber: 'INV-100241',
      customer: customer1._id,
      products: [
        { name: '100 grams', quantity: 3000, price: 10 },
        { name: '500 grams', quantity: 50, price: 50 }
      ],
      discount: 5000,
      gst: 18,
      finalAmount: 32450,
      paidAmount: 32450,
      remainingAmount: 0,
      status: 'Paid',
      dueDate: new Date(inv1Date.getTime() + 15 * 24 * 60 * 60 * 1000),
      createdAt: inv1Date
    });
    await Order.create([
      {
        orderNumber: 'ORD-554101',
        invoiceNumber: 'INV-100241',
        customer: customer1._id,
        productName: '100 grams',
        quantity: 3000,
        price: 10,
        discount: 4615.38,
        gst: 4569.23,
        grandTotal: 29953.85,
        purchaseDate: inv1Date,
        status: 'Completed',
        invoiceStatus: 'Paid'
      },
      {
        orderNumber: 'ORD-554102',
        invoiceNumber: 'INV-100241',
        customer: customer1._id,
        productName: '500 grams',
        quantity: 50,
        price: 50,
        discount: 384.62,
        gst: 380.77,
        grandTotal: 2496.15,
        purchaseDate: inv1Date,
        status: 'Completed',
        invoiceStatus: 'Paid'
      }
    ]);

    // INV-100288: Rohan PENDING | 1kg x500 | Final=8850
    const inv2Date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await Invoice.create({
      invoiceNumber: 'INV-100288',
      customer: customer1._id,
      products: [{ name: '1 kg', quantity: 500, price: 15 }],
      discount: 0,
      gst: 18,
      finalAmount: 8850,
      paidAmount: 0,
      remainingAmount: 8850,
      status: 'Pending',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      createdAt: inv2Date
    });
    await Order.create({
      orderNumber: 'ORD-554199',
      invoiceNumber: 'INV-100288',
      customer: customer1._id,
      productName: '1 kg',
      quantity: 500,
      price: 15,
      discount: 0,
      gst: 1350,
      grandTotal: 8850,
      purchaseDate: inv2Date,
      status: 'Completed',
      invoiceStatus: 'Pending'
    });

    // INV-100259: Mona PENDING partial | 100grams x8500 + 200grams x500 | Final=106200 paid=40000
    const inv3Date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await Invoice.create({
      invoiceNumber: 'INV-100259',
      customer: customer2._id,
      products: [
        { name: '100 grams', quantity: 8500, price: 10 },
        { name: '200 grams', quantity: 500, price: 20 }
      ],
      discount: 5000,
      gst: 18,
      finalAmount: 106200,
      paidAmount: 40000,
      remainingAmount: 66200,
      status: 'Pending',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      createdAt: inv3Date
    });
    await Order.create([
      {
        orderNumber: 'ORD-554301',
        invoiceNumber: 'INV-100259',
        customer: customer2._id,
        productName: '100 grams',
        quantity: 8500,
        price: 10,
        discount: 4473.68,
        gst: 14494.74,
        grandTotal: 95021.05,
        purchaseDate: inv3Date,
        status: 'Completed',
        invoiceStatus: 'Pending'
      },
      {
        orderNumber: 'ORD-554302',
        invoiceNumber: 'INV-100259',
        customer: customer2._id,
        productName: '200 grams',
        quantity: 500,
        price: 20,
        discount: 526.32,
        gst: 1705.26,
        grandTotal: 11178.95,
        purchaseDate: inv3Date,
        status: 'Completed',
        invoiceStatus: 'Pending'
      }
    ]);

    // INV-100188: Mona OVERDUE (UNPAID) | 500grams x450 | Final=20650 paid=0
    const inv4Date = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await Invoice.create({
      invoiceNumber: 'INV-100188',
      customer: customer2._id,
      products: [{ name: '500 grams', quantity: 450, price: 40 }],
      discount: 500,
      gst: 18,
      finalAmount: 20650,
      paidAmount: 0,
      remainingAmount: 20650,
      status: 'Overdue',
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      createdAt: inv4Date
    });
    await Order.create({
      orderNumber: 'ORD-554045',
      invoiceNumber: 'INV-100188',
      customer: customer2._id,
      productName: '500 grams',
      quantity: 450,
      price: 40,
      discount: 500,
      gst: 3150,
      grandTotal: 20650,
      purchaseDate: inv4Date,
      status: 'Completed',
      invoiceStatus: 'Overdue'
    });

    console.log('Invoices and Orders seeded.');

    console.log('Seeding Payment transactions...');
    await Payment.create([
      {
        invoiceNumber: 'INV-100241',
        customer: customer1._id,
        amount: 32450,
        date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        time: '11:45:00',
        status: 'Completed',
        transactionId: 'UPI982305829103',
        paymentMethod: 'PhonePe'
      },
      {
        invoiceNumber: 'INV-100259',
        customer: customer2._id,
        amount: 40000,
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        time: '15:20:10',
        status: 'Completed',
        transactionId: 'TXN820158209',
        paymentMethod: 'Scan QR Code'
      }
    ]);
    console.log('Payments seeded.');

    console.log('Seeding Notifications...');
    await Notification.create([
      {
        customer: customer1._id,
        title: 'Welcome to Dealer Hub!',
        message: 'Your account Rohan Sharma has been successfully set up. You can now view invoices and track payments.',
        isRead: true
      },
      {
        customer: customer1._id,
        title: 'Invoice Paid — Thank You!',
        message: 'Invoice INV-100241 for Rs.32,450.00 has been fully settled. Thank you for your payment!',
        isRead: true
      },
      {
        customer: customer1._id,
        title: 'New Invoice Issued',
        message: 'Invoice INV-100288 for Rs.8,850.00 has been generated. Please pay before the due date.',
        isRead: false
      },
      {
        customer: customer2._id,
        title: 'Welcome to Dealer Hub!',
        message: 'Your account Mona Industries Ltd has been successfully set up. You can now view invoices and track payments.',
        isRead: true
      },
      {
        customer: customer2._id,
        title: 'Payment Received',
        message: 'Partial payment of Rs.40,000.00 received for Invoice INV-100259. Outstanding: Rs.66,200.00.',
        isRead: true
      },
      {
        customer: customer2._id,
        title: 'Invoice Overdue — Action Required',
        message: 'Invoice INV-100188 for Rs.20,650.00 is overdue. Please clear dues immediately to avoid penalties.',
        isRead: false
      }
    ]);
    console.log('Notifications seeded.');

    console.log('Seeding Activity Logs...');
    await ActivityLog.create([
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'System Initialized', details: 'Initial database seed completed successfully.', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' },
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'Customer Created', details: 'Created Customer: Rohan Sharma (CUST88102)', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' },
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'Customer Created', details: 'Created Customer: Mona Industries Ltd (CUST45218)', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' },
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'Invoice Created', details: 'Invoice INV-100241 for Rohan Sharma Rs.32,450.00 (PAID)', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' },
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'Invoice Created', details: 'Invoice INV-100288 for Rohan Sharma Rs.8,850.00 (PENDING)', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' },
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'Invoice Created', details: 'Invoice INV-100259 for Mona Industries Rs.1,06,200.00 (PENDING)', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' },
      { userId: admin1._id, userRole: 'ADMIN_1', action: 'Invoice Created', details: 'Invoice INV-100188 for Mona Industries Rs.20,650.00 (OVERDUE)', ipAddress: '127.0.0.1', userAgent: 'Seeding Script' }
    ]);
    console.log('Activity Logs seeded.');

    console.log('=========================================');
    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Admin 1: admin / greenglidelogistics@gmail.com | Password: AdminPassword123');
    console.log('Admin 2: partner / partner@greenglide.com | Password: PartnerPassword123');
    console.log('Customers (all password: CustomerPassword123):');
    console.log('  Rohan Sharma    | rohan.sharma@example.com | CUST88102');
    console.log('  Mona Industries | contact@monaind.com      | CUST45218');
    console.log('  Vikas Traders   | vikas.traders@example.com| CUST11295');
    console.log('=========================================');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
