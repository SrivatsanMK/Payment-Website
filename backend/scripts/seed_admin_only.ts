import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin';
import Setting from '../src/models/Setting';

dotenv.config();

const seedAdminOnly = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealer-payment';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Database connected.');

    console.log('Clearing Settings and Admin...');
    await Admin.deleteMany({});
    await Setting.deleteMany({});

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

    console.log('Seeding Admin...');
    const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@dealer.com';
    const adminPhone = process.env.ADMIN_INITIAL_PHONE || '9876543210';
    const adminUsername = process.env.ADMIN_INITIAL_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminPassword123';
    
    const admin = await Admin.create({
      username: adminUsername,
      email: adminEmail.toLowerCase(),
      phone: adminPhone,
      password: adminPassword,
      role: 'Admin'
    });
    
    console.log(`Admin user created: ${admin.username} (${admin.email})`);
    console.log('Database seeded successfully with only Admin and Settings.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedAdminOnly();
