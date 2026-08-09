import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin';
import Vegetable from '../src/models/Vegetable';
import Supplier from '../src/models/Supplier';
import VegetablePurchase from '../src/models/VegetablePurchase';
import PrivateBusinessSetting from '../src/models/PrivateBusinessSetting';

dotenv.config();

const seedVegetableData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealer-payment';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    // Find Owner Admin
    let admin = await Admin.findOne({ role: 'ADMIN_1' });
    if (!admin) {
      admin = await Admin.findOne();
    }

    if (!admin) {
      console.error('No admin found in database. Please ensure admin account exists.');
      process.exit(1);
    }

    const adminId = admin._id;
    console.log(`Seeding data for Admin: ${admin.username} (${admin._id})`);

    // 1. Clear existing Vegetable workspace collections
    console.log('Clearing existing Vegetable Purchase workspace collections...');
    await Vegetable.deleteMany({});
    await Supplier.deleteMany({});
    await VegetablePurchase.deleteMany({});
    await PrivateBusinessSetting.deleteMany({});

    // 2. Seed EXACTLY 5 Vegetables
    console.log('Seeding EXACTLY 5 Vegetables...');
    const veg1 = await Vegetable.create({
      name: 'Tomato',
      category: 'Fruit Vegetables',
      defaultUnit: 'KG',
      notes: 'Fresh red country tomatoes',
      isActive: true,
      createdBy: adminId
    });

    const veg2 = await Vegetable.create({
      name: 'Onion',
      category: 'Bulbs',
      defaultUnit: 'KG',
      notes: 'Nasik Grade-A onions',
      isActive: true,
      createdBy: adminId
    });

    const veg3 = await Vegetable.create({
      name: 'Potato',
      category: 'Root Vegetables',
      defaultUnit: 'KG',
      notes: 'Hassan quality potatoes',
      isActive: true,
      createdBy: adminId
    });

    const veg4 = await Vegetable.create({
      name: 'Carrot',
      category: 'Root Vegetables',
      defaultUnit: 'KG',
      notes: 'Ooty red carrots',
      isActive: true,
      createdBy: adminId
    });

    const veg5 = await Vegetable.create({
      name: 'Cabbage',
      category: 'Leafy Vegetables',
      defaultUnit: 'KG',
      notes: 'Fresh green cabbage',
      isActive: true,
      createdBy: adminId
    });

    console.log('5 Vegetables created:', [veg1.name, veg2.name, veg3.name, veg4.name, veg5.name].join(', '));

    // 3. Seed Suppliers / Dealers
    console.log('Seeding Suppliers...');
    const sup1 = await Supplier.create({
      name: 'Koyambedu Wholesale Agro Market',
      contactPerson: 'Ramesh Kumar',
      phone: '9840123456',
      email: 'ramesh@koyambeduagro.com',
      address: 'Shop #42, Block B, Koyambedu',
      marketLocation: 'Koyambedu Market',
      gstNumber: '33AAACK1234F1Z5',
      notes: 'Primary bulk supplier for tomatoes and onions',
      isActive: true,
      createdBy: adminId
    });

    const sup2 = await Supplier.create({
      name: 'Green Farm Traders',
      contactPerson: 'Suresh Patel',
      phone: '9825098765',
      email: 'suresh@greenfarmtraders.com',
      address: 'Plot 15, APMC Yard',
      marketLocation: 'APMC Market',
      gstNumber: '33BBBGF5678G2Z1',
      notes: 'Direct farm supplier for Hassan potatoes and Ooty carrots',
      isActive: true,
      createdBy: adminId
    });

    const sup3 = await Supplier.create({
      name: 'Golden Harvest Mandi',
      contactPerson: 'Vikram Singh',
      phone: '9811223344',
      email: 'vikram@goldenharvest.com',
      address: 'Stall 8, Mandi Complex',
      marketLocation: 'Central Mandi',
      gstNumber: '33CCCGH9012H3Z8',
      notes: 'Specializes in fresh leafy cabbages and tomatoes',
      isActive: true,
      createdBy: adminId
    });

    console.log('3 Suppliers created successfully.');

    // 4. Seed Private Business Settings
    console.log('Seeding Workspace Settings...');
    await PrivateBusinessSetting.create({
      businessName: 'Private Business',
      ownerName: admin.username || 'Owner',
      currency: 'INR',
      defaultUnit: 'KG',
      defaultPaymentMethod: 'Cash',
      address: 'Wholesale Vegetable Hub, Chennai',
      phone: admin.phone || '8870200515',
      email: admin.email || 'greenglidelogistics@gmail.com',
      createdBy: adminId
    });

    // 5. Seed Sample Vegetable Purchases
    console.log('Seeding Sample Purchases...');
    const now = new Date();

    // Purchase 1 (Today)
    const today = new Date(now);
    const p1Items = [
      { vegetable: veg1._id, vegetableName: veg1.name, quantity: 150, unit: 'KG', ratePerUnit: 32, itemTotal: 4800 },
      { vegetable: veg2._id, vegetableName: veg2.name, quantity: 200, unit: 'KG', ratePerUnit: 28, itemTotal: 5600 }
    ];
    const p1Subtotal = 10400;
    const p1Charges = { transportation: 500, loadingUnloading: 200, commission: 100, other: 0 };
    const p1AddTotal = 800;
    const p1Grand = 11200;

    await VegetablePurchase.create({
      purchaseId: `VP-${today.toISOString().slice(0,10).replace(/-/g,'')}-0001`,
      purchaseDate: today,
      purchaseTime: '08:30',
      supplier: sup1._id,
      supplierName: sup1.name,
      items: p1Items,
      vegetableSubtotal: p1Subtotal,
      charges: p1Charges,
      additionalChargesTotal: p1AddTotal,
      grandTotal: p1Grand,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      paidAmount: p1Grand,
      balanceAmount: 0,
      billNumber: 'BILL-8801',
      vehicleNumber: 'TN 09 AB 1234',
      notes: 'Morning fresh arrival',
      createdBy: adminId
    });

    // Purchase 2 (Yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const p2Items = [
      { vegetable: veg3._id, vegetableName: veg3.name, quantity: 300, unit: 'KG', ratePerUnit: 24, itemTotal: 7200 },
      { vegetable: veg4._id, vegetableName: veg4.name, quantity: 100, unit: 'KG', ratePerUnit: 45, itemTotal: 4500 }
    ];
    const p2Subtotal = 11700;
    const p2Charges = { transportation: 600, loadingUnloading: 150, commission: 0, other: 50 };
    const p2AddTotal = 800;
    const p2Grand = 12500;

    await VegetablePurchase.create({
      purchaseId: `VP-${yesterday.toISOString().slice(0,10).replace(/-/g,'')}-0001`,
      purchaseDate: yesterday,
      purchaseTime: '09:15',
      supplier: sup2._id,
      supplierName: sup2.name,
      items: p2Items,
      vegetableSubtotal: p2Subtotal,
      charges: p2Charges,
      additionalChargesTotal: p2AddTotal,
      grandTotal: p2Grand,
      paymentMethod: 'Bank Transfer',
      paymentStatus: 'Partially Paid',
      paidAmount: 8000,
      balanceAmount: 4500,
      billNumber: 'BILL-8795',
      vehicleNumber: 'KA 04 CD 5678',
      notes: 'Balance to be settled on next delivery',
      createdBy: adminId
    });

    // Purchase 3 (3 days ago)
    const date3 = new Date(now);
    date3.setDate(now.getDate() - 3);
    const p3Items = [
      { vegetable: veg5._id, vegetableName: veg5.name, quantity: 250, unit: 'KG', ratePerUnit: 20, itemTotal: 5000 },
      { vegetable: veg1._id, vegetableName: veg1.name, quantity: 100, unit: 'KG', ratePerUnit: 30, itemTotal: 3000 }
    ];
    const p3Subtotal = 8000;
    const p3Charges = { transportation: 400, loadingUnloading: 100, commission: 50, other: 0 };
    const p3AddTotal = 550;
    const p3Grand = 8550;

    await VegetablePurchase.create({
      purchaseId: `VP-${date3.toISOString().slice(0,10).replace(/-/g,'')}-0001`,
      purchaseDate: date3,
      purchaseTime: '10:00',
      supplier: sup3._id,
      supplierName: sup3.name,
      items: p3Items,
      vegetableSubtotal: p3Subtotal,
      charges: p3Charges,
      additionalChargesTotal: p3AddTotal,
      grandTotal: p3Grand,
      paymentMethod: 'Cash',
      paymentStatus: 'Paid',
      paidAmount: p3Grand,
      balanceAmount: 0,
      billNumber: 'BILL-8750',
      vehicleNumber: 'TN 10 EF 9012',
      notes: 'Paid cash in mandi',
      createdBy: adminId
    });

    // Purchase 4 (5 days ago)
    const date4 = new Date(now);
    date4.setDate(now.getDate() - 5);
    const p4Items = [
      { vegetable: veg2._id, vegetableName: veg2.name, quantity: 400, unit: 'KG', ratePerUnit: 26, itemTotal: 10400 },
      { vegetable: veg3._id, vegetableName: veg3.name, quantity: 200, unit: 'KG', ratePerUnit: 25, itemTotal: 5000 }
    ];
    const p4Subtotal = 15400;
    const p4Charges = { transportation: 800, loadingUnloading: 300, commission: 150, other: 0 };
    const p4AddTotal = 1250;
    const p4Grand = 16650;

    await VegetablePurchase.create({
      purchaseId: `VP-${date4.toISOString().slice(0,10).replace(/-/g,'')}-0001`,
      purchaseDate: date4,
      purchaseTime: '07:45',
      supplier: sup1._id,
      supplierName: sup1.name,
      items: p4Items,
      vegetableSubtotal: p4Subtotal,
      charges: p4Charges,
      additionalChargesTotal: p4AddTotal,
      grandTotal: p4Grand,
      paymentMethod: 'Credit',
      paymentStatus: 'Pending',
      paidAmount: 0,
      balanceAmount: p4Grand,
      billNumber: 'BILL-8720',
      vehicleNumber: 'TN 09 G 3456',
      notes: 'Credit purchase for weekly stock',
      createdBy: adminId
    });

    // Purchase 5 (10 days ago)
    const date5 = new Date(now);
    date5.setDate(now.getDate() - 10);
    const p5Items = [
      { vegetable: veg4._id, vegetableName: veg4.name, quantity: 180, unit: 'KG', ratePerUnit: 42, itemTotal: 7560 },
      { vegetable: veg5._id, vegetableName: veg5.name, quantity: 150, unit: 'KG', ratePerUnit: 18, itemTotal: 2700 }
    ];
    const p5Subtotal = 10260;
    const p5Charges = { transportation: 500, loadingUnloading: 150, commission: 0, other: 0 };
    const p5AddTotal = 650;
    const p5Grand = 10910;

    await VegetablePurchase.create({
      purchaseId: `VP-${date5.toISOString().slice(0,10).replace(/-/g,'')}-0001`,
      purchaseDate: date5,
      purchaseTime: '11:20',
      supplier: sup2._id,
      supplierName: sup2.name,
      items: p5Items,
      vegetableSubtotal: p5Subtotal,
      charges: p5Charges,
      additionalChargesTotal: p5AddTotal,
      grandTotal: p5Grand,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      paidAmount: p5Grand,
      balanceAmount: 0,
      billNumber: 'BILL-8650',
      vehicleNumber: 'KA 04 H 7890',
      notes: 'Full payment completed via GPay',
      createdBy: adminId
    });

    console.log('====================================================');
    console.log('SAMPLE DATA SEEDED SUCCESSFULLY FOR PRIVATE BUSINESS!');
    console.log('Vegetables Seeded: 5 (Tomato, Onion, Potato, Carrot, Cabbage)');
    console.log('Suppliers Seeded: 3');
    console.log('Purchases Seeded: 5 transactions');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding vegetable data:', err);
    process.exit(1);
  }
};

seedVegetableData();
