import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import Vegetable from '../models/Vegetable';
import Supplier from '../models/Supplier';
import VegetablePurchase from '../models/VegetablePurchase';
import PrivateBusinessSetting from '../models/PrivateBusinessSetting';

/**
 * Helper to generate human-readable unique Purchase ID: VP-YYYYMMDD-XXXX
 */
const generatePurchaseId = async (): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `VP-${dateStr}-`;
  
  // Find highest existing purchase ID for today
  const lastPurchase = await VegetablePurchase.findOne({
    purchaseId: new RegExp(`^${prefix}`)
  }).sort({ purchaseId: -1 });

  let sequence = 1;
  if (lastPurchase && lastPurchase.purchaseId) {
    const parts = lastPurchase.purchaseId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  const paddedSeq = sequence.toString().padStart(4, '0');
  return `${prefix}${paddedSeq}`;
};

// ============================================================================
// VEGETABLE MASTER CONTROLLERS
// ============================================================================

export const getVegetables = async (req: AuthRequest, res: Response) => {
  try {
    const { activeOnly } = req.query;
    const filter: any = {};
    if (activeOnly === 'true') {
      filter.isActive = true;
    }

    const vegetables = await Vegetable.find(filter).sort({ name: 1 });
    return res.status(200).json({ success: true, count: vegetables.length, vegetables });
  } catch (error: any) {
    console.error('Error fetching vegetables:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const createVegetable = async (req: AuthRequest, res: Response) => {
  try {
    const { name, category, defaultUnit, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vegetable name is required' });
    }

    const trimmedName = name.trim();
    const existing = await Vegetable.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Vegetable '${trimmedName}' already exists` });
    }

    const vegetable = await Vegetable.create({
      name: trimmedName,
      category: category || 'General',
      defaultUnit: defaultUnit || 'KG',
      notes: notes || '',
      isActive: true,
      createdBy: req.user?.id
    });

    return res.status(201).json({ success: true, message: 'Vegetable created successfully', vegetable });
  } catch (error: any) {
    console.error('Error creating vegetable:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateVegetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, defaultUnit, notes, isActive } = req.body;

    const vegetable = await Vegetable.findById(id);
    if (!vegetable) {
      return res.status(404).json({ success: false, message: 'Vegetable not found' });
    }

    if (name && name.trim().toLowerCase() !== vegetable.name.toLowerCase()) {
      const existing = await Vegetable.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Another vegetable named '${name.trim()}' already exists` });
      }
      vegetable.name = name.trim();
    }

    if (category !== undefined) vegetable.category = category;
    if (defaultUnit !== undefined) vegetable.defaultUnit = defaultUnit;
    if (notes !== undefined) vegetable.notes = notes;
    if (isActive !== undefined) vegetable.isActive = isActive;

    await vegetable.save();
    return res.status(200).json({ success: true, message: 'Vegetable updated successfully', vegetable });
  } catch (error: any) {
    console.error('Error updating vegetable:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteVegetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if vegetable is used in purchases
    const usageCount = await VegetablePurchase.countDocuments({ 'items.vegetable': id });
    if (usageCount > 0) {
      // Soft-delete by setting isActive = false to preserve historical integrity
      const vegetable = await Vegetable.findByIdAndUpdate(id, { isActive: false }, { new: true });
      return res.status(200).json({
        success: true,
        message: 'Vegetable deactivated because it has existing purchase records',
        vegetable
      });
    }

    await Vegetable.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Vegetable deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vegetable:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ============================================================================
// SUPPLIER / DEALER CONTROLLERS
// ============================================================================

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 }).lean();

    // Aggregate supplier metrics (total purchases, total KG, total spent, remaining balance, last purchase date)
    const supplierIds = suppliers.map((s) => s._id);

    const metricsPipeline: any[] = [
      { $match: { supplier: { $in: supplierIds } } },
      {
        $group: {
          _id: '$supplier',
          totalPurchases: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          outstandingBalance: { $sum: '$balanceAmount' },
          lastPurchaseDate: { $max: '$purchaseDate' },
          totalKG: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          }
        }
      }
    ];

    const metricsRes = await VegetablePurchase.aggregate(metricsPipeline);
    const metricsMap = new Map<string, any>();
    metricsRes.forEach((m) => {
      metricsMap.set(m._id.toString(), m);
    });

    const enrichedSuppliers = suppliers.map((sup: any) => {
      const metric = metricsMap.get(sup._id.toString()) || {};
      return {
        ...sup,
        totalPurchases: metric.totalPurchases || 0,
        totalAmount: metric.totalAmount || 0,
        totalPaid: metric.totalPaid || 0,
        outstandingBalance: metric.outstandingBalance || 0,
        totalKG: metric.totalKG || 0,
        lastPurchaseDate: metric.lastPurchaseDate || null
      };
    });

    return res.status(200).json({ success: true, count: enrichedSuppliers.length, suppliers: enrichedSuppliers });
  } catch (error: any) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const createSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { name, contactPerson, phone, email, address, marketLocation, gstNumber, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      contactPerson: contactPerson || '',
      phone: phone || '',
      email: email || '',
      address: address || '',
      marketLocation: marketLocation || '',
      gstNumber: gstNumber || '',
      notes: notes || '',
      isActive: true,
      createdBy: req.user?.id
    });

    return res.status(201).json({ success: true, message: 'Supplier created successfully', supplier });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email, address, marketLocation, gstNumber, notes, isActive } = req.body;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    if (name !== undefined) supplier.name = name.trim();
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (phone !== undefined) supplier.phone = phone;
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;
    if (marketLocation !== undefined) supplier.marketLocation = marketLocation;
    if (gstNumber !== undefined) supplier.gstNumber = gstNumber;
    if (notes !== undefined) supplier.notes = notes;
    if (isActive !== undefined) supplier.isActive = isActive;

    await supplier.save();

    // Also update snapshot name in purchases if supplier name changed
    if (name !== undefined) {
      await VegetablePurchase.updateMany({ supplier: id }, { supplierName: name.trim() });
    }

    return res.status(200).json({ success: true, message: 'Supplier updated successfully', supplier });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usageCount = await VegetablePurchase.countDocuments({ supplier: id });

    if (usageCount > 0) {
      const supplier = await Supplier.findByIdAndUpdate(id, { isActive: false }, { new: true });
      return res.status(200).json({
        success: true,
        message: 'Supplier deactivated because historical purchase records exist',
        supplier
      });
    }

    await Supplier.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ============================================================================
