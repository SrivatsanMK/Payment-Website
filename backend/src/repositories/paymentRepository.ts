import crypto from 'crypto';
import { getItem, putItem, queryItems, scanItems, updateItem } from './dynamoHelper';
import { PaymentModel } from '../types/models';
import { findCustomerById } from './customerRepository';

/**
 * Find payment by ID
 */
export const findPaymentById = async (id: string): Promise<PaymentModel | null> => {
  return getItem<PaymentModel>(`PAYMENT#${id}`, 'METADATA');
};

/**
 * Find all payments
 */
export const findAllPayments = async (): Promise<PaymentModel[]> => {
  const payments = await queryItems<PaymentModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'PAYMENTS',
    },
    ScanIndexForward: false, // Descending by createdAt
  });

  if (payments.length > 0) return payments;

  return scanItems<PaymentModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'PAYMENT#',
      ':sk': 'METADATA',
    },
  });
};

/**
 * Find payments for an invoice number
 */
export const findPaymentsByInvoiceNumber = async (invoiceNumber: string): Promise<PaymentModel[]> => {
  if (!invoiceNumber) return [];
  const payments = await queryItems<PaymentModel>({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :gsi3pk',
    ExpressionAttributeValues: {
      ':gsi3pk': `INVOICE#${invoiceNumber}#PAYMENTS`,
    },
    ScanIndexForward: false,
  });

  if (payments.length > 0) return payments;

  const all = await findAllPayments();
  return all.filter((p) => p.invoiceNumber === invoiceNumber);
};

/**
 * Find payments for multiple invoice numbers in bulk
 */
export const findPaymentsByInvoiceNumbersBulk = async (
  invoiceNumbers: string[]
): Promise<PaymentModel[]> => {
  if (!invoiceNumbers || invoiceNumbers.length === 0) return [];
  const set = new Set(invoiceNumbers);
  const all = await findAllPayments();
  return all.filter((p) => set.has(p.invoiceNumber));
};

/**
 * Find payments for a customer
 */
export const findPaymentsByCustomerId = async (customerId: string): Promise<PaymentModel[]> => {
  if (!customerId) return [];
  const payments = await queryItems<PaymentModel>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk',
    ExpressionAttributeValues: {
      ':gsi2pk': `CUSTOMER#${customerId}#PAYMENTS`,
    },
    ScanIndexForward: false,
  });

  if (payments.length > 0) return payments;

  const all = await findAllPayments();
  return all.filter((p) => p.customerId === customerId);
};

/**
 * Create Payment record
 */
export const createPayment = async (data: Partial<PaymentModel>): Promise<PaymentModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const timeString = data.time || now.toTimeString().split(' ')[0];

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
      };
    }
  }

  const newPayment: PaymentModel & Record<string, any> = {
    PK: `PAYMENT#${id}`,
    SK: 'METADATA',
    GSI1PK: 'PAYMENTS',
    GSI1SK: `${nowIso}#${id}`,
    GSI2PK: `CUSTOMER#${data.customerId}#PAYMENTS`,
    GSI2SK: `${nowIso}#${id}`,
    GSI3PK: `INVOICE#${data.invoiceNumber}#PAYMENTS`,
    GSI3SK: `PAYMENT#${id}`,
    id,
    _id: id,
    invoiceNumber: data.invoiceNumber || '',
    customerId: data.customerId || '',
    customer: customerSnapshot,
    amount: Number(data.amount) || 0,
    date: data.date || nowIso,
    time: timeString,
    transactionId: data.transactionId || `TXN-${Date.now()}`,
    paymentMethod: data.paymentMethod || 'Cash',
    status: data.status || 'Completed',
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt,
    createdBy: data.createdBy,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return putItem<PaymentModel>(newPayment);
};

/**
 * Atomic Payment Approval: transitions from 'Pending' to 'Received'
 */
export const approvePaymentAtomic = async (
  id: string,
  adminObj: any
): Promise<PaymentModel | null> => {
  const existing = await findPaymentById(id);
  if (!existing) return null;

  if (existing.status !== 'Pending') {
    // Already approved / processed
    return null;
  }

  const approvalTime = new Date().toISOString();
  const updated = await updateItem<PaymentModel>(
    `PAYMENT#${id}`,
    'METADATA',
    'SET #status = :received, approvedAt = :approvedAt, approvedBy = :approvedBy, updatedAt = :updatedAt',
    {
      ':received': 'Received',
      ':approvedAt': approvalTime,
      ':approvedBy': adminObj,
      ':updatedAt': approvalTime,
      ':pending': 'Pending',
    },
    {
      '#status': 'status',
    },
    '#status = :pending'
  );

  return updated;
};

/**
 * Paginated payments list
 */
export const findPaymentsPaginated = async (params: {
  page: number;
  limit: number;
  search?: string;
  customerId?: string;
  isAdmin: boolean;
}): Promise<{ total: number; page: number; pages: number; payments: PaymentModel[] }> => {
  const { page, limit, search, customerId } = params;

  let allPayments = await findAllPayments();

  // Role filter: Customer only sees their own payments
  if (customerId) {
    allPayments = allPayments.filter((p) => p.customerId === customerId);
  }

  // Search filter (by invoiceNumber or transactionId)
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    allPayments = allPayments.filter(
      (p) =>
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(s)) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(s))
    );
  }

  // Sort descending by createdAt
  allPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allPayments.length;
  const skip = (page - 1) * limit;
  const paginated = allPayments.slice(skip, skip + limit);

  return {
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    payments: paginated,
  };
};
