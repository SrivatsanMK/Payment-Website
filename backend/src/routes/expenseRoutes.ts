import { Router } from 'express';
import { 
  createExpense, 
  getExpenses, 
  getExpenseById, 
  updateExpense, 
  deleteExpense,
  getDashboardSummary,
  getDetailedReport
} from '../controllers/expenseController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

// Dashboard summary and reports (must come before /:id)
router.get('/summary/dashboard', protect, adminOnly, getDashboardSummary);
router.get('/reports/detailed', protect, adminOnly, getDetailedReport);

// Core CRUD operations
router.route('/')
  .post(protect, adminOnly, createExpense)
  .get(protect, adminOnly, getExpenses);

router.route('/:id')
  .get(protect, adminOnly, getExpenseById)
  .put(protect, adminOnly, updateExpense)
  .delete(protect, adminOnly, deleteExpense);

export default router;
