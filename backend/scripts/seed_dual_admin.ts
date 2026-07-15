import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin';
import Setting from '../src/models/Setting';

dotenv.config();

const seedDualAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealer-payment';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Database connected.');

    // Clear existing admin accounts
    const deleted = await Admin.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing admin(s).`);

    // Create Admin 1 (Owner)
    const admin1 = await Admin.create({
      username: 'admin',
      email: 'greenglidelogistics@gmail.com',
      phone: '8870200515',
      password: 'AdminPassword123',
      role: 'ADMIN_1',
    });
    console.log(`✅ Admin 1 (Owner) created: ${admin1.username} | role: ${admin1.role}`);

    // Create Admin 2 (Partner)
    const admin2 = await Admin.create({
      username: 'partner',
      email: 'partner@greenglide.com',
      phone: '9999999999',
      password: 'PartnerPassword123',
      role: 'ADMIN_2',
    });
    console.log(`✅ Admin 2 (Partner) created: ${admin2.username} | role: ${admin2.role}`);

    // Ensure Settings exist
    const existingSettings = await Setting.findOne();
    if (!existingSettings) {
      await Setting.create({
        companyName: 'Green Glide Logistics',
        companyLogo: '',
        upiId: '',
        backupFrequency: 'weekly',
        backupEmail: 'greenglidelogistics@gmail.com',
        supportPhone: '8870200515'
      });
      console.log('✅ Settings created.');
    } else {
      console.log('ℹ️  Settings already exist — skipped.');
    }

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Admin Portal: http://localhost:5173/admin/login');
    console.log('---');
    console.log('Admin 1 (Owner):');
    console.log('  Username: admin');
    console.log('  Email:    greenglidelogistics@gmail.com');
    console.log('  Password: AdminPassword123');
    console.log('---');
    console.log('Admin 2 (Partner):');
    console.log('  Username: partner');
    console.log('  Email:    partner@greenglide.com');
    console.log('  Password: PartnerPassword123');
    console.log('=========================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('Error seeding database:', error.message || error);
    process.exit(1);
  }
};

seedDualAdmin();
