import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getItem, putItem, deleteItem, queryItems, scanItems } from './dynamoHelper';
import { CustomerModel } from '../types/models';

export const hashCustomerPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const compareCustomerPassword = async (enteredPassword: string, storedHash: string): Promise<boolean> => {
  if (!enteredPassword || !storedHash) return false;
  return bcrypt.compare(enteredPassword, storedHash);
};

/**
 * Generate unique 5-digit Customer ID: CUSTXXXXX
 */
export const generateUniqueCustomerId = async (): Promise<string> => {
  let uniqueId = '';
  let exists = true;
  while (exists) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    uniqueId = `CUST${randomNum}`;
    const check = await findCustomerByCustomerId(uniqueId);
    if (!check) exists = false;
  }
  return uniqueId;
};

/**
 * Find customer by internal UUID id
 */
export const findCustomerById = async (id: string): Promise<CustomerModel | null> => {
  return getItem<CustomerModel>(`CUSTOMER#${id}`, 'PROFILE');
};

/**
 * Find all customers
 */
export const findAllCustomers = async (): Promise<CustomerModel[]> => {
  const customers = await queryItems<CustomerModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'CUSTOMERS',
    },
    ScanIndexForward: false, // Descending order by createdAt
  });

  if (customers.length > 0) return customers;

  return scanItems<CustomerModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'CUSTOMER#',
      ':sk': 'PROFILE',
    },
  });
};

/**
 * Find customer by customerId string (e.g. CUST12345)
 */
export const findCustomerByCustomerId = async (customerId: string): Promise<CustomerModel | null> => {
  if (!customerId) return null;
  const cleanId = customerId.trim().toUpperCase();
  const all = await findAllCustomers();
  return all.find((c) => c.customerId && c.customerId.toUpperCase() === cleanId) || null;
};

/**
 * Find customer by email
 */
export const findCustomerByEmail = async (email: string): Promise<CustomerModel | null> => {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const all = await findAllCustomers();
  return all.find((c) => c.email && c.email.toLowerCase() === cleanEmail) || null;
};

/**
 * Find customer by phone
 */
export const findCustomerByPhone = async (phone: string): Promise<CustomerModel | null> => {
  if (!phone) return null;
  const cleanPhone = phone.trim();
  const all = await findAllCustomers();
  return all.find((c) => c.phone && c.phone.trim() === cleanPhone) || null;
};

/**
 * Find customer by any identifier: customerId, email, or phone
 */
export const findCustomerByIdentifier = async (identifier: string): Promise<CustomerModel | null> => {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const cleanUpper = identifier.trim().toUpperCase();

  const all = await findAllCustomers();
  for (const c of all) {
    if (
      (c.customerId && c.customerId.toUpperCase() === cleanUpper) ||
      (c.email && c.email.toLowerCase() === clean) ||
      (c.phone && c.phone.trim() === identifier.trim())
    ) {
      return c;
    }
  }
  return null;
};

/**
 * Find customers with search, pagination, and sorting
 */
export const findCustomersPaginated = async (params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<{ total: number; page: number; pages: number; customers: CustomerModel[] }> => {
  const { page, limit, search } = params;
  let allCustomers = await findAllCustomers();

  // Search filter
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    allCustomers = allCustomers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.phone && c.phone.includes(s)) ||
        (c.customerId && c.customerId.toLowerCase().includes(s))
    );
  }

  // Sort descending by createdAt
  allCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allCustomers.length;
  const skip = (page - 1) * limit;
  const paginated = allCustomers.slice(skip, skip + limit);

  return {
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    customers: paginated,
  };
};

/**
 * Create new Customer
 */
export const createCustomer = async (data: Partial<CustomerModel>): Promise<CustomerModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const customerId = data.customerId || (await generateUniqueCustomerId());

  let hashedPassword = data.password || 'customer123';
  if (!hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
    hashedPassword = await hashCustomerPassword(hashedPassword);
  }

  const newCustomer: CustomerModel & Record<string, any> = {
    PK: `CUSTOMER#${id}`,
    SK: 'PROFILE',
    GSI1PK: 'CUSTOMERS',
    GSI1SK: `${now}#${id}`,
    GSI2PK: `CUST_IDENTIFIER#${customerId.toLowerCase()}`,
    GSI2SK: 'PROFILE',
    GSI3PK: `CUSTOMER_EMAIL#${(data.email || '').toLowerCase()}`,
    GSI3SK: 'PROFILE',
    id,
    _id: id,
    customerId,
    name: (data.name || '').trim(),
    email: (data.email || '').toLowerCase().trim(),
    phone: (data.phone || '').trim(),
    address: (data.address || '').trim(),
    gstNumber: data.gstNumber ? data.gstNumber.trim() : undefined,
    password: hashedPassword,
    role: 'Customer',
    status: data.status || 'Active',
    joiningDate: data.joiningDate || now,
    profilePicture: data.profilePicture || '',
    lastPasswordChangeDate: now,
    forcedPasswordReset: data.forcedPasswordReset !== undefined ? data.forcedPasswordReset : false,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  return putItem<CustomerModel>(newCustomer);
};

/**
 * Update Customer
 */
export const updateCustomer = async (id: string, updates: Partial<CustomerModel>): Promise<CustomerModel | null> => {
  const existing = await findCustomerById(id);
  if (!existing) return null;

  const now = new Date().toISOString();

  let updatedPassword = existing.password;
  let lastPasswordChangeDate = existing.lastPasswordChangeDate || now;
  if (updates.password && updates.password !== existing.password) {
    if (!updates.password.startsWith('$2a$') && !updates.password.startsWith('$2b$')) {
      updatedPassword = await hashCustomerPassword(updates.password);
    } else {
      updatedPassword = updates.password;
    }
    lastPasswordChangeDate = now;
  }

  const updatedCustomer: CustomerModel & Record<string, any> = {
    ...existing,
    PK: `CUSTOMER#${id}`,
    SK: 'PROFILE',
    GSI1PK: 'CUSTOMERS',
    GSI1SK: `${existing.createdAt || now}#${id}`,
    name: updates.name !== undefined ? updates.name.trim() : existing.name,
    email: updates.email !== undefined ? updates.email.toLowerCase().trim() : existing.email,
    phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
    address: updates.address !== undefined ? updates.address.trim() : existing.address,
    gstNumber: updates.gstNumber !== undefined ? updates.gstNumber.trim() : existing.gstNumber,
    password: updatedPassword,
    status: updates.status || existing.status,
    profilePicture: updates.profilePicture !== undefined ? updates.profilePicture : existing.profilePicture,
    lastPasswordChangeDate,
    forcedPasswordReset: updates.forcedPasswordReset !== undefined ? updates.forcedPasswordReset : existing.forcedPasswordReset,
    updatedAt: now,
  };

  return putItem<CustomerModel>(updatedCustomer);
};

/**
 * Delete Customer
 */
export const deleteCustomer = async (id: string): Promise<void> => {
  await deleteItem(`CUSTOMER#${id}`, 'PROFILE');
};
