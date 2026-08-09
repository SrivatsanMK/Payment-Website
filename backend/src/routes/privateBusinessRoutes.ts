import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware';
import {
  getVegetables,
  createVegetable,
  updateVegetable,
  deleteVegetable,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getDashboardAnalytics,
  getReports,
  getSettings,
  updateSettings
} from '../controllers/privateBusinessController';

const router = Router();

// Protect ALL routes with admin authorization middleware
router.use(protect);
router.use(adminOnly);

// Dashboard & Reports
router.get('/dashboard', getDashboardAnalytics);
router.get('/reports', getReports);

// Vegetables
router.get('/vegetables', getVegetables);
router.post('/vegetables', createVegetable);
router.put('/vegetables/:id', updateVegetable);
router.delete('/vegetables/:id', deleteVegetable);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Purchases
router.get('/purchases', getPurchases);
router.get('/purchases/:id', getPurchaseById);
router.post('/purchases', createPurchase);
router.put('/purchases/:id', updatePurchase);
router.delete('/purchases/:id', deletePurchase);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

export default router;
