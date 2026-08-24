import crypto from 'crypto';
import { getItem, putItem, deleteItem, queryItems, scanItems, updateItem } from './dynamoHelper';
import { InvoiceModel } from '../types/models';
import { findCustomerById } from './customerRepository';

/**
 * Generate unique 6-digit Invoice Number: INV-XXXXXX
 */
export const generateUniqueInvoiceNumber = async (): Promise<string> => {
  let uniqueNum = '';
  let exists = true;
  while (exists) {
    const randomVal = Math.floor(100000 + Math.random() * 900000);
    uniqueNum = `INV-${randomVal}`;
    const check = await findInvoiceByInvoiceNumber(uniqueNum);
    if (!check) exists = false;
  }
  return uniqueNum;
};

/**
 * Find invoice by internal UUID id
 */
export const findInvoiceById = async (id: string): Promise<InvoiceModel | null> => {
  return getItem<InvoiceModel>(`INVOICE#${id}`, 'METADATA');
};

/**
 * Find invoice by Invoice Number (e.g. INV-123456)
 */
export const findInvoiceByInvoiceNumber = async (invoiceNumber: string): Promise<InvoiceModel | null> => {
  if (!invoiceNumber) return null;
  const clean = invoiceNumber.trim();
  const invoices = await queryItems<InvoiceModel>({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :gsi3pk',
    ExpressionAttributeValues: {
      ':gsi3pk': `INVOICE_NUMBER#${clean}`,
    },
  });

  if (invoices.length > 0) return invoices[0];

  const all = await findAllInvoices();
  return all.find((i) => i.invoiceNumber === clean) || null;
};

/**
 * Find all invoices
 */
export const findAllInvoices = async (): Promise<InvoiceModel[]> => {
  const invoices = await queryItems<InvoiceModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'INVOICES',
    },
    ScanIndexForward: false, // Descending by createdAt
  });

  if (invoices.length > 0) return invoices;

  return scanItems<InvoiceModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'INVOICE#',
      ':sk': 'METADATA',
    },
  });
};

/**
 * Find invoices by Customer ID
 */
export const findInvoicesByCustomerId = async (customerId: string): Promise<InvoiceModel[]> => {
  if (!customerId) return [];
  const invoices = await queryItems<InvoiceModel>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk',
    ExpressionAttributeValues: {
      ':gsi2pk': `CUSTOMER#${customerId}#INVOICES`,
    },
    ScanIndexForward: false,
  });

  if (invoices.length > 0) return invoices;

  const all = await findAllInvoices();
  return all.filter((i) => i.customerId === customerId);
};

/**
 * Create Invoice
 */
export const createInvoice = async (data: Partial<InvoiceModel>): Promise<InvoiceModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const invoiceNumber = data.invoiceNumber || (await generateUniqueInvoiceNumber());

  // Customer snapshot
  let customerSnapshot = data.customer;
  if (!customerSnapshot && data.customerId) {
    const cust = await findCustomerById(data.customerId);
    if (cust) {
      customerSnapshot = {
        _id: cust.id || cust._id,
        id: cust.id || cust._id,
        customerId: cust.customerId,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        address: cust.address,
        gstNumber: cust.gstNumber,
      };
    }
  }

  const finalAmount = Number(data.finalAmount) || 0;
  const paidAmount = Number(data.paidAmount) || 0;
  const remainingAmount = data.remainingAmount !== undefined ? Number(data.remainingAmount) : Math.max(0, finalAmount - paidAmount);

  const newInvoice: InvoiceModel & Record<string, any> = {
    PK: `INVOICE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'INVOICES',
    GSI1SK: `${now}#${invoiceNumber}`,
    GSI2PK: `CUSTOMER#${data.customerId}#INVOICES`,
    GSI2SK: `${now}#${invoiceNumber}`,
    GSI3PK: `INVOICE_NUMBER#${invoiceNumber}`,
    GSI3SK: 'METADATA',
    id,
    _id: id,
    invoiceNumber,
    customerId: data.customerId || '',
    customer: customerSnapshot,
    products: data.products || [],
    discount: Number(data.discount) || 0,
    gst: Number(data.gst) || 0,
    finalAmount,
    paidAmount,
    remainingAmount,
    qrCodeImage: data.qrCodeImage || '',
    deliveryAddress: data.deliveryAddress || '',
    shippedAddress: data.shippedAddress || '',
    vehicleNumber: data.vehicleNumber || '',
    transportMode: data.transportMode || 'Road',
    dueDate: data.dueDate || now,
    createdBy: data.createdBy,
    paymentApprovedAt: data.paymentApprovedAt,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  return putItem<InvoiceModel>(newInvoice);
};

/**
 * Update Invoice
 */
