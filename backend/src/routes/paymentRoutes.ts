import { Router } from 'express';
import { 
  getUPIPaymentDetails, 
  recordPayment, 
  getPaymentsHistory,
  notifyPaymentAttempt,
  approvePayment
} from '../controllers/paymentController';

import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/history', protect, getPaymentsHistory);
router.post('/record', protect, recordPayment);
router.get('/upi-details/:id', protect, getUPIPaymentDetails);
router.post('/notify-attempt', protect, notifyPaymentAttempt);
router.put('/:id/approve', protect, adminOnly, approvePayment);



export default router;
