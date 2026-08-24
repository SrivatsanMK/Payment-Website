import crypto from 'crypto';
import { getItem, putItem, deleteItem, queryItems, scanItems } from './dynamoHelper';
import { VegetablePurchaseModel } from '../types/models';
import { getAllSuppliers } from './supplierRepository';
import { getAllVegetables } from './vegetableRepository';

/**
 * Generate human-readable unique Purchase ID: VP-YYYYMMDD-XXXX
 */
export const generatePurchaseId = async (): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `VP-${dateStr}-`;

  const all = await findAllPurchases();
  const todayPurchases = all.filter((p) => p.purchaseId && p.purchaseId.startsWith(prefix));

  let sequence = 1;
  if (todayPurchases.length > 0) {
    todayPurchases.sort((a, b) => (b.purchaseId || '').localeCompare(a.purchaseId || ''));
    const last = todayPurchases[0];
    const parts = last.purchaseId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  const paddedSeq = sequence.toString().padStart(4, '0');
  return `${prefix}${paddedSeq}`;
};

/**
 * Find purchase by internal UUID ID
 */
export const findPurchaseById = async (id: string): Promise<VegetablePurchaseModel | null> => {
  return getItem<VegetablePurchaseModel>(`PURCHASE#${id}`, 'METADATA');
};

/**
 * Find purchase by purchaseId (e.g. VP-20260824-0001)
 */
export const findPurchaseByPurchaseId = async (purchaseId: string): Promise<VegetablePurchaseModel | null> => {
  if (!purchaseId) return null;
  const purchases = await queryItems<VegetablePurchaseModel>({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :gsi3pk',
    ExpressionAttributeValues: {
      ':gsi3pk': `PURCHASE_ID#${purchaseId.trim()}`,
    },
  });

  if (purchases.length > 0) return purchases[0];

  const all = await findAllPurchases();
  return all.find((p) => p.purchaseId === purchaseId.trim()) || null;
};

/**
 * Find all purchases
 */
export const findAllPurchases = async (): Promise<VegetablePurchaseModel[]> => {
  const purchases = await queryItems<VegetablePurchaseModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'PURCHASES',
    },
    ScanIndexForward: false, // Descending by purchaseDate
  });

  if (purchases.length > 0) return purchases;

  return scanItems<VegetablePurchaseModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'PURCHASE#',
      ':sk': 'METADATA',
    },
  });
};

/**
 * Find purchases by supplier ID
 */
export const findPurchasesBySupplierId = async (supplierId: string): Promise<VegetablePurchaseModel[]> => {
  if (!supplierId) return [];
  const purchases = await queryItems<VegetablePurchaseModel>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk',
    ExpressionAttributeValues: {
      ':gsi2pk': `SUPPLIER#${supplierId}#PURCHASES`,
    },
    ScanIndexForward: false,
  });

  if (purchases.length > 0) return purchases;

  const all = await findAllPurchases();
  return all.filter((p) => p.supplier === supplierId);
};

/**
 * Count purchases referencing a vegetable
 */
export const countPurchasesByVegetableId = async (vegetableId: string): Promise<number> => {
  const all = await findAllPurchases();
  return all.filter((p) => (p.items || []).some((item) => item.vegetable === vegetableId)).length;
};

/**
 * Count purchases referencing a supplier
 */
export const countPurchasesBySupplierId = async (supplierId: string): Promise<number> => {
  const all = await findAllPurchases();
  return all.filter((p) => p.supplier === supplierId).length;
};

/**
 * Create Vegetable Purchase
 */
