import { Router } from 'express';
import { 
  getUPIPaymentDetails, 
  recordPayment, 
  getPaymentsHistory,
  notifyPaymentAttempt
} from '../controllers/paymentController';

import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/history', protect, getPaymentsHistory);
router.post('/record', protect, recordPayment);
router.get('/upi-details/:id', protect, getUPIPaymentDetails);
router.post('/notify-attempt', protect, notifyPaymentAttempt);



export default router;
