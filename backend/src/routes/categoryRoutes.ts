import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createItem,
  updateItem,
  deleteItem,
} from '../controllers/categoryController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// ─── Category CRUD ───────────────────────────────────────────────────────────
router.get('/', protect, adminOnly, getCategories);
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

// ─── Item CRUD (within a category) ───────────────────────────────────────────
router.post('/:id/items', protect, adminOnly, createItem);
router.put('/:catId/items/:itemId', protect, adminOnly, updateItem);
router.delete('/:catId/items/:itemId', protect, adminOnly, deleteItem);

export default router;
