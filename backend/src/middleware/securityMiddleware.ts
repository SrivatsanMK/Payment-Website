import { Request, Response, NextFunction } from 'express';

// ─── 1. TIERED ACCOUNT LOCKOUT & BRUTE-FORCE SHIELD ────────────────────────

interface LockoutRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

export interface FailedAttemptResult {
  totalAttempts: number;
  locked: boolean;
  lockoutMinutes: number;
  attemptsLeft: number;
  message: string;
}

const INACTIVITY_RESET_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours of inactivity resets attempts

class AccountLockoutManager {
  private store: Map<string, LockoutRecord> = new Map();

  constructor() {
    // Periodic garbage cleanup every 10 minutes to prevent memory leaks
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  private normalizeKey(identifier: string, ip?: string): string {
    const cleanId = (identifier || 'unknown').trim().toLowerCase();
    const cleanIp = (ip || '').replace(/^.*:/, '');
    return `${cleanId}#${cleanIp}`;
  }

  public isAccountLocked(identifier: string, ip?: string): { locked: boolean; remainingMinutes: number; totalAttempts: number } {
    const key = this.normalizeKey(identifier, ip);
    const record = this.store.get(key);

    if (!record || !record.lockedUntil) {
      return { locked: false, remainingMinutes: 0, totalAttempts: record?.attempts || 0 };
    }

    const now = Date.now();
    if (now < record.lockedUntil) {
      const remainingMs = record.lockedUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      return { locked: true, remainingMinutes, totalAttempts: record.attempts };
    }

    // Lockout has expired — clear lockedUntil flag so user enters next tier
    record.lockedUntil = null;
    this.store.set(key, record);
    return { locked: false, remainingMinutes: 0, totalAttempts: record.attempts };
  }

  /**
   * Records a failed attempt and evaluates Tiered Lockout:
   * - 1-2 attempts: Alert email sent, 2 / 1 attempts remaining until 10-minute lockout.
   * - 3rd attempt: 10-minute lockout + Lockout email sent.
   * - 4th attempt (after 10m lock): Alert email sent, 1 attempt remaining until 15-minute lockout.
   * - 5th attempt: 15-minute lockout + Lockout email sent.
   * - 6th and subsequent attempts: 10-minute lockout each time + Lockout email sent.
   */
  public recordFailedAttempt(identifier: string, ip?: string): FailedAttemptResult {
    const key = this.normalizeKey(identifier, ip);
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now - record.lastAttemptAt > INACTIVITY_RESET_WINDOW_MS) {
      record = {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        lockedUntil: null,
      };
    } else {
      record.attempts += 1;
      record.lastAttemptAt = now;
    }

    const attempts = record.attempts;

    if (attempts === 1) {
      this.store.set(key, record);
      return {
        totalAttempts: 1,
        locked: false,
        lockoutMinutes: 0,
        attemptsLeft: 2,
        message: 'Invalid credentials. You have 2 attempt(s) remaining before a 10-minute account lockout.',
      };
    }

    if (attempts === 2) {
      this.store.set(key, record);
      return {
        totalAttempts: 2,
        locked: false,
        lockoutMinutes: 0,
        attemptsLeft: 1,
        message: 'Invalid credentials. Warning: 1 attempt remaining before a 10-minute account lockout.',
      };
    }

    if (attempts === 3) {
      const lockoutMinutes = 10;
      record.lockedUntil = now + lockoutMinutes * 60 * 1000;
      this.store.set(key, record);
      return {
        totalAttempts: 3,
        locked: true,
        lockoutMinutes,
        attemptsLeft: 0,
        message: `Account temporarily locked for ${lockoutMinutes} minutes due to 3 consecutive failed login attempts.`,
      };
    }

    if (attempts === 4) {
      this.store.set(key, record);
      return {
        totalAttempts: 4,
        locked: false,
        lockoutMinutes: 0,
        attemptsLeft: 1,
        message: 'Invalid credentials. Warning: 1 attempt remaining before a 15-minute account lockout.',
      };
    }

    if (attempts === 5) {
      const lockoutMinutes = 15;
      record.lockedUntil = now + lockoutMinutes * 60 * 1000;
      this.store.set(key, record);
      return {
        totalAttempts: 5,
        locked: true,
        lockoutMinutes,
        attemptsLeft: 0,
        message: `Account temporarily locked for ${lockoutMinutes} minutes due to 5 consecutive failed login attempts.`,
      };
    }

    // 6th and each subsequent failure: 10 minutes lock
    const lockoutMinutes = 10;
    record.lockedUntil = now + lockoutMinutes * 60 * 1000;
    this.store.set(key, record);
    return {
      totalAttempts: attempts,
      locked: true,
      lockoutMinutes,
      attemptsLeft: 0,
      message: `Account temporarily locked for ${lockoutMinutes} minutes due to repeated failed login attempts.`,
    };
  }

  public resetFailedAttempts(identifier: string, ip?: string): void {
    const key = this.normalizeKey(identifier, ip);
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.lockedUntil && now > record.lockedUntil && now - record.lastAttemptAt > INACTIVITY_RESET_WINDOW_MS) {
        this.store.delete(key);
      } else if (!record.lockedUntil && now - record.lastAttemptAt > INACTIVITY_RESET_WINDOW_MS) {
        this.store.delete(key);
      }
    }
  }
}

export const lockoutManager = new AccountLockoutManager();

// ─── 2. INPUT SANITIZATION & ANTI-INJECTION MIDDLEWARE ────────────────────────

const sanitizeString = (val: string): string => {
  if (typeof val !== 'string') return val;

  return val
    // Remove null bytes
    .replace(/\0/g, '')
    // Neutralize dangerous script tag injections
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Neutralize javascript: pseudo-protocol
    .replace(/javascript:/gi, '')
    // Neutralize onerror/onload event handler attributes in HTML
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

const sanitizeRecursive = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeRecursive);
  }

  if (typeof obj === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Prototype Pollution Prevention: ignore dangerous object prototype keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleanObj[key] = sanitizeRecursive(obj[key]);
    }
    return cleanObj;
  }

  return obj;
};

export const sanitizePayloads = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeRecursive(req.body);
  }
  if (req.query) {
    req.query = sanitizeRecursive(req.query);
  }
  if (req.params) {
    req.params = sanitizeRecursive(req.params);
  }
  next();
};

// ─── 3. SECURE ERROR HANDLER ──────────────────────────────────────────────────

export const securityErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Security Error Handler]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Never leak internal stack traces or internal DB details to external clients
  const clientMessage = isProduction && statusCode === 500
    ? 'An internal security error occurred. Please try again later.'
    : err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
};
