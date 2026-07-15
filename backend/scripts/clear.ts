import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../src/models/Customer';
import Invoice from '../src/models/Invoice';
import Order from '../src/models/Order';
import Payment from '../src/models/Payment';
import Notification from '../src/models/Notification';
import ActivityLog from '../src/models/ActivityLog';
import OTP from '../src/models/OTP';
import Expense from '../src/models/Expense';
import Admin from '../src/models/Admin';
import Setting from '../src/models/Setting';

dotenv.config();

const clearData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealer-payment';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    console.log('Clearing all collections...');
    await Customer.deleteMany({});
    await Invoice.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await OTP.deleteMany({});
    await Expense.deleteMany({});
    await Admin.deleteMany({});
    await Setting.deleteMany({});

    console.log('Seeding clean settings...');
    await Setting.create({
      companyName: 'Green Glide Logistics',
      companyLogo: '',
      upiId: 'apexdealer@okaxis',
      backupFrequency: 'weekly',
      backupEmail: 'backups@greenglide.com',
      supportPhone: '+91 88702 00515'
    });

    console.log('Seeding clean Admin 1 (Owner)...');
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'greenglidelogistics@gmail.com';
    const adminPhone = process.env.ADMIN_INITIAL_PHONE || '8870200515';
    const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminPassword123';
    
    await Admin.create({
      username: adminUsername,
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      password: adminPassword,
      role: 'ADMIN_1'
    });

    console.log('Seeding clean Admin 2 (Partner)...');
    await Admin.create({
      username: 'partner',
      email: 'partner@greenglide.com',
      phone: '9876543211',
      password: 'PartnerPassword123',
      role: 'ADMIN_2'
    });

    console.log('=========================================');
    console.log('ALL SAMPLE DATA CLEARED SUCCESSFULLY!');
    console.log('Clean Admins and Settings seeded for production.');
    console.log('=========================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing data:', error);
    process.exit(1);
  }
};

clearData();
