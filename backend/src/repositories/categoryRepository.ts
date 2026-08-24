import crypto from 'crypto';
import { getItem, putItem, queryItems, scanItems } from './dynamoHelper';
import { ProductCategoryModel, CategoryItem } from '../types/models';

/**
 * Get all categories from DynamoDB
 */
export const getAllCategories = async (): Promise<ProductCategoryModel[]> => {
  const categories = await queryItems<ProductCategoryModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'CATEGORIES',
    },
    ScanIndexForward: true, // Alphabetical order
  });

  if (categories.length > 0) return categories;

  return scanItems<ProductCategoryModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'CATEGORY#',
      ':sk': 'METADATA',
    },
  });
};

/**
 * Get active categories with active items
 */
export const getActiveCategories = async (): Promise<ProductCategoryModel[]> => {
  const all = await getAllCategories();
  return all
    .filter((cat) => cat.isActive !== false)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

/**
 * Find category by ID
 */
export const findCategoryById = async (id: string): Promise<ProductCategoryModel | null> => {
  return getItem<ProductCategoryModel>(`CATEGORY#${id}`, 'METADATA');
};

/**
 * Find category by name (case-insensitive)
 */
export const findCategoryByName = async (name: string): Promise<ProductCategoryModel | null> => {
  if (!name) return null;
  const cleanName = name.trim().toLowerCase();
  const all = await getAllCategories();
  return all.find((c) => c.name && c.name.toLowerCase() === cleanName) || null;
};

/**
 * Create Category
 */
export const createCategory = async (name: string, createdBy?: string): Promise<ProductCategoryModel> => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cleanName = name.trim();

  const newCat: ProductCategoryModel & Record<string, any> = {
    PK: `CATEGORY#${id}`,
    SK: 'METADATA',
    GSI1PK: 'CATEGORIES',
    GSI1SK: cleanName.toLowerCase(),
    GSI2PK: `CATEGORY_NAME#${cleanName.toLowerCase()}`,
    GSI2SK: 'METADATA',
    id,
    _id: id,
    name: cleanName,
    isActive: true,
    items: [],
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  return putItem<ProductCategoryModel>(newCat);
};

/**
 * Update Category Name
 */
export const updateCategoryName = async (id: string, name: string): Promise<ProductCategoryModel | null> => {
  const existing = await findCategoryById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const cleanName = name.trim();

  const updated: ProductCategoryModel & Record<string, any> = {
    ...existing,
    PK: `CATEGORY#${id}`,
    SK: 'METADATA',
    GSI1PK: 'CATEGORIES',
    GSI1SK: cleanName.toLowerCase(),
    GSI2PK: `CATEGORY_NAME#${cleanName.toLowerCase()}`,
    GSI2SK: 'METADATA',
    name: cleanName,
    updatedAt: now,
  };

  return putItem<ProductCategoryModel>(updated);
};

/**
 * Soft Delete (Deactivate) Category
 */
export const softDeleteCategory = async (id: string): Promise<ProductCategoryModel | null> => {
  const existing = await findCategoryById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: ProductCategoryModel & Record<string, any> = {
    ...existing,
    PK: `CATEGORY#${id}`,
    SK: 'METADATA',
    isActive: false,
    updatedAt: now,
  };

  return putItem<ProductCategoryModel>(updated);
};

/**
 * Add Item to Category
 */
export const addItemToCategory = async (
  categoryId: string,
  itemData: { name: string; colors?: string[]; unit?: string }
): Promise<ProductCategoryModel | null> => {
  const category = await findCategoryById(categoryId);
  if (!category) return null;

  const itemId = crypto.randomUUID();
  const newItem: CategoryItem = {
    id: itemId,
    _id: itemId,
    name: itemData.name.trim(),
    colors: itemData.colors || [],
    unit: itemData.unit || 'grams',
    isActive: true,
  };

  const updatedItems = [...(category.items || []), newItem];
  const now = new Date().toISOString();

  const updated: ProductCategoryModel & Record<string, any> = {
    ...category,
    PK: `CATEGORY#${categoryId}`,
    SK: 'METADATA',
    items: updatedItems,
    updatedAt: now,
  };

  return putItem<ProductCategoryModel>(updated);
};

/**
 * Update Item in Category
 */
export const updateItemInCategory = async (
  categoryId: string,
  itemId: string,
  updates: { name?: string; colors?: string[]; unit?: string }
): Promise<ProductCategoryModel | null> => {
  const category = await findCategoryById(categoryId);
  if (!category) return null;

  const items = (category.items || []).map((item) => {
    const itId = item.id || item._id;
    if (itId === itemId) {
      return {
        ...item,
        name: updates.name !== undefined ? updates.name.trim() : item.name,
        colors: updates.colors !== undefined ? updates.colors : item.colors,
        unit: updates.unit !== undefined ? updates.unit : item.unit,
      };
    }
    return item;
  });

  const now = new Date().toISOString();
  const updated: ProductCategoryModel & Record<string, any> = {
    ...category,
    PK: `CATEGORY#${categoryId}`,
    SK: 'METADATA',
    items,
    updatedAt: now,
  };

  return putItem<ProductCategoryModel>(updated);
};

/**
 * Soft Delete (Deactivate) Item in Category
 */
export const softDeleteItemInCategory = async (
  categoryId: string,
  itemId: string
): Promise<ProductCategoryModel | null> => {
  const category = await findCategoryById(categoryId);
  if (!category) return null;

  const items = (category.items || []).map((item) => {
    const itId = item.id || item._id;
    if (itId === itemId) {
      return { ...item, isActive: false };
    }
    return item;
  });

  const now = new Date().toISOString();
  const updated: ProductCategoryModel & Record<string, any> = {
    ...category,
    PK: `CATEGORY#${categoryId}`,
    SK: 'METADATA',
    items,
    updatedAt: now,
  };

  return putItem<ProductCategoryModel>(updated);
};

/**
 * Seed default Categories (Flowers & Vegetables) if none exist
 */
export const seedDefaultCategoriesIfEmpty = async (): Promise<void> => {
  const existing = await getAllCategories();
  if (existing.length === 0) {
    console.log('[DynamoDB] Seeding default Categories in DynamoDB...');

    const flowersCat = await createCategory('Flowers');
    const chrysanthemumId = crypto.randomUUID();
    const buttonRoseId = crypto.randomUUID();
    const lilyId = crypto.randomUUID();
    const marigoldId = crypto.randomUUID();

    flowersCat.items = [
      { id: chrysanthemumId, _id: chrysanthemumId, name: 'Chrysanthemum', colors: ['Yellow', 'White', 'Purple'], unit: 'grams', isActive: true },
      { id: buttonRoseId, _id: buttonRoseId, name: 'Button Rose', colors: ['vibrant red', 'soft pink', 'pure white', 'sunny yellow', 'cheerful orange'], unit: 'grams', isActive: true },
      { id: lilyId, _id: lilyId, name: 'Lily', colors: ['white', 'yellow', 'orange', 'pink', 'red', 'purple'], unit: 'grams', isActive: true },
      { id: marigoldId, _id: marigoldId, name: 'Marigold', colors: ['yellow', 'orange'], unit: 'grams', isActive: true },
    ];
    await putItem(flowersCat as any);

    const vegCat = await createCategory('Vegetables');
    const cabbageId = crypto.randomUUID();
    const carrotId = crypto.randomUUID();
    const potatoId = crypto.randomUUID();
    const onionId = crypto.randomUUID();
    const tomatoId = crypto.randomUUID();

    vegCat.items = [
      { id: cabbageId, _id: cabbageId, name: 'Cabbage', colors: [], unit: 'kg', isActive: true },
      { id: carrotId, _id: carrotId, name: 'Carrot', colors: [], unit: 'kg', isActive: true },
      { id: potatoId, _id: potatoId, name: 'Potato', colors: [], unit: 'kg', isActive: true },
      { id: onionId, _id: onionId, name: 'Onion', colors: [], unit: 'kg', isActive: true },
      { id: tomatoId, _id: tomatoId, name: 'Tomato', colors: [], unit: 'kg', isActive: true },
    ];
    await putItem(vegCat as any);

    console.log('[DynamoDB] Seeded default Flowers and Vegetables categories.');
  }
};
