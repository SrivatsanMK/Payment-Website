import { getItem, putItem } from './dynamoHelper';
import { SettingModel, PrivateBusinessSettingModel } from '../types/models';

/**
 * Get Green Glide Logistics global settings
 */
export const getGlobalSettings = async (): Promise<SettingModel> => {
  let settings = await getItem<SettingModel>('SETTING#GLOBAL', 'CONFIG');
  if (!settings) {
    const now = new Date().toISOString();
    settings = {
      companyName: 'Green Glide Logistics',
      companyLogo: '',
      upiId: 'greenglide@okaxis',
      supportPhone: '+91 98765 43210',
      gmailAddress: 'greenglidelogistics@gmail.com',
      email: 'greenglidelogistics@gmail.com',
      createdAt: now,
      updatedAt: now,
    };
    await putItem({
      PK: 'SETTING#GLOBAL',
      SK: 'CONFIG',
      ...settings,
    });
  }
  return settings;
};

/**
 * Update Green Glide Logistics global settings
 */
export const updateGlobalSettings = async (updates: Partial<SettingModel>): Promise<SettingModel> => {
  const current = await getGlobalSettings();
  const now = new Date().toISOString();

  const updated: SettingModel = {
    ...current,
    ...updates,
    updatedAt: now,
  };

  await putItem({
    PK: 'SETTING#GLOBAL',
    SK: 'CONFIG',
    ...updated,
  });

  return updated;
};

/**
 * Get Private Business Settings (Prime Harvest Organics) for an admin
 */
export const getPrivateBusinessSettings = async (adminId: string = 'default'): Promise<PrivateBusinessSettingModel> => {
  let settings = await getItem<PrivateBusinessSettingModel>(`PRIVATE_SETTING#${adminId}`, 'CONFIG');
  if (!settings) {
    const now = new Date().toISOString();
    settings = {
      businessName: 'Prime Harvest Organics',
      ownerName: 'Owner',
      currency: 'INR',
      defaultUnit: 'KG',
      defaultPaymentMethod: 'Cash',
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    };
    await putItem({
      PK: `PRIVATE_SETTING#${adminId}`,
      SK: 'CONFIG',
      ...settings,
    });
  } else if (settings.businessName === 'Private Business' || settings.businessName === 'Prime Harvest Organic') {
    settings.businessName = 'Prime Harvest Organics';
    const now = new Date().toISOString();
    settings.updatedAt = now;
    await putItem({
      PK: `PRIVATE_SETTING#${adminId}`,
      SK: 'CONFIG',
      ...settings,
    });
  }
  return settings;
};

/**
 * Update Private Business Settings
 */
export const updatePrivateBusinessSettings = async (
  adminId: string = 'default',
  updates: Partial<PrivateBusinessSettingModel>
): Promise<PrivateBusinessSettingModel> => {
  const current = await getPrivateBusinessSettings(adminId);
  const now = new Date().toISOString();

  const updated: PrivateBusinessSettingModel = {
    ...current,
    ...updates,
    updatedAt: now,
  };

  await putItem({
    PK: `PRIVATE_SETTING#${adminId}`,
    SK: 'CONFIG',
    ...updated,
  });

  return updated;
};
