import { Router } from 'express';
import { customerLogin, adminLogin, requestOTP, verifyOTP, resetPassword, refreshToken, login } from '../controllers/authController';

const router = Router();

// Customer auth routes (public — /login)
router.post('/login', customerLogin);
router.post('/forgot-password', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

// Admin auth routes (public — /admin/login)
router.post('/admin/login', adminLogin);
router.post('/admin/forgot-password', requestOTP);
router.post('/admin/verify-otp', verifyOTP);
router.post('/admin/reset-password', resetPassword);

export default router;

