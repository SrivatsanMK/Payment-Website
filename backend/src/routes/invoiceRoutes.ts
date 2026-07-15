import { Router } from 'express';
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoice, 
  deleteInvoice,
  getCustomerOrders,
  markAsPaid
} from '../controllers/invoiceController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = Router();

// Admin-only creation and modifications
router.post('/', protect, adminOnly, upload.single('qrCodeImage'), createInvoice);
router.put('/:id', protect, adminOnly, upload.single('qrCodeImage'), updateInvoice);
router.put('/:id/mark-paid', protect, adminOnly, markAsPaid);
router.delete('/:id', protect, adminOnly, deleteInvoice);

// Shared retrieval
router.get('/orders/history', protect, getCustomerOrders);
router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoiceById);

export default router;

