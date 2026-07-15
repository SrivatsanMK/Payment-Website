import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import Customer from '../models/Customer';
import OTP from '../models/OTP';
import ActivityLog from '../models/ActivityLog';
import { sendOTPEmail } from '../utils/email';

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

    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    user.lastLogin = new Date();
    user.recentLogins.push({ timestamp: new Date(), ipAddress, device: userAgent });
    if (user.recentLogins.length > 10) user.recentLogins.shift();
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      userRole: 'Customer',
      action: 'Login',
      details: `Customer login from IP: ${ipAddress}`,
      ipAddress,
      userAgent
    });

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

    // Only search the Admin collection
    const user: any = await Admin.findOne({
      $or: [
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

    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    user.lastLogin = new Date();
    user.recentLogins.push({ timestamp: new Date(), ipAddress, device: userAgent });
    if (user.recentLogins.length > 10) user.recentLogins.shift();
    await user.save();

    await ActivityLog.create({
      userId: user._id,
      userRole: actualRole,
      action: 'Login',
      details: `Admin login from IP: ${ipAddress}`,
      ipAddress,
      userAgent
    });

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

    // Success - keep record but mark or delete later on password reset. Let's delete after successful verify or keep reference. We can keep it or write verification status. Let's send a single-use token or just allow reset.
    // In our case we can delete the OTP record and send a success response to frontend, which will then send the reset request.
    // To make it secure, we can create a temporary JWT or just proceed with password update. Let's proceed with password update. We can delete it.
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

    // Log Activity
    await ActivityLog.create({
      userId: user._id,
      userRole: role,
      action: 'Password Reset',
      details: 'Password was successfully reset using OTP verification code',
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });

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
