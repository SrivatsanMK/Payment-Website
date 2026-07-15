import { Router } from 'express';
import { 
  getAdminDashboardStats, 
  exportInvoicesCSV, 
  exportCustomersCSV, 
  exportPaymentsCSV 
} from '../controllers/reportController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', protect, adminOnly, getAdminDashboardStats);
router.get('/invoices/csv', protect, adminOnly, exportInvoicesCSV);
router.get('/customers/csv', protect, adminOnly, exportCustomersCSV);
router.get('/payments/csv', protect, adminOnly, exportPaymentsCSV);

export default router;
