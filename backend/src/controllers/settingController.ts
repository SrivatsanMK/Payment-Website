import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Setting from '../models/Setting';

/**
 * Get Company Settings (Admin and Customer)
 */
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        companyName: 'Green Glide Logistics',
        upiId: 'greenglide@okaxis',
        supportPhone: '+91 98765 43210',
        gmailAddress: 'greenglidelogistics@gmail.com',
        email: 'greenglidelogistics@gmail.com'
      });
    }

    res.status(200).json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Company Settings (Admin Only)
 */
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { companyName, supportPhone, gmailAddress, email } = req.body;

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (companyName) settings.companyName = companyName.trim();
    if (supportPhone !== undefined) settings.supportPhone = supportPhone.trim();

    const targetEmail = (gmailAddress || email || '').trim();
    if (targetEmail) {
      (settings as any).gmailAddress = targetEmail;
      (settings as any).email = targetEmail;
    }

    if (req.file) {
      settings.companyLogo = `/uploads/${req.file.filename}`;
    }

    await settings.save();

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    next(error);
  }
};
