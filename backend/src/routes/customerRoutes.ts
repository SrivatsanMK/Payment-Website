import { Router } from 'express';
import { 
  createCustomer, 
  updateCustomer, 
  getCustomers, 
  getCustomerById, 
  updateCustomerStatus, 
  resetCustomerPassword, 
  deleteCustomer 
} from '../controllers/customerController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = Router();

// Admin-only operations
router.post('/', protect, adminOnly, createCustomer);
router.get('/', protect, adminOnly, getCustomers);
router.delete('/:id', protect, adminOnly, deleteCustomer);
router.put('/:id/status', protect, adminOnly, updateCustomerStatus);
router.put('/:id/reset-password', protect, adminOnly, resetCustomerPassword);

// Shared operations (Admin or Owner Customer)
router.get('/:id', protect, getCustomerById);
router.put('/:id', protect, upload.single('profilePicture'), updateCustomer);

export default router;
