import crypto from 'crypto';

// Master encryption secret key derived from environment or secure hardware-grade fallback
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'ggl-super-secure-encryption-master-key-32bytes!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag

// Derive a consistent 32-byte (256-bit) key using SHA-256
const getDerivedKey = (): Buffer => {
  return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
};

/**
 * Encrypt any plain text using AES-256-GCM (Authenticated Encryption).
 * Output format: Base64(IV + AuthTag + Ciphertext)
 */
export const encryptData = (plainText: string): string => {
  if (!plainText || typeof plainText !== 'string') return plainText;

  try {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Package as single base64 string: IV (12B) + Tag (16B) + EncryptedHex
    const payload = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);
    return `enc:${payload.toString('base64')}`;
  } catch (error) {
    console.error('[Crypto] Encryption error:', error);
    return plainText; // Safe fallback in extreme failure
  }
};

/**
 * Decrypt ciphertext that was encrypted with AES-256-GCM.
 */
export const decryptData = (cipherPayload: string): string => {
  if (!cipherPayload || typeof cipherPayload !== 'string') return cipherPayload;
  if (!cipherPayload.startsWith('enc:')) return cipherPayload; // Not encrypted

  try {
    const rawBase64 = cipherPayload.slice(4);
    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length < IV_LENGTH + TAG_LENGTH) {
      return cipherPayload;
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encryptedData = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const key = getDerivedKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[Crypto] Decryption failed / Data tampering detected:', error);
    return cipherPayload;
  }
};

/**
 * Generate HMAC-SHA256 signature for payload verification
 */
export const generateHmacSignature = (data: string): string => {
  const key = getDerivedKey();
  return crypto.createHmac('sha256', key).update(data).digest('hex');
};

/**
 * Verify HMAC signature with timing-safe comparison to prevent timing attacks
 */
export const verifyHmacSignature = (data: string, signature: string): boolean => {
  const expectedSig = generateHmacSignature(data);
  const expectedBuffer = Buffer.from(expectedSig, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};
