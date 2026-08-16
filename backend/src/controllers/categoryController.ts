import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import ProductCategory from '../models/ProductCategory';

const ALLOWED_UNITS = ['grams', 'kg', 'ml', 'liter'];

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Returns all active categories with their active items (Admin only)
 */
export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await ProductCategory.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

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
    const existing = await ProductCategory.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Category "${trimmedName}" already exists.` });
    }

    const category = await ProductCategory.create({
      name: trimmedName,
      items: [],
      createdBy: req.user?.id,
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(201).json({ success: true, message: 'Category created successfully.', category });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Category already exists.' });
    }
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
    const existing = await ProductCategory.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      _id: { $ne: id },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `Category "${trimmedName}" already exists.` });
    }

    const category = await ProductCategory.findByIdAndUpdate(
      id,
      { name: trimmedName },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    req.app.get('io').emit('DATA_UPDATED');
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

    const category = await ProductCategory.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    req.app.get('io').emit('DATA_UPDATED');
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

    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Duplicate item check (case-insensitive, within same category)
    const dupItem = category.items.find(
      (item: any) => item.isActive !== false && item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (dupItem) {
      return res.status(409).json({ success: false, message: `Item "${trimmedName}" already exists in this category.` });
    }

    const cleanColors: string[] = Array.isArray(colors)
      ? colors.map((c: string) => String(c).trim()).filter(Boolean)
      : [];

    category.items.push({
      name: trimmedName,
      colors: cleanColors,
      unit: unit || 'grams',
      isActive: true,
    } as any);

    await category.save();

    req.app.get('io').emit('DATA_UPDATED');
    res.status(201).json({ success: true, message: 'Item added successfully.', category });
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

    const category = await ProductCategory.findById(catId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const item = category.items.find(
      (i: any) => i._id?.toString() === itemId
    ) as any;
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (name) item.name = String(name).trim();
    if (unit) item.unit = unit;
    if (Array.isArray(colors)) {
      item.colors = colors.map((c: string) => String(c).trim()).filter(Boolean);
    }

    await category.save();

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({ success: true, message: 'Item updated successfully.', category });
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

    const category = await ProductCategory.findById(catId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const item = category.items.find(
      (i: any) => i._id?.toString() === itemId
    ) as any;
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    item.isActive = false;
    await category.save();

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({ success: true, message: 'Item removed successfully.' });
  } catch (error) {
    next(error);
  }
};
