import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { getGlobalSettings, updateGlobalSettings } from '../repositories/settingRepository';

/**
 * Get Company Settings (Admin and Customer)
 */
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await getGlobalSettings();
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
    const updates: any = {};

    if (companyName) updates.companyName = companyName.trim();
    if (supportPhone !== undefined) updates.supportPhone = supportPhone.trim();

    const targetEmail = (gmailAddress || email || '').trim();
    if (targetEmail) {
      updates.gmailAddress = targetEmail;
      updates.email = targetEmail;
    }

    if (req.file) {
      updates.companyLogo = `/uploads/${req.file.filename}`;
    }

    const settings = await updateGlobalSettings(updates);

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    next(error);
  }
};
