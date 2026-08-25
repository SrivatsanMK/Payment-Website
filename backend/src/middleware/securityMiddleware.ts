import { Request, Response, NextFunction } from 'express';

// ─── 1. ACCOUNT LOCKOUT & BRUTE-FORCE SHIELD ────────────────────────────────

interface LockoutRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes attempt window

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

  public isAccountLocked(identifier: string, ip?: string): { locked: boolean; remainingMinutes: number } {
    const key = this.normalizeKey(identifier, ip);
    const record = this.store.get(key);

    if (!record || !record.lockedUntil) {
      return { locked: false, remainingMinutes: 0 };
    }

    const now = Date.now();
    if (now < record.lockedUntil) {
      const remainingMs = record.lockedUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
      return { locked: true, remainingMinutes };
    }

    // Lockout has expired — reset
    this.store.delete(key);
    return { locked: false, remainingMinutes: 0 };
  }

  public recordFailedAttempt(identifier: string, ip?: string): { attemptsLeft: number; locked: boolean; remainingMinutes: number } {
    const key = this.normalizeKey(identifier, ip);
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
      record = {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      };
    } else {
      record.attempts += 1;
    }

    if (record.attempts >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      this.store.set(key, record);
      return {
        attemptsLeft: 0,
        locked: true,
        remainingMinutes: Math.ceil(LOCKOUT_DURATION_MS / (60 * 1000)),
      };
    }

    this.store.set(key, record);
    return {
      attemptsLeft: MAX_FAILED_ATTEMPTS - record.attempts,
      locked: false,
      remainingMinutes: 0,
    };
  }

  public resetFailedAttempts(identifier: string, ip?: string): void {
    const key = this.normalizeKey(identifier, ip);
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.lockedUntil && now > record.lockedUntil) {
        this.store.delete(key);
      } else if (!record.lockedUntil && now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
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