export const updateInvoice = async (id: string, updates: Partial<InvoiceModel>): Promise<InvoiceModel | null> => {
  const existing = await findInvoiceById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const finalAmount = updates.finalAmount !== undefined ? Number(updates.finalAmount) : existing.finalAmount;
  const paidAmount = updates.paidAmount !== undefined ? Number(updates.paidAmount) : existing.paidAmount;
  const remainingAmount = updates.remainingAmount !== undefined ? Number(updates.remainingAmount) : Math.max(0, finalAmount - paidAmount);

  const updatedInvoice: InvoiceModel & Record<string, any> = {
    ...existing,
    PK: `INVOICE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'INVOICES',
    GSI1SK: `${existing.createdAt || now}#${existing.invoiceNumber}`,
    GSI2PK: `CUSTOMER#${existing.customerId}#INVOICES`,
    GSI2SK: `${existing.createdAt || now}#${existing.invoiceNumber}`,
    GSI3PK: `INVOICE_NUMBER#${existing.invoiceNumber}`,
    GSI3SK: 'METADATA',
    products: updates.products !== undefined ? updates.products : existing.products,
    discount: updates.discount !== undefined ? Number(updates.discount) : existing.discount,
    gst: updates.gst !== undefined ? Number(updates.gst) : existing.gst,
    finalAmount,
    paidAmount,
    remainingAmount,
    qrCodeImage: updates.qrCodeImage !== undefined ? updates.qrCodeImage : existing.qrCodeImage,
    deliveryAddress: updates.deliveryAddress !== undefined ? updates.deliveryAddress : existing.deliveryAddress,
    shippedAddress: updates.shippedAddress !== undefined ? updates.shippedAddress : existing.shippedAddress,
    vehicleNumber: updates.vehicleNumber !== undefined ? updates.vehicleNumber : existing.vehicleNumber,
    transportMode: updates.transportMode !== undefined ? updates.transportMode : existing.transportMode,
    dueDate: updates.dueDate !== undefined ? updates.dueDate : existing.dueDate,
    paymentApprovedAt: updates.paymentApprovedAt !== undefined ? updates.paymentApprovedAt : existing.paymentApprovedAt,
    updatedAt: now,
  };

  return putItem<InvoiceModel>(updatedInvoice);
};

/**
 * Delete Invoice
 */
export const deleteInvoice = async (id: string): Promise<void> => {
  await deleteItem(`INVOICE#${id}`, 'METADATA');
};

/**
 * Find Invoices with filtering and pagination
 */
export const findInvoicesPaginated = async (params: {
  page: number;
  limit: number;
  search?: string;
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  customerId?: string;
  isAdmin: boolean;
}): Promise<{ total: number; page: number; pages: number; invoices: InvoiceModel[] }> => {
  const { page, limit, search, dateFilter, startDate, endDate, status, customerId } = params;

  let allInvoices = await findAllInvoices();

  // Role filter: Customer only sees their own
  if (customerId) {
    allInvoices = allInvoices.filter((i) => i.customerId === customerId);
  }

  // Status filter: unpaid vs paid
  if (status) {
    const s = status.toLowerCase();
    if (s === 'unpaid' || s === 'pending') {
      allInvoices = allInvoices.filter((i) => i.remainingAmount > 0);
    } else if (s === 'paid') {
      allInvoices = allInvoices.filter((i) => i.remainingAmount <= 0);
    }
  }

  // Date range filter
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (dateFilter === 'today') {
    allInvoices = allInvoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d >= todayStart && d <= todayEnd;
    });
  } else if (dateFilter === 'this_month') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    allInvoices = allInvoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d >= startOfMonth && d <= endOfMonth;
    });
  } else if (dateFilter === 'custom' && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    allInvoices = allInvoices.filter((i) => {
      const d = new Date(i.createdAt);
      return d >= start && d <= end;
    });
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    allInvoices = allInvoices.filter((i) => {
      const invMatch = i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q);
      const custName = i.customer?.name && i.customer.name.toLowerCase().includes(q);
      const custId = i.customer?.customerId && i.customer.customerId.toLowerCase().includes(q);
      return invMatch || custName || custId;
    });
  }

  // Sort descending by createdAt
  allInvoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allInvoices.length;
  const skip = (page - 1) * limit;
  const paginated = allInvoices.slice(skip, skip + limit);

  return {
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    invoices: paginated,
  };
};

/**
 * Find Invoices with expired QR codes (> 7 days after paymentApprovedAt)
 */
export const findExpiredQrCodes = async (cutoffDate: Date): Promise<InvoiceModel[]> => {
  const all = await findAllInvoices();
  return all.filter((inv) => {
    if (!inv.qrCodeImage || !inv.paymentApprovedAt) return false;
    const approvedDate = new Date(inv.paymentApprovedAt);
    return approvedDate <= cutoffDate;
  });
};

/**
 * Clear QR code image path from an Invoice
 */
export const clearQrCodeImage = async (id: string): Promise<void> => {
  const existing = await findInvoiceById(id);
  if (existing) {
    await updateInvoice(id, { qrCodeImage: '' });
  }
};
