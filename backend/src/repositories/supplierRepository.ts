import crypto from 'crypto';
import { getItem, putItem, deleteItem, queryItems, scanItems } from './dynamoHelper';
import { SupplierModel } from '../types/models';

/**
 * Get all suppliers
 */
export const getAllSuppliers = async (): Promise<SupplierModel[]> => {
  const suppliers = await queryItems<SupplierModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'SUPPLIERS',
    },
    ScanIndexForward: true, // Alphabetical
  });

  if (suppliers.length > 0) return suppliers;

  const all = await scanItems<SupplierModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'SUPPLIER#',
      ':sk': 'METADATA',
    },
  });
  all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return all;
};

/**
 * Find supplier by ID
 */
export const findSupplierById = async (id: string): Promise<SupplierModel | null> => {
  return getItem<SupplierModel>(`SUPPLIER#${id}`, 'METADATA');
};

/**
 * Find supplier by name (case-insensitive)
 */
export const findSupplierByName = async (name: string): Promise<SupplierModel | null> => {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  const all = await getAllSuppliers();
  return all.find((s) => s.name && s.name.toLowerCase() === clean) || null;
};

/**
 * Create Supplier
 */
export const createSupplier = async (data: Partial<SupplierModel>): Promise<SupplierModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const name = (data.name || '').trim();

  const newSupplier: SupplierModel & Record<string, any> = {
    PK: `SUPPLIER#${id}`,
    SK: 'METADATA',
    GSI1PK: 'SUPPLIERS',
    GSI1SK: `${name.toLowerCase()}#${id}`,
    GSI2PK: `SUPPLIER_NAME#${name.toLowerCase()}`,
    GSI2SK: 'METADATA',
    id,
    _id: id,
    name,
    contactPerson: data.contactPerson ? data.contactPerson.trim() : '',
    phone: data.phone ? data.phone.trim() : '',
    email: data.email ? data.email.toLowerCase().trim() : '',
    address: data.address ? data.address.trim() : '',
    marketLocation: data.marketLocation ? data.marketLocation.trim() : '',
    gstNumber: data.gstNumber ? data.gstNumber.trim() : '',
    notes: data.notes || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  return putItem<SupplierModel>(newSupplier);
};

/**
 * Update Supplier
 */
export const updateSupplier = async (id: string, updates: Partial<SupplierModel>): Promise<SupplierModel | null> => {
  const existing = await findSupplierById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = updates.name !== undefined ? updates.name.trim() : existing.name;

  const updated: SupplierModel & Record<string, any> = {
    ...existing,
    PK: `SUPPLIER#${id}`,
    SK: 'METADATA',
    GSI1PK: 'SUPPLIERS',
    GSI1SK: `${name.toLowerCase()}#${id}`,
    GSI2PK: `SUPPLIER_NAME#${name.toLowerCase()}`,
    GSI2SK: 'METADATA',
    name,
    contactPerson: updates.contactPerson !== undefined ? updates.contactPerson.trim() : existing.contactPerson,
    phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
    email: updates.email !== undefined ? updates.email.toLowerCase().trim() : existing.email,
    address: updates.address !== undefined ? updates.address.trim() : existing.address,
    marketLocation: updates.marketLocation !== undefined ? updates.marketLocation.trim() : existing.marketLocation,
    gstNumber: updates.gstNumber !== undefined ? updates.gstNumber.trim() : existing.gstNumber,
    notes: updates.notes !== undefined ? updates.notes : existing.notes,
    isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
    updatedAt: now,
  };

  return putItem<SupplierModel>(updated);
};

/**
 * Delete Supplier
 */
export const deleteSupplier = async (id: string): Promise<void> => {
  await deleteItem(`SUPPLIER#${id}`, 'METADATA');
};
