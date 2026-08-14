import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Setting from '../models/Setting';
import { runBackup } from '../utils/backup';

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
        backupFrequency: 'weekly',
        backupEmail: 'greenglidelogistics@gmail.com',
        supportPhone: '9876543210'
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
    const { companyName, upiId, backupFrequency, backupEmail, supportPhone } = req.body;

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (companyName) settings.companyName = companyName.trim();
    if (upiId) settings.upiId = upiId.trim();
    if (backupFrequency) settings.backupFrequency = backupFrequency;
    if (backupEmail) settings.backupEmail = backupEmail.trim();
    if (supportPhone) settings.supportPhone = supportPhone.trim();

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

/**
 * Force manual backup execution (Admin Only)
 */
export const triggerBackup = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await runBackup();
    if (result.success) {
      req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
        message: 'Database backup completed successfully',
        filePath: result.filePath
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Database backup failed',
        error: result.error
      });
    }
  } catch (error) {
    next(error);
  }
};
