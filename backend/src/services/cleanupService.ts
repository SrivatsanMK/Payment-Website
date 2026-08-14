/**
 * cleanupService.ts
 *
 * Persistent daily background cleanup for Green Glide Logistics.
 * Uses node-cron for scheduling so it survives PM2/EC2 restarts.
 *
 * Jobs:
 *  1. QR Code Expiry   — Delete uploaded QR code images + clear Invoice.qrCodeImage
 *                        7 days after paymentApprovedAt.
 *  2. OTP Safety Sweep — Delete any OTP records older than 30 days
 *                        (safety net beyond the 5-min security TTL).
 *
 * Rules:
 *  - Missing files are handled gracefully (no crash, logged and skipped).
 *  - Only the temporary files are deleted; Invoice business data is preserved.
 *  - Each job is idempotent — safe to run multiple times.
 */

import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import Invoice from '../models/Invoice';
import OTP from '../models/OTP';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;       // 7 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;     // 30 days in milliseconds

// Resolve the uploads directory relative to this file (backend/src/services → backend/../uploads)
const UPLOADS_DIR = path.resolve(__dirname, '..', '..', '..', 'uploads');

// ─── Helper: safely delete a file from disk ──────────────────────────────────

function safeDeleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err: any) {
    console.error(`[Cleanup] Failed to delete file ${filePath}:`, err.message);
    return false;
  }
}

// ─── Job 1: QR Code 7-day expiry cleanup ─────────────────────────────────────

async function cleanupExpiredQrCodes(): Promise<void> {
  const tag = '[Cleanup:QR]';
  try {
    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);

    // Find invoices where payment was approved more than 7 days ago
    // AND a qrCodeImage reference still exists in MongoDB
    const expiredInvoices = await Invoice.find({
      paymentApprovedAt: { $lte: cutoff },
      qrCodeImage: { $exists: true, $ne: '' }
    }).lean();

    if (expiredInvoices.length === 0) {
      console.log(`${tag} No expired QR codes found.`);
      return;
    }

    console.log(`${tag} Found ${expiredInvoices.length} invoice(s) with expired QR codes.`);

    for (const invoice of expiredInvoices) {
      const qrPath: string = (invoice as any).qrCodeImage || '';
      if (!qrPath) continue;

      // Build absolute filesystem path from the relative URL path (/uploads/xxx.png)
      const relativePath = qrPath.startsWith('/') ? qrPath.slice(1) : qrPath;
      const absolutePath = path.join(UPLOADS_DIR, path.basename(relativePath));

      const deleted = safeDeleteFile(absolutePath);
      if (deleted) {
        console.log(`${tag} Deleted physical file: ${absolutePath}`);
      } else {
        console.log(`${tag} Physical file not found (stale ref): ${absolutePath} — will clear MongoDB ref.`);
      }

      // Clear the MongoDB reference regardless of whether the file existed
      await Invoice.updateOne(
        { _id: (invoice as any)._id },
        { $unset: { qrCodeImage: '' } }
      );

      console.log(`${tag} Cleared qrCodeImage ref for invoice ${(invoice as any).invoiceNumber}`);
    }

    console.log(`${tag} Cleanup complete. Processed ${expiredInvoices.length} invoice(s).`);
  } catch (err: any) {
    console.error(`${tag} Error during QR cleanup:`, err.message);
  }
}

// ─── Job 2: OTP 30-day safety sweep ──────────────────────────────────────────

async function cleanupOldOtpRecords(): Promise<void> {
  const tag = '[Cleanup:OTP]';
  try {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

    // The OTP TTL index auto-deletes on expiresAt, but this ensures
    // any orphaned records older than 30 days are removed as a safety net.
    const result = await OTP.deleteMany({ createdAt: { $lte: cutoff } });

    if (result.deletedCount > 0) {
      console.log(`${tag} Deleted ${result.deletedCount} stale OTP record(s) older than 30 days.`);
    } else {
      console.log(`${tag} No stale OTP records found.`);
    }
  } catch (err: any) {
    console.error(`${tag} Error during OTP cleanup:`, err.message);
  }
}

// ─── Combined daily job ───────────────────────────────────────────────────────

async function runDailyCleanup(): Promise<void> {
  console.log('[Cleanup] Starting daily cleanup job…');
  await cleanupExpiredQrCodes();
  await cleanupOldOtpRecords();
  console.log('[Cleanup] Daily cleanup complete.');
}

// ─── Export: initialise the cron schedule ────────────────────────────────────

/**
 * Call this once after the database connection is established.
 * Schedules the cleanup to run every day at 02:00 AM server time.
 * Also runs once immediately on startup to catch anything that expired
 * while the server was offline.
 */
export function initCleanupService(): void {
  console.log('[Cleanup] Initialising daily cleanup service (runs daily at 02:00 AM)…');

  // Run immediately on startup (catches expiries from any server downtime)
  runDailyCleanup().catch(err =>
    console.error('[Cleanup] Startup run error:', err)
  );

  // Schedule to run every day at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    runDailyCleanup().catch(err =>
      console.error('[Cleanup] Scheduled run error:', err)
    );
  }, {
    timezone: 'Asia/Kolkata'
  });
}
