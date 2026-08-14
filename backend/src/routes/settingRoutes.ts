import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getSettings);
router.put('/', protect, adminOnly, updateSettings);

export default router;