// VEGETABLE PURCHASE CONTROLLERS (Strict Math Validation & Recalculation)
// ============================================================================

export const getPurchases = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;

    const { search, supplier, vegetable, paymentStatus, paymentMethod, startDate, endDate, sortBy } = req.query;

    const query: any = {};

    // Search filter
    if (search && (search as string).trim()) {
      const searchRegex = new RegExp((search as string).trim(), 'i');
      query.$or = [
        { purchaseId: searchRegex },
        { supplierName: searchRegex },
        { billNumber: searchRegex },
        { vehicleNumber: searchRegex },
        { 'items.vegetableName': searchRegex }
      ];
    }

    if (supplier) query.supplier = supplier;
    if (vegetable) query['items.vegetable'] = vegetable;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.purchaseDate.$lte = end;
      }
    }

    // Sort order
    let sortOptions: any = { purchaseDate: -1, createdAt: -1 };
    if (sortBy === 'oldest') sortOptions = { purchaseDate: 1, createdAt: 1 };
    else if (sortBy === 'amount_high') sortOptions = { grandTotal: -1 };
    else if (sortBy === 'amount_low') sortOptions = { grandTotal: 1 };

    const purchases = await VegetablePurchase.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await VegetablePurchase.countDocuments(query);

    return res.status(200).json({
      success: true,
      purchases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getPurchaseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const purchase = await VegetablePurchase.findById(id).populate('supplier').populate('items.vegetable');
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }
    return res.status(200).json({ success: true, purchase });
  } catch (error: any) {
    console.error('Error fetching purchase:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const createPurchase = async (req: AuthRequest, res: Response) => {
  try {
    const {
      purchaseDate,
      purchaseTime,
      supplierId,
      items,
      charges,
      paymentMethod,
      paymentStatus,
      paidAmount,
      billNumber,
      vehicleNumber,
      notes
    } = req.body;

    if (!supplierId) {
      return res.status(400).json({ success: false, message: 'Supplier is required' });
    }

    const supplierDoc = await Supplier.findById(supplierId);
    if (!supplierDoc) {
      return res.status(400).json({ success: false, message: 'Invalid supplier selected' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one vegetable item is required' });
    }

    // Process & strictly validate each line item
    let calculatedSubtotal = 0;
    const processedItems: any[] = [];

    for (const item of items) {
      if (!item.vegetableId) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid vegetable selected' });
      }

      const vegDoc = await Vegetable.findById(item.vegetableId);
      if (!vegDoc) {
        return res.status(400).json({ success: false, message: `Vegetable not found for ID: ${item.vegetableId}` });
      }

      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.ratePerUnit) || 0;

      if (qty <= 0) {
        return res.status(400).json({ success: false, message: `Quantity for ${vegDoc.name} must be greater than 0` });
      }
      if (rate < 0) {
        return res.status(400).json({ success: false, message: `Rate for ${vegDoc.name} cannot be negative` });
      }

      const itemTotal = Number((qty * rate).toFixed(2));
      calculatedSubtotal += itemTotal;

      processedItems.push({
        vegetable: vegDoc._id,
        vegetableName: vegDoc.name,
        quantity: qty,
        unit: item.unit || vegDoc.defaultUnit || 'KG',
        ratePerUnit: rate,
        itemTotal
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    // Calculate additional charges
    const transportation = Math.max(0, parseFloat(charges?.transportation) || 0);
    const loadingUnloading = Math.max(0, parseFloat(charges?.loadingUnloading) || 0);
    const commission = Math.max(0, parseFloat(charges?.commission) || 0);
    const other = Math.max(0, parseFloat(charges?.other) || 0);

    const additionalChargesTotal = Number((transportation + loadingUnloading + commission + other).toFixed(2));
    const grandTotal = Number((calculatedSubtotal + additionalChargesTotal).toFixed(2));

    // Validate payment math
    const status = paymentStatus || 'Paid';
    let validatedPaidAmount = 0;

    if (status === 'Paid') {
      validatedPaidAmount = grandTotal;
    } else if (status === 'Pending') {
      validatedPaidAmount = 0;
    } else {
      // Partially Paid
      validatedPaidAmount = Math.max(0, parseFloat(paidAmount) || 0);
      if (validatedPaidAmount > grandTotal) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot exceed grand total' });
      }
    }

    const balanceAmount = Number((grandTotal - validatedPaidAmount).toFixed(2));
    const purchaseId = await generatePurchaseId();

    const newPurchase = await VegetablePurchase.create({
      purchaseId,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      purchaseTime: purchaseTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      supplier: supplierDoc._id,
      supplierName: supplierDoc.name,
      items: processedItems,
      vegetableSubtotal: calculatedSubtotal,
      charges: {
        transportation,
        loadingUnloading,
        commission,
        other
      },
      additionalChargesTotal,
      grandTotal,
      paymentMethod: paymentMethod || 'Cash',
      paymentStatus: status,
      paidAmount: validatedPaidAmount,
      balanceAmount,
      billNumber: billNumber || '',
      vehicleNumber: vehicleNumber || '',
      notes: notes || '',
      createdBy: req.user?.id
    });

    return res.status(201).json({
      success: true,
      message: 'Vegetable purchase saved successfully',
      purchase: newPurchase
    });
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updatePurchase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const purchase = await VegetablePurchase.findById(id);

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    const {
      purchaseDate,
      purchaseTime,
      supplierId,
      items,
      charges,
      paymentMethod,
      paymentStatus,
      paidAmount,
      billNumber,
      vehicleNumber,
      notes
    } = req.body;

    if (supplierId && supplierId !== purchase.supplier.toString()) {
      const supplierDoc = await Supplier.findById(supplierId);
      if (!supplierDoc) {
        return res.status(400).json({ success: false, message: 'Invalid supplier selected' });
      }
      purchase.supplier = supplierDoc._id as any;
      purchase.supplierName = supplierDoc.name;
    }

    if (items && Array.isArray(items) && items.length > 0) {
      let calculatedSubtotal = 0;
      const processedItems: any[] = [];

      for (const item of items) {
        const vegDoc = await Vegetable.findById(item.vegetableId);
        if (!vegDoc) {
          return res.status(400).json({ success: false, message: `Vegetable not found for ID: ${item.vegetableId}` });
        }

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.ratePerUnit) || 0;

        if (qty <= 0 || rate < 0) {
          return res.status(400).json({ success: false, message: 'Invalid quantity or rate' });
        }

        const itemTotal = Number((qty * rate).toFixed(2));
        calculatedSubtotal += itemTotal;

        processedItems.push({
          vegetable: vegDoc._id,
          vegetableName: vegDoc.name,
          quantity: qty,
          unit: item.unit || vegDoc.defaultUnit || 'KG',
          ratePerUnit: rate,
          itemTotal
        });
      }

      purchase.items = processedItems;
      purchase.vegetableSubtotal = Number(calculatedSubtotal.toFixed(2));
    }

    if (charges) {
      const transportation = Math.max(0, parseFloat(charges.transportation) || 0);
      const loadingUnloading = Math.max(0, parseFloat(charges.loadingUnloading) || 0);
      const commission = Math.max(0, parseFloat(charges.commission) || 0);
      const other = Math.max(0, parseFloat(charges.other) || 0);

      purchase.charges = { transportation, loadingUnloading, commission, other };
      purchase.additionalChargesTotal = Number((transportation + loadingUnloading + commission + other).toFixed(2));
    }

    purchase.grandTotal = Number((purchase.vegetableSubtotal + purchase.additionalChargesTotal).toFixed(2));

    const status = paymentStatus || purchase.paymentStatus;
    purchase.paymentStatus = status;

    let validatedPaidAmount = 0;
    if (status === 'Paid') {
      validatedPaidAmount = purchase.grandTotal;
    } else if (status === 'Pending') {
      validatedPaidAmount = 0;
    } else {
      validatedPaidAmount = Math.max(0, parseFloat(paidAmount !== undefined ? paidAmount : purchase.paidAmount) || 0);
      if (validatedPaidAmount > purchase.grandTotal) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot exceed grand total' });
      }
    }

    purchase.paidAmount = validatedPaidAmount;
    purchase.balanceAmount = Number((purchase.grandTotal - validatedPaidAmount).toFixed(2));

    if (purchaseDate) purchase.purchaseDate = new Date(purchaseDate);
    if (purchaseTime !== undefined) purchase.purchaseTime = purchaseTime;
    if (paymentMethod) purchase.paymentMethod = paymentMethod;
    if (billNumber !== undefined) purchase.billNumber = billNumber;
    if (vehicleNumber !== undefined) purchase.vehicleNumber = vehicleNumber;
    if (notes !== undefined) purchase.notes = notes;

    await purchase.save();
    return res.status(200).json({ success: true, message: 'Purchase updated successfully', purchase });
  } catch (error: any) {
    console.error('Error updating purchase:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deletePurchase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const purchase = await VegetablePurchase.findById(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    await VegetablePurchase.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting purchase:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ============================================================================
// DASHBOARD ANALYTICS & AGGREGATIONS
// ============================================================================

export const getDashboardAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { range = 'this_month', startDate, endDate } = req.query;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Calculate Today's & Month's quick metrics
    const todayStats = await VegetablePurchase.aggregate([
      { $match: { purchaseDate: { $gte: todayStart, $lte: todayEnd } } },
      {
        $group: {
          _id: null,
          todayAmount: { $sum: '$grandTotal' },
          todayKG: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          }
        }
      }
    ]);

    const monthStats = await VegetablePurchase.aggregate([
      { $match: { purchaseDate: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: null,
          monthAmount: { $sum: '$grandTotal' },
          monthKG: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          }
        }
      }
    ]);

    const totalStats = await VegetablePurchase.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$grandTotal' },
          totalKG: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          },
          totalPurchases: { $sum: 1 }
        }
      }
    ]);

    const activeSuppliersCount = await Supplier.countDocuments({ isActive: true });
    const activeVegetablesCount = await Vegetable.countDocuments({ isActive: true });

    // 2. Build Date Range Match for Dashboard Charts & Trends
    let filterStart = monthStart;
    let filterEnd = monthEnd;

    if (range === 'today') {
      filterStart = todayStart;
      filterEnd = todayEnd;
    } else if (range === 'this_week') {
      const dayOfWeek = now.getDay();
      filterStart = new Date(now);
      filterStart.setDate(now.getDate() - dayOfWeek);
      filterStart.setHours(0, 0, 0, 0);
    } else if (range === 'last_3_months') {
      filterStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (range === 'last_6_months') {
      filterStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (range === 'this_year') {
      filterStart = new Date(now.getFullYear(), 0, 1);
    } else if (range === 'custom' && startDate && endDate) {
      filterStart = new Date(startDate as string);
      filterEnd = new Date(endDate as string);
      filterEnd.setHours(23, 59, 59, 999);
    }

    const rangeMatch = { $match: { purchaseDate: { $gte: filterStart, $lte: filterEnd } } };

    // Purchase Spending & KG Trend Aggregation
    const trendAgg = await VegetablePurchase.aggregate([
      rangeMatch,
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
          amount: { $sum: '$grandTotal' },
          kg: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top Vegetables Breakdown (Quantity & Amount)
    const vegBreakdown = await VegetablePurchase.aggregate([
      rangeMatch,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.vegetableName',
          totalKG: { $sum: '$items.quantity' },
          totalSpent: { $sum: '$items.itemTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalKG: -1 } },
      { $limit: 8 }
    ]);

    // Supplier Distribution Breakdown
    const supplierBreakdown = await VegetablePurchase.aggregate([
      rangeMatch,
      {
        $group: {
          _id: '$supplierName',
          totalAmount: { $sum: '$grandTotal' },
          totalKG: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Recent 5 purchases
    const recentPurchases = await VegetablePurchase.find()
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(5)
      .lean();

    const tStat = totalStats[0] || {};
    const avgRate = tStat.totalKG > 0 ? (tStat.totalAmount / tStat.totalKG).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      summary: {
        todayAmount: todayStats[0]?.todayAmount || 0,
        todayKG: todayStats[0]?.todayKG || 0,
        monthAmount: monthStats[0]?.monthAmount || 0,
        monthKG: monthStats[0]?.monthKG || 0,
        totalAmount: tStat.totalAmount || 0,
        totalKG: tStat.totalKG || 0,
        totalPurchases: tStat.totalPurchases || 0,
        activeSuppliers: activeSuppliersCount,
        activeVegetables: activeVegetablesCount,
        avgRatePerKG: parseFloat(avgRate)
      },
      trends: trendAgg.map((t) => ({ date: t._id, amount: t.amount, kg: t.kg })),
      topVegetables: vegBreakdown.map((v) => ({ name: v._id, kg: v.totalKG, spent: v.totalSpent, count: v.count })),
      supplierDistribution: supplierBreakdown.map((s) => ({ name: s._id, amount: s.totalAmount, kg: s.totalKG, count: s.count })),
      recentPurchases
    });
  } catch (error: any) {
    console.error('Error fetching dashboard analytics:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ============================================================================
// REPORTS CONTROLLER
// ============================================================================

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const { range = 'this_month', startDate, endDate } = req.query;

    const now = new Date();
    let filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (range === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (range === 'this_week') {
      const dayOfWeek = now.getDay();
      filterStart = new Date(now);
      filterStart.setDate(now.getDate() - dayOfWeek);
      filterStart.setHours(0, 0, 0, 0);
    } else if (range === 'last_3_months') {
      filterStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (range === 'last_6_months') {
      filterStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (range === 'this_year') {
      filterStart = new Date(now.getFullYear(), 0, 1);
    } else if (range === 'custom' && startDate && endDate) {
      filterStart = new Date(startDate as string);
      filterEnd = new Date(endDate as string);
      filterEnd.setHours(23, 59, 59, 999);
    }

    const rangeMatch = { $match: { purchaseDate: { $gte: filterStart, $lte: filterEnd } } };

    // Fetch all purchases matching date range
    const purchases = await VegetablePurchase.find({ purchaseDate: { $gte: filterStart, $lte: filterEnd } })
      .sort({ purchaseDate: -1 })
      .lean();

    // Aggregate summary metrics
    const summaryRes = await VegetablePurchase.aggregate([
      rangeMatch,
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$grandTotal' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$balanceAmount' },
          totalPurchases: { $sum: 1 },
          totalKG: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          }
        }
      }
    ]);

    // Vegetable-wise Report
    const vegReport = await VegetablePurchase.aggregate([
      rangeMatch,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.vegetableName',
          totalQuantity: { $sum: '$items.quantity' },
          totalAmount: { $sum: '$items.itemTotal' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          vegetableName: '$_id',
          totalQuantity: 1,
          totalAmount: 1,
          count: 1,
          avgRate: {
            $cond: [{ $gt: ['$totalQuantity', 0] }, { $divide: ['$totalAmount', '$totalQuantity'] }, 0]
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Supplier-wise Report
    const supplierReport = await VegetablePurchase.aggregate([
      rangeMatch,
      {
        $group: {
          _id: '$supplierName',
          totalQuantity: {
            $sum: {
              $reduce: {
                input: '$items',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.quantity'] }
              }
            }
          },
          totalAmount: { $sum: '$grandTotal' },
          paidAmount: { $sum: '$paidAmount' },
          outstanding: { $sum: '$balanceAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const summary = summaryRes[0] || {
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalPurchases: 0,
      totalKG: 0
    };

    summary.avgRate = summary.totalKG > 0 ? (summary.totalAmount / summary.totalKG).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      range,
      dateFilter: { startDate: filterStart, endDate: filterEnd },
      summary,
      vegetableReport: vegReport,
      supplierReport: supplierReport.map((s) => ({
        supplierName: s._id,
        totalQuantity: s.totalQuantity,
        totalAmount: s.totalAmount,
        paidAmount: s.paidAmount,
        outstanding: s.outstanding,
        count: s.count
      })),
      purchases
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ============================================================================
// SETTINGS CONTROLLER
// ============================================================================

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    let settings = await PrivateBusinessSetting.findOne({ createdBy: req.user?.id });
    if (!settings) {
      settings = await PrivateBusinessSetting.create({
        businessName: 'Private Business',
        ownerName: req.user?.username || 'Owner',
        currency: 'INR',
        defaultUnit: 'KG',
        defaultPaymentMethod: 'Cash',
        createdBy: req.user?.id
      });
    }
    return res.status(200).json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { businessName, ownerName, currency, defaultUnit, defaultPaymentMethod, address, phone, email } = req.body;

    let settings = await PrivateBusinessSetting.findOne({ createdBy: req.user?.id });
    if (!settings) {
      settings = new PrivateBusinessSetting({ createdBy: req.user?.id });
    }

    if (businessName !== undefined) settings.businessName = businessName;
    if (ownerName !== undefined) settings.ownerName = ownerName;
    if (currency !== undefined) settings.currency = currency;
    if (defaultUnit !== undefined) settings.defaultUnit = defaultUnit;
    if (defaultPaymentMethod !== undefined) settings.defaultPaymentMethod = defaultPaymentMethod;
    if (address !== undefined) settings.address = address;
    if (phone !== undefined) settings.phone = phone;
    if (email !== undefined) settings.email = email;

    await settings.save();
    return res.status(200).json({ success: true, message: 'Settings updated successfully', settings });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
