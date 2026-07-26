import { Router } from 'express';
import { 
  getCustomerNotifications, 
  markNotificationsAsRead, 
  markSingleNotificationAsRead 
} from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getCustomerNotifications);
router.put('/read', protect, markNotificationsAsRead);
router.put('/:id/read', protect, markSingleNotificationAsRead);

export default router;