export const createVegetablePurchase = async (
  data: Partial<VegetablePurchaseModel>
): Promise<VegetablePurchaseModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const purchaseDate = data.purchaseDate || nowIso;
  const purchaseId = data.purchaseId || (await generatePurchaseId());

  const newPurchase: VegetablePurchaseModel & Record<string, any> = {
    PK: `PURCHASE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'PURCHASES',
    GSI1SK: `${purchaseDate}#${purchaseId}`,
    GSI2PK: `SUPPLIER#${data.supplier}#PURCHASES`,
    GSI2SK: `${purchaseDate}#${purchaseId}`,
    GSI3PK: `PURCHASE_ID#${purchaseId}`,
    GSI3SK: 'METADATA',
    id,
    _id: id,
    purchaseId,
    purchaseDate,
    purchaseTime: data.purchaseTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    supplier: data.supplier || '',
    supplierName: data.supplierName || '',
    items: data.items || [],
    vegetableSubtotal: Number(data.vegetableSubtotal) || 0,
    charges: data.charges || { transportation: 0, loadingUnloading: 0, commission: 0, other: 0 },
    additionalChargesTotal: Number(data.additionalChargesTotal) || 0,
    grandTotal: Number(data.grandTotal) || 0,
    paymentMethod: data.paymentMethod || 'Cash',
    paymentStatus: data.paymentStatus || 'Paid',
    paidAmount: Number(data.paidAmount) || 0,
    balanceAmount: Number(data.balanceAmount) || 0,
    billNumber: data.billNumber || '',
    vehicleNumber: data.vehicleNumber || '',
    notes: data.notes || '',
    createdBy: data.createdBy,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return putItem<VegetablePurchaseModel>(newPurchase);
};

/**
 * Update Vegetable Purchase
 */
export const updateVegetablePurchase = async (
  id: string,
  updates: Partial<VegetablePurchaseModel>
): Promise<VegetablePurchaseModel | null> => {
  const existing = await findPurchaseById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const purchaseDate = updates.purchaseDate !== undefined ? updates.purchaseDate : existing.purchaseDate;
  const supplier = updates.supplier !== undefined ? updates.supplier : existing.supplier;

  const updated: VegetablePurchaseModel & Record<string, any> = {
    ...existing,
    PK: `PURCHASE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'PURCHASES',
    GSI1SK: `${purchaseDate}#${existing.purchaseId}`,
    GSI2PK: `SUPPLIER#${supplier}#PURCHASES`,
    GSI2SK: `${purchaseDate}#${existing.purchaseId}`,
    GSI3PK: `PURCHASE_ID#${existing.purchaseId}`,
    GSI3SK: 'METADATA',
    purchaseDate,
    purchaseTime: updates.purchaseTime !== undefined ? updates.purchaseTime : existing.purchaseTime,
    supplier,
    supplierName: updates.supplierName !== undefined ? updates.supplierName : existing.supplierName,
    items: updates.items !== undefined ? updates.items : existing.items,
    vegetableSubtotal: updates.vegetableSubtotal !== undefined ? Number(updates.vegetableSubtotal) : existing.vegetableSubtotal,
    charges: updates.charges !== undefined ? updates.charges : existing.charges,
    additionalChargesTotal: updates.additionalChargesTotal !== undefined ? Number(updates.additionalChargesTotal) : existing.additionalChargesTotal,
    grandTotal: updates.grandTotal !== undefined ? Number(updates.grandTotal) : existing.grandTotal,
    paymentMethod: updates.paymentMethod !== undefined ? updates.paymentMethod : existing.paymentMethod,
    paymentStatus: updates.paymentStatus !== undefined ? updates.paymentStatus : existing.paymentStatus,
    paidAmount: updates.paidAmount !== undefined ? Number(updates.paidAmount) : existing.paidAmount,
    balanceAmount: updates.balanceAmount !== undefined ? Number(updates.balanceAmount) : existing.balanceAmount,
    billNumber: updates.billNumber !== undefined ? updates.billNumber : existing.billNumber,
    vehicleNumber: updates.vehicleNumber !== undefined ? updates.vehicleNumber : existing.vehicleNumber,
    notes: updates.notes !== undefined ? updates.notes : existing.notes,
    updatedAt: now,
  };

  return putItem<VegetablePurchaseModel>(updated);
};

/**
 * Delete Vegetable Purchase
 */
export const deleteVegetablePurchase = async (id: string): Promise<void> => {
  await deleteItem(`PURCHASE#${id}`, 'METADATA');
};

/**
 * Paginated Vegetable Purchases List
 */
