import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  getAllVegetables,
  findVegetableById,
  findVegetableByName,
  createVegetable as repoCreateVegetable,
  updateVegetable as repoUpdateVegetable,
  deleteVegetable as repoDeleteVegetable,
} from '../repositories/vegetableRepository';
import {
  getAllSuppliers,
  findSupplierById,
  createSupplier as repoCreateSupplier,
  updateSupplier as repoUpdateSupplier,
  deleteSupplier as repoDeleteSupplier,
} from '../repositories/supplierRepository';
import {
  findPurchasesPaginated,
  findPurchaseById,
  createVegetablePurchase as repoCreatePurchase,
  updateVegetablePurchase as repoUpdatePurchase,
  deleteVegetablePurchase as repoDeletePurchase,
  getDashboardAnalyticsMetrics,
  getReportsMetrics,
  countPurchasesByVegetableId,
  countPurchasesBySupplierId,
  findAllPurchases,
} from '../repositories/vegetablePurchaseRepository';
import {
  getPrivateBusinessSettings,
  updatePrivateBusinessSettings,
} from '../repositories/settingRepository';

// ============================================================================
// VEGETABLE MASTER CONTROLLERS
// ============================================================================

export const getVegetables = async (req: AuthRequest, res: Response) => {
  try {
    const { activeOnly } = req.query;
    const vegetables = await getAllVegetables(activeOnly === 'true');
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
    const existing = await findVegetableByName(trimmedName);

    if (existing && existing.isActive !== false) {
      return res.status(400).json({ success: false, message: `Vegetable '${trimmedName}' already exists` });
    }

    const vegetable = await repoCreateVegetable({
      name: trimmedName,
      category: category || 'General',
      defaultUnit: defaultUnit || 'KG',
      notes: notes || '',
      isActive: true,
      createdBy: req.user?.id
    });

    req.app.get('io')?.emit('DATA_UPDATED');
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

    const vegetable = await findVegetableById(id);
    if (!vegetable) {
      return res.status(404).json({ success: false, message: 'Vegetable not found' });
    }

    if (name && name.trim().toLowerCase() !== vegetable.name.toLowerCase()) {
      const existing = await findVegetableByName(name.trim());
      if (existing && (existing.id || existing._id) !== id && existing.isActive !== false) {
        return res.status(400).json({ success: false, message: `Another vegetable named '${name.trim()}' already exists` });
      }
    }

    const updated = await repoUpdateVegetable(id, {
      name,
      category,
      defaultUnit,
      notes,
      isActive,
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({ success: true, message: 'Vegetable updated successfully', vegetable: updated });
  } catch (error: any) {
    console.error('Error updating vegetable:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteVegetable = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if vegetable is used in purchases
    const usageCount = await countPurchasesByVegetableId(id);
    if (usageCount > 0) {
      const vegetable = await repoUpdateVegetable(id, { isActive: false });
      req.app.get('io')?.emit('DATA_UPDATED');
      return res.status(200).json({
        success: true,
        message: 'Vegetable deactivated because it has existing purchase records',
        vegetable
      });
    }

    await repoDeleteVegetable(id);
    req.app.get('io')?.emit('DATA_UPDATED');
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
    const suppliers = await getAllSuppliers();
    const allPurchases = await findAllPurchases();

    // Aggregate supplier metrics
    const metricsMap = new Map<string, any>();
    allPurchases.forEach((p) => {
      const sId = p.supplier;
      if (!metricsMap.has(sId)) {
        metricsMap.set(sId, {
          totalPurchases: 0,
          totalAmount: 0,
          totalPaid: 0,
          outstandingBalance: 0,
          lastPurchaseDate: null,
          totalKG: 0,
        });
      }
      const m = metricsMap.get(sId)!;
      m.totalPurchases += 1;
      m.totalAmount += Number(p.grandTotal) || 0;
      m.totalPaid += Number(p.paidAmount) || 0;
      m.outstandingBalance += Number(p.balanceAmount) || 0;
      const pKG = (p.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      m.totalKG += pKG;

      if (!m.lastPurchaseDate || new Date(p.purchaseDate) > new Date(m.lastPurchaseDate)) {
        m.lastPurchaseDate = p.purchaseDate;
      }
    });

    const enrichedSuppliers = suppliers.map((sup: any) => {
      const metric = metricsMap.get(sup.id || sup._id) || {};
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

    const supplier = await repoCreateSupplier({
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

    req.app.get('io')?.emit('DATA_UPDATED');
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

    const supplier = await findSupplierById(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const updated = await repoUpdateSupplier(id, {
      name,
      contactPerson,
      phone,
      email,
      address,
      marketLocation,
      gstNumber,
      notes,
      isActive,
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({ success: true, message: 'Supplier updated successfully', supplier: updated });
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deleteSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const usageCount = await countPurchasesBySupplierId(id);

    if (usageCount > 0) {
      const supplier = await repoUpdateSupplier(id, { isActive: false });
      req.app.get('io')?.emit('DATA_UPDATED');
      return res.status(200).json({
        success: true,
        message: 'Supplier deactivated because historical purchase records exist',
        supplier
      });
    }

    await repoDeleteSupplier(id);
    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// ============================================================================
// VEGETABLE PURCHASE CONTROLLERS
// ============================================================================

export const getPurchases = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const { search, supplier, vegetable, paymentStatus, paymentMethod, startDate, endDate, sortBy } = req.query;

    const result = await findPurchasesPaginated({
      page,
      limit,
      search: search as string,
      supplier: supplier as string,
      vegetable: vegetable as string,
      paymentStatus: paymentStatus as string,
      paymentMethod: paymentMethod as string,
      startDate: startDate as string,
      endDate: endDate as string,
      sortBy: sortBy as string,
    });

    return res.status(200).json({
      success: true,
      purchases: result.purchases,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getPurchaseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const purchase = await findPurchaseById(id);
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

    const supplierDoc = await findSupplierById(supplierId);
    if (!supplierDoc) {
      return res.status(400).json({ success: false, message: 'Invalid supplier selected' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one vegetable item is required' });
    }

    let calculatedSubtotal = 0;
    const processedItems: any[] = [];

    for (const item of items) {
      const vegId = item.vegetableId || item.vegetable;
      if (!vegId) {
        return res.status(400).json({ success: false, message: 'Each item must have a valid vegetable selected' });
      }

      const vegDoc = await findVegetableById(vegId);
      if (!vegDoc) {
        return res.status(400).json({ success: false, message: `Vegetable not found for ID: ${vegId}` });
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
        vegetable: vegDoc.id || vegDoc._id,
        vegetableName: vegDoc.name,
        quantity: qty,
        unit: item.unit || vegDoc.defaultUnit || 'KG',
        ratePerUnit: rate,
        itemTotal
      });
    }

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));

    const transportation = Math.max(0, parseFloat(charges?.transportation) || 0);
    const loadingUnloading = Math.max(0, parseFloat(charges?.loadingUnloading) || 0);
    const commission = Math.max(0, parseFloat(charges?.commission) || 0);
    const other = Math.max(0, parseFloat(charges?.other) || 0);

    const additionalChargesTotal = Number((transportation + loadingUnloading + commission + other).toFixed(2));
    const grandTotal = Number((calculatedSubtotal + additionalChargesTotal).toFixed(2));

    const status = paymentStatus || 'Paid';
    let validatedPaidAmount = 0;

    if (status === 'Paid') {
      validatedPaidAmount = grandTotal;
    } else if (status === 'Pending') {
      validatedPaidAmount = 0;
    } else {
      validatedPaidAmount = Math.max(0, parseFloat(paidAmount) || 0);
      if (validatedPaidAmount > grandTotal) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot exceed grand total' });
      }
    }

    const balanceAmount = Number((grandTotal - validatedPaidAmount).toFixed(2));

    const newPurchase = await repoCreatePurchase({
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
      purchaseTime: purchaseTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      supplier: supplierDoc.id || supplierDoc._id,
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

    req.app.get('io')?.emit('DATA_UPDATED');
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
    const purchase = await findPurchaseById(id);

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

    let updatedSupplierId = purchase.supplier;
    let updatedSupplierName = purchase.supplierName;

    if (supplierId && supplierId !== purchase.supplier) {
      const supplierDoc = await findSupplierById(supplierId);
      if (!supplierDoc) {
        return res.status(400).json({ success: false, message: 'Invalid supplier selected' });
      }
      updatedSupplierId = supplierDoc.id || supplierDoc._id || '';
      updatedSupplierName = supplierDoc.name;
    }

    let processedItems = purchase.items;
    let calculatedSubtotal = purchase.vegetableSubtotal;

    if (items && Array.isArray(items) && items.length > 0) {
      calculatedSubtotal = 0;
      processedItems = [];

      for (const item of items) {
        const vegId = item.vegetableId || item.vegetable;
        const vegDoc = await findVegetableById(vegId);
        if (!vegDoc) {
          return res.status(400).json({ success: false, message: `Vegetable not found for ID: ${vegId}` });
        }

        const qty = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.ratePerUnit) || 0;

        if (qty <= 0 || rate < 0) {
          return res.status(400).json({ success: false, message: 'Invalid quantity or rate' });
        }

        const itemTotal = Number((qty * rate).toFixed(2));
        calculatedSubtotal += itemTotal;

        processedItems.push({
          vegetable: vegDoc.id || vegDoc._id || '',
          vegetableName: vegDoc.name,
          quantity: qty,
          unit: item.unit || vegDoc.defaultUnit || 'KG',
          ratePerUnit: rate,
          itemTotal
        });
      }
      calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
    }

    let transportation = purchase.charges?.transportation || 0;
    let loadingUnloading = purchase.charges?.loadingUnloading || 0;
    let commission = purchase.charges?.commission || 0;
    let other = purchase.charges?.other || 0;

    if (charges) {
      transportation = Math.max(0, parseFloat(charges.transportation) || 0);
      loadingUnloading = Math.max(0, parseFloat(charges.loadingUnloading) || 0);
      commission = Math.max(0, parseFloat(charges.commission) || 0);
      other = Math.max(0, parseFloat(charges.other) || 0);
    }

    const additionalChargesTotal = Number((transportation + loadingUnloading + commission + other).toFixed(2));
    const grandTotal = Number((calculatedSubtotal + additionalChargesTotal).toFixed(2));

    const status = paymentStatus || purchase.paymentStatus;
    let validatedPaidAmount = 0;
    if (status === 'Paid') {
      validatedPaidAmount = grandTotal;
    } else if (status === 'Pending') {
      validatedPaidAmount = 0;
    } else {
      validatedPaidAmount = Math.max(0, parseFloat(paidAmount !== undefined ? paidAmount : purchase.paidAmount) || 0);
      if (validatedPaidAmount > grandTotal) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot exceed grand total' });
      }
    }

    const balanceAmount = Number((grandTotal - validatedPaidAmount).toFixed(2));

    const updated = await repoUpdatePurchase(id, {
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
      purchaseTime,
      supplier: updatedSupplierId,
      supplierName: updatedSupplierName,
      items: processedItems,
      vegetableSubtotal: calculatedSubtotal,
      charges: { transportation, loadingUnloading, commission, other },
      additionalChargesTotal,
      grandTotal,
      paymentMethod: paymentMethod || purchase.paymentMethod,
      paymentStatus: status,
      paidAmount: validatedPaidAmount,
      balanceAmount,
      billNumber,
      vehicleNumber,
      notes,
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({ success: true, message: 'Purchase updated successfully', purchase: updated });
  } catch (error: any) {
    console.error('Error updating purchase:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const deletePurchase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const purchase = await findPurchaseById(id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    await repoDeletePurchase(id);
    req.app.get('io')?.emit('DATA_UPDATED');
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
    const data = await getDashboardAnalyticsMetrics({
      range: range as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.status(200).json({
      success: true,
      summary: data.summary,
      trends: data.trends,
      topVegetables: data.topVegetables,
      supplierDistribution: data.supplierDistribution,
      recentPurchases: data.recentPurchases
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
    const data = await getReportsMetrics({
      range: range as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.status(200).json({
      success: true,
      range: data.range,
      dateFilter: data.dateFilter,
      summary: data.summary,
      vegetableReport: data.vegetableReport,
      supplierReport: data.supplierReport,
      purchases: data.purchases
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
    const adminId = req.user?.id || 'default';
    const settings = await getPrivateBusinessSettings(adminId);
    return res.status(200).json({ success: true, settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user?.id || 'default';
    const updated = await updatePrivateBusinessSettings(adminId, req.body);
    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({ success: true, message: 'Settings updated successfully', settings: updated });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
