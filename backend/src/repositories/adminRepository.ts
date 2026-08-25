import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getItem, putItem, updateItem, queryItems, scanItems, deleteItem } from './dynamoHelper';
import { AdminModel } from '../types/models';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (enteredPassword: string, storedHash: string): Promise<boolean> => {
  if (!enteredPassword || !storedHash) return false;
  return bcrypt.compare(enteredPassword, storedHash);
};

/**
 * Find admin by internal UUID id
 */
export const findAdminById = async (id: string): Promise<AdminModel | null> => {
  return getItem<AdminModel>(`ADMIN#${id}`, 'PROFILE');
};

/**
 * Find all admins
 */
export const findAllAdmins = async (): Promise<AdminModel[]> => {
  const admins = await queryItems<AdminModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'ADMINS',
    },
  });

  if (admins.length > 0) return admins;

  // Fallback scan for items with PK begins_with ADMIN# and SK = PROFILE
  return scanItems<AdminModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'ADMIN#',
      ':sk': 'PROFILE',
    },
  });
};

/**
 * Find admin by any identifier: adminId, email, username, or phone
 */
export const findAdminByIdentifier = async (identifier: string): Promise<AdminModel | null> => {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();

  const allAdmins = await findAllAdmins();
  for (const admin of allAdmins) {
    if (
      (admin.adminId && admin.adminId.toLowerCase() === cleanId) ||
      (admin.email && admin.email.toLowerCase() === cleanId) ||
      (admin.username && admin.username.toLowerCase() === cleanId) ||
      (admin.phone && admin.phone.trim() === identifier.trim())
    ) {
      return admin;
    }
  }

  return null;
};

/**
 * Find admin by email
 */
export const findAdminByEmail = async (email: string): Promise<AdminModel | null> => {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const allAdmins = await findAllAdmins();
  return allAdmins.find((a) => a.email && a.email.toLowerCase() === cleanEmail) || null;
};

/**
 * Create or save Admin
 */
export const createAdmin = async (adminData: Partial<AdminModel>): Promise<AdminModel> => {
  const id = adminData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  let hashedPassword = adminData.password || '';
  if (hashedPassword && !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
    hashedPassword = await hashPassword(hashedPassword);
  }

  const newAdmin: AdminModel & Record<string, any> = {
    PK: `ADMIN#${id}`,
    SK: 'PROFILE',
    GSI1PK: 'ADMINS',
    GSI1SK: `${now}#${id}`,
    GSI2PK: `ADMIN_IDENTIFIER#${(adminData.username || '').toLowerCase()}`,
    GSI2SK: 'PROFILE',
    id,
    _id: id,
    adminId: adminData.adminId || `ADM-${Math.floor(10000 + Math.random() * 90000)}`,
    username: (adminData.username || '').trim(),
    displayName: (adminData.displayName || adminData.username || 'Admin').trim(),
    email: (adminData.email || '').toLowerCase().trim(),
    phone: (adminData.phone || '').trim(),
    password: hashedPassword,
    role: adminData.role || 'ADMIN_1',
    profilePicture: adminData.profilePicture || '',
    createdAt: adminData.createdAt || now,
    updatedAt: now,
  };

  return putItem<AdminModel>(newAdmin);
};

/**
 * Update Admin profile
 */
export const updateAdmin = async (id: string, updates: Partial<AdminModel>): Promise<AdminModel | null> => {
  const existing = await findAdminById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  let updatedPassword = existing.password;
  if (updates.password && updates.password !== existing.password) {
    if (!updates.password.startsWith('$2a$') && !updates.password.startsWith('$2b$')) {
      updatedPassword = await hashPassword(updates.password);
    } else {
      updatedPassword = updates.password;
    }
  }

  const updatedAdmin: AdminModel & Record<string, any> = {
    ...existing,
    PK: `ADMIN#${id}`,
    SK: 'PROFILE',
    GSI1PK: 'ADMINS',
    GSI1SK: `${existing.createdAt || now}#${id}`,
    adminId: updates.adminId !== undefined ? updates.adminId : existing.adminId,
    username: updates.username !== undefined ? updates.username.trim() : existing.username,
    displayName: updates.displayName !== undefined ? updates.displayName.trim() : existing.displayName,
    email: updates.email !== undefined ? updates.email.toLowerCase().trim() : existing.email,
    phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
    password: updatedPassword,
    profilePicture: updates.profilePicture !== undefined ? updates.profilePicture : existing.profilePicture,
    role: updates.role || existing.role,
    updatedAt: now,
  };

  return putItem<AdminModel>(updatedAdmin);
};

/**
 * Seed or sync default Admin accounts (Akash Admin & Hrithik Admin)
 */
export const seedDefaultAdminsIfEmpty = async (): Promise<void> => {
  const admins = await findAllAdmins();
  if (admins.length === 0) {
    console.log('[DynamoDB] Seeding default Admin accounts in DynamoDB...');
    const defaultPasswordHash = await hashPassword('Admin@123');

    await createAdmin({
      adminId: 'ADM-10001',
      username: 'admin',
      displayName: 'Akash Admin',
      email: 'srivatsanmk2004@gmail.com',
      phone: '9876543210',
      password: defaultPasswordHash,
      role: 'ADMIN_1',
    });

    await createAdmin({
      adminId: 'ADM-10002',
      username: 'partner',
      displayName: 'Hrithik Admin',
      email: 'mksrivatsan53@gmail.com',
      phone: '9876543211',
      password: defaultPasswordHash,
      role: 'ADMIN_2',
    });

    console.log('[DynamoDB] Seeded ADMIN_1 (Akash Admin) and ADMIN_2 (Hrithik Admin) with updated emails.');
  } else {
    // Ensure existing admin records are synced with the new emails
    for (const admin of admins) {
      if (
        admin.role === 'ADMIN_1' ||
        admin.adminId === 'ADM-10001' ||
        admin.displayName?.toLowerCase().includes('akash') ||
        admin.username === 'admin'
      ) {
        if (admin.email !== 'srivatsanmk2004@gmail.com') {
          console.log(`[DynamoDB] Updating Akash Admin email to srivatsanmk2004@gmail.com...`);
          await updateAdmin(admin.id, { email: 'srivatsanmk2004@gmail.com' });
        }
      }

      if (
        admin.role === 'ADMIN_2' ||
        admin.adminId === 'ADM-10002' ||
        admin.displayName?.toLowerCase().includes('hrithik') ||
        admin.username === 'partner'
      ) {
        if (admin.email !== 'mksrivatsan53@gmail.com') {
          console.log(`[DynamoDB] Updating Hrithik Admin email to mksrivatsan53@gmail.com...`);
          await updateAdmin(admin.id, { email: 'mksrivatsan53@gmail.com' });
        }
      }
    }
  }
};
