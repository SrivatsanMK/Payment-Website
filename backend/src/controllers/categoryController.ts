import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import {
  getActiveCategories,
  findCategoryByName,
  findCategoryById,
  createCategory as repoCreateCategory,
  updateCategoryName as repoUpdateCategoryName,
  softDeleteCategory as repoSoftDeleteCategory,
  addItemToCategory as repoAddItem,
  updateItemInCategory as repoUpdateItem,
  softDeleteItemInCategory as repoDeleteItem,
} from '../repositories/categoryRepository';

const ALLOWED_UNITS = ['grams', 'kg', 'ml', 'liter'];

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Returns all active categories with their active items (Admin only)
 */
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await getActiveCategories();

    // Filter items to only active ones in the response
    const result = categories.map((cat) => ({
      ...cat,
      items: (cat.items || []).filter((item: any) => item.isActive !== false),
    }));

    res.status(200).json({ success: true, categories: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/categories
 * Create a new category (Admin only)
 */
export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmedName = String(name).trim();

    // Duplicate check (case-insensitive)
    const existing = await findCategoryByName(trimmedName);
    if (existing && existing.isActive !== false) {
      return res.status(409).json({ success: false, message: `Category "${trimmedName}" already exists.` });
    }

    const category = await repoCreateCategory(trimmedName, req.user?.id);

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(201).json({ success: true, message: 'Category created successfully.', category });
  } catch (error: any) {
    next(error);
  }
};

/**
 * PUT /api/categories/:id
 * Rename a category (Admin only)
 */
export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const trimmedName = String(name).trim();

    // Duplicate check (case-insensitive), exclude current doc
    const existing = await findCategoryByName(trimmedName);
    if (existing && (existing.id || existing._id) !== id && existing.isActive !== false) {
      return res.status(409).json({ success: false, message: `Category "${trimmedName}" already exists.` });
    }

    const category = await repoUpdateCategoryName(id, trimmedName);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({ success: true, message: 'Category updated successfully.', category });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/categories/:id
 * Soft-delete (deactivate) a category (Admin only)
 */
export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await repoSoftDeleteCategory(id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({ success: true, message: 'Category removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── ITEMS ───────────────────────────────────────────────────────────────────

/**
 * POST /api/categories/:id/items
 * Add an item to a category (Admin only)
 */
export const createItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, colors, unit } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    }
    if (unit && !ALLOWED_UNITS.includes(unit)) {
      return res.status(400).json({ success: false, message: `Unit must be one of: ${ALLOWED_UNITS.join(', ')}.` });
    }

    const trimmedName = String(name).trim();
    const category = await findCategoryById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Duplicate item check
    const dupItem = (category.items || []).find(
      (item: any) => item.isActive !== false && item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (dupItem) {
      return res.status(409).json({ success: false, message: `Item "${trimmedName}" already exists in this category.` });
    }

    const cleanColors: string[] = Array.isArray(colors)
      ? colors.map((c: string) => String(c).trim()).filter(Boolean)
      : [];

    const updatedCategory = await repoAddItem(id, {
      name: trimmedName,
      colors: cleanColors,
      unit: unit || 'grams',
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(201).json({ success: true, message: 'Item added successfully.', category: updatedCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/categories/:catId/items/:itemId
 * Update an item within a category (Admin only)
 */
export const updateItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { catId, itemId } = req.params;
    const { name, colors, unit } = req.body;

    if (unit && !ALLOWED_UNITS.includes(unit)) {
      return res.status(400).json({ success: false, message: `Unit must be one of: ${ALLOWED_UNITS.join(', ')}.` });
    }

    const category = await findCategoryById(catId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const item = (category.items || []).find(
      (i: any) => (i.id || i._id) === itemId
    );
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const updatedCategory = await repoUpdateItem(catId, itemId, {
      name: name !== undefined ? String(name).trim() : undefined,
      unit,
      colors: Array.isArray(colors) ? colors.map((c: string) => String(c).trim()).filter(Boolean) : undefined,
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({ success: true, message: 'Item updated successfully.', category: updatedCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/categories/:catId/items/:itemId
 * Soft-delete (deactivate) an item (Admin only)
 */
export const deleteItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { catId, itemId } = req.params;

    const category = await findCategoryById(catId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const item = (category.items || []).find(
      (i: any) => (i.id || i._id) === itemId
    );
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    await repoDeleteItem(catId, itemId);

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({ success: true, message: 'Item removed successfully.' });
  } catch (error) {
    next(error);
  }
};
