import { Router } from 'express';
import { 
  customerLogin, 
  adminLogin, 
  requestOTP, 
  verifyOTP, 
  resetPassword, 
  refreshToken, 
  getAdminProfile, 
  updateAdminProfile,
  requestProfileUpdateOTP,
  verifyProfileUpdateOTP,
  notifyOtpIssue,
  requestAdminIdOTP,
  verifyAdminIdOTP
} from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';

const router = Router();

// Customer auth routes (public)
router.post('/login', customerLogin);
router.post('/forgot-password', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

// Admin auth routes (public)
router.post('/admin/login', adminLogin);
router.post('/admin/forgot-password', requestOTP);
router.post('/admin/verify-otp', verifyOTP);
router.post('/admin/reset-password', resetPassword);
router.post('/admin/forgot-id/request-otp', requestAdminIdOTP);
router.post('/admin/forgot-id/verify-otp', verifyAdminIdOTP);

// Admin profile routes (protected — require valid admin JWT)
router.get('/admin/profile', protect, adminOnly, getAdminProfile);
router.put('/admin/profile', protect, adminOnly, upload.single('profilePicture'), updateAdminProfile);

// Admin profile-update OTP verification (for sensitive field changes)
router.post('/admin/profile/request-update-otp', protect, adminOnly, requestProfileUpdateOTP);
router.post('/admin/profile/verify-update-otp',  protect, adminOnly, verifyProfileUpdateOTP);
router.post('/admin/profile/notify-otp-issue',   protect, adminOnly, notifyOtpIssue);

export default router;
