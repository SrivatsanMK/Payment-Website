import crypto from 'crypto';
import { getItem, putItem, deleteItem, queryItems, scanItems } from './dynamoHelper';
import { VegetableModel } from '../types/models';

/**
 * Get all vegetables
 */
export const getAllVegetables = async (activeOnly = false): Promise<VegetableModel[]> => {
  const vegetables = await queryItems<VegetableModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'VEGETABLES',
    },
    ScanIndexForward: true, // Alphabetical order
  });

  let results = vegetables;
  if (results.length === 0) {
    results = await scanItems<VegetableModel>({
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':prefix': 'VEGETABLE#',
        ':sk': 'METADATA',
      },
    });
    results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (activeOnly) {
    return results.filter((v) => v.isActive !== false);
  }
  return results;
};

/**
 * Find vegetable by ID
 */
export const findVegetableById = async (id: string): Promise<VegetableModel | null> => {
  return getItem<VegetableModel>(`VEGETABLE#${id}`, 'METADATA');
};

/**
 * Find vegetable by name (case-insensitive)
 */
export const findVegetableByName = async (name: string): Promise<VegetableModel | null> => {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  const all = await getAllVegetables();
  return all.find((v) => v.name && v.name.toLowerCase() === clean) || null;
};

/**
 * Create Vegetable
 */
export const createVegetable = async (data: Partial<VegetableModel>): Promise<VegetableModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const name = (data.name || '').trim();

  const newVeg: VegetableModel & Record<string, any> = {
    PK: `VEGETABLE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'VEGETABLES',
    GSI1SK: `${name.toLowerCase()}#${id}`,
    GSI2PK: `VEGETABLE_NAME#${name.toLowerCase()}`,
    GSI2SK: 'METADATA',
    id,
    _id: id,
    name,
    category: data.category || 'General',
    defaultUnit: data.defaultUnit || 'KG',
    notes: data.notes || '',
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  return putItem<VegetableModel>(newVeg);
};

/**
 * Update Vegetable
 */
export const updateVegetable = async (id: string, updates: Partial<VegetableModel>): Promise<VegetableModel | null> => {
  const existing = await findVegetableById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const name = updates.name !== undefined ? updates.name.trim() : existing.name;

  const updated: VegetableModel & Record<string, any> = {
    ...existing,
    PK: `VEGETABLE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'VEGETABLES',
    GSI1SK: `${name.toLowerCase()}#${id}`,
    GSI2PK: `VEGETABLE_NAME#${name.toLowerCase()}`,
    GSI2SK: 'METADATA',
    name,
    category: updates.category !== undefined ? updates.category : existing.category,
    defaultUnit: updates.defaultUnit !== undefined ? updates.defaultUnit : existing.defaultUnit,
    notes: updates.notes !== undefined ? updates.notes : existing.notes,
    isActive: updates.isActive !== undefined ? updates.isActive : existing.isActive,
    updatedAt: now,
  };

  return putItem<VegetableModel>(updated);
};

/**
 * Delete Vegetable
 */
export const deleteVegetable = async (id: string): Promise<void> => {
  await deleteItem(`VEGETABLE#${id}`, 'METADATA');
};
