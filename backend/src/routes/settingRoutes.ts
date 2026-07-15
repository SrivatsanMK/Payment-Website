import { Router } from 'express';
import { getSettings, updateSettings, triggerBackup } from '../controllers/settingController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getSettings);
router.put('/', protect, adminOnly, updateSettings);
router.post('/backup', protect, adminOnly, triggerBackup);

export default router;
