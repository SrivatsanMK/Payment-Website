import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import Customer from '../models/Customer';
import OTP from '../models/OTP';
import { sendOTPEmail, sendEmail, sendNewAdminIdEmail } from '../utils/email';

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

    // Only search the Customer collection
    const user: any = await Customer.findOne({
      $or: [
        { customerId: identifier.toUpperCase().trim() },
        { email: identifier.toLowerCase().trim() },
        { phone: identifier.trim() }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Customer ID and password.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Please contact the Administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Customer ID and password.' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), 'Customer');

    req.app.get('io').emit('DATA_UPDATED');
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
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

    // Only search the Admin collection (supports adminId, email, username, phone)
    const user: any = await Admin.findOne({
      $or: [
        { adminId: identifier.trim() },
        { email: identifier.toLowerCase().trim() },
        { username: identifier.trim() },
        { phone: identifier.trim() }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Admin ID and password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your Admin ID and password.' });
    }

    const actualRole = user.role; // ADMIN_1 or ADMIN_2
    const { accessToken, refreshToken } = generateTokens(user._id.toString(), actualRole);

    req.app.get('io').emit('DATA_UPDATED');
    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
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

    let user: any = null;
    if (role === 'Admin') {
      user = await Admin.findOne({ email: email.toLowerCase().trim() });
    } else {
      user = await Customer.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing OTP for this email and purpose
    await OTP.deleteMany({ email: email.toLowerCase().trim(), purpose: 'forgot_password' });

    // Store new OTP
    await OTP.create({
      email: email.toLowerCase().trim(),
      otp: otpCode,
      purpose: 'forgot_password',
      expiresAt
    });

    // Send Email
    const name = role === 'Admin' ? user.username : user.name;
    await sendOTPEmail(user.email, name, otpCode);

    req.app.get('io').emit('DATA_UPDATED');
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

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase().trim(),
      purpose: 'forgot_password'
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired' });
    }

    // Check expiration (although TTL index handles it, double check)
    if (new Date() > otpRecord.expiresAt) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Max attempts check (e.g. 3 attempts)
    if (otpRecord.attempts >= 3) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(422).json({ success: false, message: 'Max OTP verification attempts exceeded. Please request a new one.' });
    }

    if (otpRecord.otp !== otp.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await OTP.findByIdAndDelete(otpRecord._id);

    // Generate a temporary action token to secure reset request
    const resetToken = jwt.sign(
      { email: email.toLowerCase().trim() },
      process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456',
      { expiresIn: '15m' }
    );

    req.app.get('io').emit('DATA_UPDATED');
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

    const email = decoded.email;

    let user: any = null;
    if (role === 'Admin') {
      user = await Admin.findOne({ email });
    } else {
      user = await Customer.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update password
    user.password = password;
    if (role === 'Customer') {
      user.forcedPasswordReset = false; // cleared on reset
    }
    await user.save();

    req.app.get('io').emit('DATA_UPDATED');
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

    // Verify user exists in the database
    let userExists = false;
    if (decoded.role === 'ADMIN_1' || decoded.role === 'ADMIN_2') {
      userExists = await Admin.exists({ _id: decoded.id }) !== null;
    } else if (decoded.role === 'Customer') {
      userExists = await Customer.exists({ _id: decoded.id }) !== null;
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
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }
    res.status(200).json({
      success: true,
      admin: {
        _id: admin._id,
        adminId: (admin as any).adminId || '',
        username: admin.username,
        displayName: (admin as any).displayName || admin.username,
        email: admin.email,
        phone: admin.phone,
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
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const { username, displayName, email, phone } = req.body;
    if (username) admin.username = username.trim();
    if (displayName !== undefined) (admin as any).displayName = displayName.trim();
    if (email) admin.email = email.toLowerCase().trim();
    if (phone) admin.phone = phone.trim();

    if (req.file) {
      admin.profilePicture = `/uploads/${req.file.filename}`;
    }

    await admin.save();
    req.app.get('io').emit('DATA_UPDATED');

    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      admin: {
        id: admin._id,
        role: admin.role,
        email: admin.email,
        username: admin.username,
        displayName: (admin as any).displayName || admin.username,
        adminId: (admin as any).adminId || '',
        name: (admin as any).displayName || admin.username,
        phone: admin.phone,
        profilePicture: admin.profilePicture || ''
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
    const admin = await Admin.findById(req.user.id).select('email username');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: admin.email, purpose: 'profile_update' });
    await OTP.create({ email: admin.email, otp: otpCode, purpose: 'profile_update', expiresAt });

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
    const admin = await Admin.findById(req.user.id).select('email');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required' });

    const record = await OTP.findOne({ email: admin.email, purpose: 'profile_update' });
    if (!record) return res.status(400).json({ success: false, message: 'OTP not found or already expired' });
    if (new Date() > record.expiresAt) {
      await OTP.findByIdAndDelete(record._id);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.attempts >= 3) {
      await OTP.findByIdAndDelete(record._id);
      return res.status(422).json({ success: false, message: 'Max OTP attempts exceeded. Please request a new code.' });
    }
    if (record.otp !== otp.trim()) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    await OTP.findByIdAndDelete(record._id);

    // Issue a short-lived profile-update token (10 min)
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
    const admin = await Admin.findById(req.user.id).select('username email adminId role');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    // Send notification to all admins
    const allAdmins = await Admin.find({}).select('email username');
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
            <tr><th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">Admin ID</th><td style="padding:10px;border:1px solid #e5e7eb;">${(admin as any).adminId || 'N/A'}</td></tr>
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

/**
 * Generate a unique ADM-XXXXX ID checking DB collisions and ensuring difference from current ID
 */
const generateUniqueAdminId = async (currentAdminId?: string): Promise<string> => {
  let newId: string;
  let exists: any;
  do {
    const num = Math.floor(10001 + Math.random() * 89999);
    newId = `ADM-${num}`;
    if (currentAdminId && newId === currentAdminId) {
      continue;
    }
    exists = await Admin.findOne({ adminId: newId });
  } while (exists);
  return newId;
};

/**
 * Request OTP for Forgot Admin ID (Public Admin Endpoint)
 */
export const requestAdminIdOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Registered email address is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Search ONLY the Admin collection
    const admins = await Admin.find({ email: cleanEmail });

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No admin account found with this registered email'
      });
    }

    if (admins.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Multiple admin accounts are registered with this email. Please contact support to resolve account email configurations.'
      });
    }

    const admin = admins[0];

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate previous OTPs for this email and purpose
    await OTP.deleteMany({ email: cleanEmail, purpose: 'forgot_admin_id' });

    // Create new OTP
    await OTP.create({
      email: cleanEmail,
      otp: otpCode,
      purpose: 'forgot_admin_id',
      expiresAt
    });

    // Send Email using existing infrastructure
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

    const otpRecord = await OTP.findOne({
      email: cleanEmail,
      purpose: 'forgot_admin_id'
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP code not found or already expired' });
    }

    // Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    // Check max attempts (3)
    if (otpRecord.attempts >= 3) {
      await OTP.findByIdAndDelete(otpRecord._id);
      return res.status(422).json({ success: false, message: 'Maximum OTP attempts exceeded. Please request a new code.' });
    }

    // Code match check
    if (otpRecord.otp !== otp.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please try again.' });
    }

    // Invalidate/Delete OTP immediately after successful verification (single-use)
    await OTP.findByIdAndDelete(otpRecord._id);

    // Find the single matching admin
    const admins = await Admin.find({ email: cleanEmail });
    if (admins.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }
    if (admins.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Multiple admin accounts are registered with this email address.'
      });
    }

    const admin = admins[0];
    const oldAdminId = admin.adminId || '';

    // Generate NEW collision-safe Admin ID
    const newAdminId = await generateUniqueAdminId(oldAdminId);

    // Update ONLY adminId field using updateOne to preserve password hash
    await Admin.updateOne({ _id: admin._id }, { $set: { adminId: newAdminId } });

    // Send confirmation email with new Admin ID
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
