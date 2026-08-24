import { getItem, putItem, deleteItem, updateItem, scanItems } from './dynamoHelper';
import { OTPModel } from '../types/models';

/**
 * Save / replace OTP record for a given email and purpose
 */
export const saveOtp = async (data: {
  email: string;
  otp: string;
  purpose: OTPModel['purpose'];
  expiresAt: Date | number;
}): Promise<OTPModel> => {
  const cleanEmail = data.email.toLowerCase().trim();
  const now = new Date().toISOString();
  const expiresEpoch =
    typeof data.expiresAt === 'number'
      ? data.expiresAt
      : Math.floor(data.expiresAt.getTime() / 1000);

  const otpRecord: OTPModel & Record<string, any> = {
    PK: `OTP#${cleanEmail}`,
    SK: `PURPOSE#${data.purpose}`,
    GSI1PK: 'OTPS',
    GSI1SK: `${now}#${cleanEmail}`,
    email: cleanEmail,
    otp: data.otp.trim(),
    purpose: data.purpose,
    attempts: 0,
    expiresAt: expiresEpoch,
    createdAt: now,
  };

  return putItem<OTPModel>(otpRecord);
};

/**
 * Find OTP by email and purpose
 */
export const findOtp = async (email: string, purpose: string): Promise<OTPModel | null> => {
  const cleanEmail = email.toLowerCase().trim();
  return getItem<OTPModel>(`OTP#${cleanEmail}`, `PURPOSE#${purpose}`);
};

/**
 * Increment OTP attempt count
 */
export const incrementOtpAttempts = async (email: string, purpose: string): Promise<number> => {
  const cleanEmail = email.toLowerCase().trim();
  const existing = await findOtp(cleanEmail, purpose);
  const newAttempts = (existing?.attempts || 0) + 1;

  await updateItem(
    `OTP#${cleanEmail}`,
    `PURPOSE#${purpose}`,
    'SET attempts = :att',
    { ':att': newAttempts }
  );

  return newAttempts;
};

/**
 * Delete OTP by email and purpose
 */
export const deleteOtp = async (email: string, purpose: string): Promise<void> => {
  const cleanEmail = email.toLowerCase().trim();
  await deleteItem(`OTP#${cleanEmail}`, `PURPOSE#${purpose}`);
};

/**
 * Delete any OTPs for an email and purpose (legacy helper compatibility)
 */
export const deleteOtpByEmailAndPurpose = async (email: string, purpose: string): Promise<void> => {
  return deleteOtp(email, purpose);
};

/**
 * Delete stale OTP records older than cutoff for background maintenance sweep
 */
export const deleteStaleOtps = async (cutoffDate: Date): Promise<number> => {
  const cutoffIso = cutoffDate.toISOString();
  const staleOtps = await scanItems<OTPModel & Record<string, any>>({
    FilterExpression: 'begins_with(PK, :prefix) AND createdAt <= :cutoff',
    ExpressionAttributeValues: {
      ':prefix': 'OTP#',
      ':cutoff': cutoffIso,
    },
  });

  let deletedCount = 0;
  for (const otp of staleOtps) {
    if (otp.PK && otp.SK) {
      await deleteItem(otp.PK, otp.SK);
      deletedCount++;
    }
  }

  return deletedCount;
};
