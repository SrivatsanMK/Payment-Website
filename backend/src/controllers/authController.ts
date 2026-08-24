import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  findAdminById,
  findAdminByIdentifier,
  findAdminByEmail,
  findAllAdmins,
  updateAdmin,
  comparePassword,
} from '../repositories/adminRepository';
import {
  findCustomerById,
  findCustomerByIdentifier,
  findCustomerByEmail,
  updateCustomer,
  compareCustomerPassword,
} from '../repositories/customerRepository';
import {
  saveOtp,
  findOtp,
  deleteOtp,
  incrementOtpAttempts,
} from '../repositories/otpRepository';
import { sendOTPEmail, sendEmail, sendNewAdminIdEmail, sendCustomerIdEmail } from '../utils/email';

const generateTokens = (id: string, role: string) => {
  const accessToken = jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456',
    { expiresIn: '1d' }
  );
  const refreshToken = jwt.sign(
    { id, role },
    process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkeyforauth987654',
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
};

/**
 * Customer Login — only allows Customer accounts
 */
export const customerLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your Customer ID/Email and password' });
    }

    const user = await findCustomerByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Customer ID and password.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Please contact the Administrator.' });
    }

    const isMatch = await compareCustomerPassword(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Customer ID and password.' });
    }

    const userId = user.id || user._id || '';
    const { accessToken, refreshToken } = generateTokens(userId, 'Customer');

    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: userId,
        _id: userId,
        role: 'Customer',
        email: user.email,
        name: user.name,
        customerId: user.customerId,
        forcedPasswordReset: user.forcedPasswordReset,
        profilePicture: user.profilePicture || ''
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Admin Login — only allows ADMIN_1 and ADMIN_2 accounts
 */
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your Admin ID/Email and password' });
    }

    const user = await findAdminByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Admin ID and password.' });
    }

    const isMatch = await comparePassword(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Admin ID and password.' });
    }

    const actualRole = user.role; // ADMIN_1 or ADMIN_2
    const userId = user.id || user._id || '';
    const { accessToken, refreshToken } = generateTokens(userId, actualRole);

    req.app.get('io')?.emit('DATA_UPDATED');
    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      accessToken,
      refreshToken,
      user: {
        id: userId,
        _id: userId,
        role: actualRole,
        email: user.email,
        name: user.username,
        adminId: user.adminId || '',
        displayName: user.displayName || user.username,
        profilePicture: user.profilePicture || ''
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Legacy unified login (kept for backward compatibility)
 */
export const login = customerLogin;

/**
 * Request OTP for Forgot Password
 */
export const requestOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user: any = null;
    if (role === 'Admin') {
      user = await findAdminByEmail(cleanEmail);
    } else {
      user = await findCustomerByEmail(cleanEmail);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await saveOtp({
      email: cleanEmail,
      otp: otpCode,
      purpose: 'forgot_password',
      expiresAt
    });

    // Send Email
    const name = role === 'Admin' ? user.username : user.name;
    await sendOTPEmail(user.email, name, otpCode);

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your registered email'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await findOtp(cleanEmail, 'forgot_password');

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired' });
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (currentEpoch > otpRecord.expiresAt) {
      await deleteOtp(cleanEmail, 'forgot_password');
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    if (otpRecord.attempts >= 3) {
      await deleteOtp(cleanEmail, 'forgot_password');
      return res.status(422).json({ success: false, message: 'Max OTP verification attempts exceeded. Please request a new one.' });
    }

    if (otpRecord.otp !== otp.trim()) {
      await incrementOtpAttempts(cleanEmail, 'forgot_password');
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await deleteOtp(cleanEmail, 'forgot_password');

    // Generate a temporary action token to secure reset request
    const resetToken = jwt.sign(
      { email: cleanEmail },
      process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456',
      { expiresIn: '15m' }
    );

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password using Reset Token
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resetToken, password, role } = req.body;

    if (!resetToken || !password || !role) {
      return res.status(400).json({ success: false, message: 'Reset token, new password, and role are required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456');
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const email = decoded.email.toLowerCase().trim();

    if (role === 'Admin') {
      const admin = await findAdminByEmail(email);
      if (!admin) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      await updateAdmin(admin.id, { password });
    } else {
      const customer = await findCustomerByEmail(email);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      await updateCustomer(customer.id, { password, forcedPasswordReset: false });
    }

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Password has been successfully updated'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkeyforauth987654');

    let userExists = false;
    if (decoded.role === 'ADMIN_1' || decoded.role === 'ADMIN_2') {
      userExists = (await findAdminById(decoded.id)) !== null;
    } else if (decoded.role === 'Customer') {
      userExists = (await findCustomerById(decoded.id)) !== null;
    }

    if (!userExists) {
      return res.status(401).json({ success: false, message: 'User session no longer exists' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, decoded.role);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

/**
 * Get Admin Profile
 */
export const getAdminProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const admin = await findAdminById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }
    const adminId = admin.id || admin._id || '';
    res.status(200).json({
      success: true,
      admin: {
        _id: adminId,
        id: adminId,
        adminId: admin.adminId || '',
        username: admin.username,
        displayName: admin.displayName || admin.username,
        email: admin.email,
        phone: admin.phone || '',
        role: admin.role,
        profilePicture: admin.profilePicture || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Admin Profile
 */
export const updateAdminProfile = async (req: any, res: Response, next: NextFunction) => {
  try {
    const admin = await findAdminById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const { username, displayName, email, phone } = req.body;
    const updates: any = {};
    if (username) updates.username = username.trim();
    if (displayName !== undefined) updates.displayName = displayName.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (phone) updates.phone = phone.trim();

    if (req.file) {
      updates.profilePicture = `/uploads/${req.file.filename}`;
    }

    const updated = await updateAdmin(req.user.id, updates);
    req.app.get('io')?.emit('DATA_UPDATED');

    const adminId = updated?.id || updated?._id || req.user.id;
    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      admin: {
        id: adminId,
        _id: adminId,
        role: updated?.role,
        email: updated?.email,
        username: updated?.username,
        displayName: updated?.displayName || updated?.username,
        adminId: updated?.adminId || '',
        name: updated?.displayName || updated?.username,
        phone: updated?.phone,
        profilePicture: updated?.profilePicture || ''
      }
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Request OTP to verify identity before updating sensitive profile fields (email/phone)
 */
export const requestProfileUpdateOTP = async (req: any, res: Response, next: NextFunction) => {
  try {
    const admin = await findAdminById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await saveOtp({ email: admin.email, otp: otpCode, purpose: 'profile_update', expiresAt });
    await sendOTPEmail(admin.email, admin.username, otpCode);

    res.status(200).json({
      success: true,
      message: `Verification OTP sent to ${admin.email}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify profile-update OTP and return a short-lived profile token
 */
export const verifyProfileUpdateOTP = async (req: any, res: Response, next: NextFunction) => {
  try {
    const admin = await findAdminById(req.user.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const record = await findOtp(admin.email, 'profile_update');
    if (!record) return res.status(400).json({ success: false, message: 'OTP not found or already expired' });

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (currentEpoch > record.expiresAt) {
      await deleteOtp(admin.email, 'profile_update');
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.attempts >= 3) {
      await deleteOtp(admin.email, 'profile_update');
      return res.status(422).json({ success: false, message: 'Max OTP attempts exceeded. Please request a new code.' });
    }
    if (record.otp !== otp.trim()) {
      await incrementOtpAttempts(admin.email, 'profile_update');
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await deleteOtp(admin.email, 'profile_update');

    const profileToken = jwt.sign(
      { id: req.user.id, purpose: 'profile_update' },
      process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456',
      { expiresIn: '10m' }
    );

    res.status(200).json({ success: true, message: 'OTP verified', profileToken });
  } catch (error) {
    next(error);
  }
};

/**
 * Notify admins via email when OTP cannot be received (tech issue)
 */
export const notifyOtpIssue = async (req: any, res: Response, next: NextFunction) => {
  try {
    const admin = await findAdminById(req.user.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const allAdmins = await findAllAdmins();
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    for (const a of allAdmins) {
      const html = `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;">
          <div style="border-bottom:2px solid #f59e0b;padding-bottom:12px;margin-bottom:20px;">
            <h2 style="color:#d97706;margin:0;">⚠️ OTP Delivery Issue — Action Required</h2>
          </div>
          <p>Hello <strong>${a.username}</strong>,</p>
          <p>An admin account was unable to receive their verification OTP while trying to update their profile details. This may indicate a mail delivery issue.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr style="background:#f9fafb;"><th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">Admin Name</th><td style="padding:10px;border:1px solid #e5e7eb;">${admin.username}</td></tr>
            <tr><th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">Admin ID</th><td style="padding:10px;border:1px solid #e5e7eb;">${admin.adminId || 'N/A'}</td></tr>
            <tr style="background:#f9fafb;"><th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">Role</th><td style="padding:10px;border:1px solid #e5e7eb;">${admin.role === 'ADMIN_1' ? 'Owner Admin' : 'Partner Admin'}</td></tr>
            <tr><th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">Email on file</th><td style="padding:10px;border:1px solid #e5e7eb;">${admin.email}</td></tr>
            <tr style="background:#f9fafb;"><th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">Timestamp (IST)</th><td style="padding:10px;border:1px solid #e5e7eb;">${timestamp}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:13px;">Please verify the email configuration and assist the admin if needed. No changes were made to the account at this time.</p>
        </div>
      `;
      await sendEmail({ to: a.email, subject: `⚠️ OTP Issue Alert — Admin Portal (${timestamp})`, html });
    }

    res.status(200).json({ success: true, message: 'Notification email sent to all admins' });
  } catch (error) {
    next(error);
  }
};

const generateUniqueAdminId = async (currentAdminId?: string): Promise<string> => {
  let newId: string;
  let exists: any;
  do {
    const num = Math.floor(10001 + Math.random() * 89999);
    newId = `ADM-${num}`;
    if (currentAdminId && newId === currentAdminId) {
      continue;
    }
    exists = await findAdminByIdentifier(newId);
  } while (exists);
  return newId;
};

/**
 * Request OTP for Forgot Admin ID
 */
export const requestAdminIdOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Registered email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const admin = await findAdminByEmail(cleanEmail);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No admin account found with this registered email'
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await saveOtp({ email: cleanEmail, otp: otpCode, purpose: 'forgot_admin_id', expiresAt });
    await sendOTPEmail(admin.email, admin.username, otpCode);

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your registered email'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP for Forgot Admin ID and Generate NEW Admin ID
 */
export const verifyAdminIdOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await findOtp(cleanEmail, 'forgot_admin_id');

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP code not found or already expired' });
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (currentEpoch > otpRecord.expiresAt) {
      await deleteOtp(cleanEmail, 'forgot_admin_id');
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    if (otpRecord.attempts >= 3) {
      await deleteOtp(cleanEmail, 'forgot_admin_id');
      return res.status(422).json({ success: false, message: 'Maximum OTP attempts exceeded. Please request a new code.' });
    }

    if (otpRecord.otp !== otp.trim()) {
      await incrementOtpAttempts(cleanEmail, 'forgot_admin_id');
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await deleteOtp(cleanEmail, 'forgot_admin_id');

    const admin = await findAdminByEmail(cleanEmail);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const oldAdminId = admin.adminId || '';
    const newAdminId = await generateUniqueAdminId(oldAdminId);

    await updateAdmin(admin.id, { adminId: newAdminId });
    await sendNewAdminIdEmail(admin.email, admin.username, oldAdminId, newAdminId);

    req.app.get('io')?.emit('DATA_UPDATED');

    return res.status(200).json({
      success: true,
      message: 'Admin ID regenerated successfully',
      oldAdminId,
      newAdminId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request OTP for Forgot Customer ID
 */
export const requestCustomerIdOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Registered email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const customer = await findCustomerByEmail(cleanEmail);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'No customer account found with this registered email'
      });
    }

    if (customer.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account is suspended. Please contact the Administrator.'
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await saveOtp({ email: cleanEmail, otp: otpCode, purpose: 'forgot_customer_id', expiresAt });
    await sendOTPEmail(customer.email, customer.name, otpCode);

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your registered email'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP for Forgot Customer ID and REVEAL the existing Customer ID
 */
export const verifyCustomerIdOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const otpRecord = await findOtp(cleanEmail, 'forgot_customer_id');

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP code not found or already expired' });
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (currentEpoch > otpRecord.expiresAt) {
      await deleteOtp(cleanEmail, 'forgot_customer_id');
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    if (otpRecord.attempts >= 3) {
      await deleteOtp(cleanEmail, 'forgot_customer_id');
      return res.status(422).json({ success: false, message: 'Maximum OTP attempts exceeded. Please request a new code.' });
    }

    if (otpRecord.otp !== otp.trim()) {
      await incrementOtpAttempts(cleanEmail, 'forgot_customer_id');
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await deleteOtp(cleanEmail, 'forgot_customer_id');

    const customer = await findCustomerByEmail(cleanEmail);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    const customerId = customer.customerId || '';
    await sendCustomerIdEmail(customer.email, customer.name, customerId);

    req.app.get('io')?.emit('DATA_UPDATED');

    return res.status(200).json({
      success: true,
      message: 'Customer ID retrieved successfully',
      customerId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request OTP for Customer Profile Update (Email / Phone)
 */
export const requestCustomerProfileUpdateOTP = async (req: any, res: Response, next: NextFunction) => {
  try {
    const customer = await findCustomerById(req.user.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await saveOtp({ email: customer.email, otp: otpCode, purpose: 'customer_profile_update', expiresAt });
    await sendOTPEmail(customer.email, customer.name, otpCode);

    res.status(200).json({
      success: true,
      message: `Verification OTP sent to ${customer.email}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Customer Profile Update OTP
 */
export const verifyCustomerProfileUpdateOTP = async (req: any, res: Response, next: NextFunction) => {
  try {
    const customer = await findCustomerById(req.user.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer account not found' });
    }

    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP code is required' });
    }

    const record = await findOtp(customer.email, 'customer_profile_update');
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP not found or already expired' });
    }

    const currentEpoch = Math.floor(Date.now() / 1000);
    if (currentEpoch > record.expiresAt) {
      await deleteOtp(customer.email, 'customer_profile_update');
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (record.attempts >= 3) {
      await deleteOtp(customer.email, 'customer_profile_update');
      return res.status(422).json({ success: false, message: 'Max OTP attempts exceeded. Please request a new code.' });
    }

    if (record.otp !== otp.trim()) {
      await incrementOtpAttempts(customer.email, 'customer_profile_update');
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await deleteOtp(customer.email, 'customer_profile_update');

    const customerId = customer.id || customer._id || '';
    const profileToken = jwt.sign(
      { id: customerId, purpose: 'customer_profile_update' },
      process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456',
      { expiresIn: '10m' }
    );

    res.status(200).json({
      success: true,
      message: 'Identity verified successfully',
      profileToken
    });
  } catch (error) {
    next(error);
  }
};
