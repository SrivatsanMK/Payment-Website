import { Router } from 'express';
import { getCustomerNotifications, markNotificationsAsRead } from '../controllers/notificationController';
import { protect, customerOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getCustomerNotifications);
router.put('/read', protect, customerOnly, markNotificationsAsRead);

export default router;