export const findPurchasesPaginated = async (params: {
  page: number;
  limit: number;
  search?: string;
  supplier?: string;
  vegetable?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
}): Promise<{ purchases: VegetablePurchaseModel[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
  const { page, limit, search, supplier, vegetable, paymentStatus, paymentMethod, startDate, endDate, sortBy } = params;

  let allPurchases = await findAllPurchases();

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    allPurchases = allPurchases.filter(
      (p) =>
        (p.purchaseId && p.purchaseId.toLowerCase().includes(s)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(s)) ||
        (p.billNumber && p.billNumber.toLowerCase().includes(s)) ||
        (p.vehicleNumber && p.vehicleNumber.toLowerCase().includes(s)) ||
        (p.items || []).some((item) => item.vegetableName && item.vegetableName.toLowerCase().includes(s))
    );
  }

  if (supplier) allPurchases = allPurchases.filter((p) => p.supplier === supplier);
  if (vegetable) allPurchases = allPurchases.filter((p) => (p.items || []).some((item) => item.vegetable === vegetable));
  if (paymentStatus) allPurchases = allPurchases.filter((p) => p.paymentStatus === paymentStatus);
  if (paymentMethod) allPurchases = allPurchases.filter((p) => p.paymentMethod === paymentMethod);

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date(8640000000000000);
    if (endDate) end.setHours(23, 59, 59, 999);

    allPurchases = allPurchases.filter((p) => {
      const d = new Date(p.purchaseDate);
      return d >= start && d <= end;
    });
  }

  // Sort
  if (sortBy === 'oldest') {
    allPurchases.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
  } else if (sortBy === 'amount_high') {
    allPurchases.sort((a, b) => (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0));
  } else if (sortBy === 'amount_low') {
    allPurchases.sort((a, b) => (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0));
  } else {
    // Newest first (default)
    allPurchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  const total = allPurchases.length;
  const skip = (page - 1) * limit;
  const paginated = allPurchases.slice(skip, skip + limit);

  return {
    purchases: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get Dashboard Analytics Metrics
 */
export const getDashboardAnalyticsMetrics = async (params: {
  range?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  const { range = 'this_month', startDate, endDate } = params;
  const all = await findAllPurchases();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let todayAmount = 0;
  let todayKG = 0;
  let monthAmount = 0;
  let monthKG = 0;
  let totalAmount = 0;
  let totalKG = 0;

  all.forEach((p) => {
    const d = new Date(p.purchaseDate);
    const amt = Number(p.grandTotal) || 0;
    const kg = (p.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    totalAmount += amt;
    totalKG += kg;

    if (d >= todayStart && d <= todayEnd) {
      todayAmount += amt;
      todayKG += kg;
    }

    if (d >= monthStart && d <= monthEnd) {
      monthAmount += amt;
      monthKG += kg;
    }
  });

  const activeSuppliers = (await getAllSuppliers()).filter((s) => s.isActive !== false).length;
  const activeVegetables = (await getAllVegetables(true)).length;
  const avgRatePerKG = totalKG > 0 ? Number((totalAmount / totalKG).toFixed(2)) : 0;

  // Filter for Trends & Breakdowns
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
    filterStart = new Date(startDate);
    filterEnd = new Date(endDate);
    filterEnd.setHours(23, 59, 59, 999);
  }

  const filteredPurchases = all.filter((p) => {
    const d = new Date(p.purchaseDate);
    return d >= filterStart && d <= filterEnd;
  });

  // Daily Trends Map (date -> { amount, kg })
  const trendMap: Record<string, { amount: number; kg: number }> = {};
  const vegMap: Record<string, { kg: number; spent: number; count: number }> = {};
  const supplierMap: Record<string, { amount: number; kg: number; count: number }> = {};

  filteredPurchases.forEach((p) => {
    const dateKey = new Date(p.purchaseDate).toISOString().slice(0, 10);
    const amt = Number(p.grandTotal) || 0;
    const pKG = (p.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    if (!trendMap[dateKey]) trendMap[dateKey] = { amount: 0, kg: 0 };
    trendMap[dateKey].amount += amt;
    trendMap[dateKey].kg += pKG;

    const supName = p.supplierName || 'Unknown';
    if (!supplierMap[supName]) supplierMap[supName] = { amount: 0, kg: 0, count: 0 };
    supplierMap[supName].amount += amt;
    supplierMap[supName].kg += pKG;
    supplierMap[supName].count += 1;

    (p.items || []).forEach((item) => {
      const vName = item.vegetableName || 'Unknown';
      if (!vegMap[vName]) vegMap[vName] = { kg: 0, spent: 0, count: 0 };
      vegMap[vName].kg += Number(item.quantity) || 0;
      vegMap[vName].spent += Number(item.itemTotal) || 0;
      vegMap[vName].count += 1;
    });
  });

  const trends = Object.keys(trendMap)
    .sort()
    .map((date) => ({ date, amount: trendMap[date].amount, kg: trendMap[date].kg }));

  const topVegetables = Object.entries(vegMap)
    .map(([name, v]) => ({ name, kg: v.kg, spent: v.spent, count: v.count }))
    .sort((a, b) => b.kg - a.kg)
    .slice(0, 8);

  const supplierDistribution = Object.entries(supplierMap)
    .map(([name, s]) => ({ name, amount: s.amount, kg: s.kg, count: s.count }))
    .sort((a, b) => b.amount - a.amount);

  all.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  const recentPurchases = all.slice(0, 5);

  return {
    summary: {
      todayAmount,
      todayKG,
      monthAmount,
      monthKG,
      totalAmount,
      totalKG,
      totalPurchases: all.length,
      activeSuppliers,
      activeVegetables,
      avgRatePerKG,
    },
    trends,
    topVegetables,
    supplierDistribution,
    recentPurchases,
  };
};

/**
 * Get Reports Metrics
 */
export const getReportsMetrics = async (params: {
  range?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  const { range = 'this_month', startDate, endDate } = params;
  const all = await findAllPurchases();

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
    filterStart = new Date(startDate);
    filterEnd = new Date(endDate);
    filterEnd.setHours(23, 59, 59, 999);
  }

  const filteredPurchases = all.filter((p) => {
    const d = new Date(p.purchaseDate);
    return d >= filterStart && d <= filterEnd;
  });

  filteredPurchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  let totalAmount = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalKG = 0;

  const vegMap: Record<string, { quantity: number; amount: number; count: number }> = {};
  const supMap: Record<string, { quantity: number; amount: number; paid: number; outstanding: number; count: number }> = {};

  filteredPurchases.forEach((p) => {
    const grand = Number(p.grandTotal) || 0;
    const paid = Number(p.paidAmount) || 0;
    const bal = Number(p.balanceAmount) || 0;
    const pKG = (p.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    totalAmount += grand;
    totalPaid += paid;
    totalOutstanding += bal;
    totalKG += pKG;

    const sName = p.supplierName || 'Unknown';
    if (!supMap[sName]) supMap[sName] = { quantity: 0, amount: 0, paid: 0, outstanding: 0, count: 0 };
    supMap[sName].quantity += pKG;
    supMap[sName].amount += grand;
    supMap[sName].paid += paid;
    supMap[sName].outstanding += bal;
    supMap[sName].count += 1;

    (p.items || []).forEach((item) => {
      const vName = item.vegetableName || 'Unknown';
      if (!vegMap[vName]) vegMap[vName] = { quantity: 0, amount: 0, count: 0 };
      vegMap[vName].quantity += Number(item.quantity) || 0;
      vegMap[vName].amount += Number(item.itemTotal) || 0;
      vegMap[vName].count += 1;
    });
  });

  const avgRate = totalKG > 0 ? (totalAmount / totalKG).toFixed(2) : '0.00';

  const vegetableReport = Object.entries(vegMap)
    .map(([vegetableName, v]) => ({
      vegetableName,
      totalQuantity: v.quantity,
      totalAmount: v.amount,
      count: v.count,
      avgRate: v.quantity > 0 ? Number((v.amount / v.quantity).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const supplierReport = Object.entries(supMap)
    .map(([supplierName, s]) => ({
      supplierName,
      totalQuantity: s.quantity,
      totalAmount: s.amount,
      paidAmount: s.paid,
      outstanding: s.outstanding,
      count: s.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    range,
    dateFilter: { startDate: filterStart, endDate: filterEnd },
    summary: {
      totalAmount,
      totalPaid,
      totalOutstanding,
      totalPurchases: filteredPurchases.length,
      totalKG,
      avgRate,
    },
    vegetableReport,
    supplierReport,
    purchases: filteredPurchases,
  };
};
