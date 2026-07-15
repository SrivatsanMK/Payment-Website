import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../../../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Creates a JSON file backup of the MongoDB database collections.
 */
export const runBackup = async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    const dbName = mongoose.connection.name || 'dealer-payment';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${dbName}-backup-${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not active');
    }

    const collections = await db.listCollections().toArray();
    const backupData: Record<string, any[]> = {};

    for (const col of collections) {
      const name = col.name;
      const data = await db.collection(name).find({}).toArray();
      backupData[name] = data;
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`[Backup System] Database backup saved to: ${backupFilePath}`);

    return {
      success: true,
      filePath: backupFilePath
    };
  } catch (error: any) {
    console.error('[Backup System] Database backup failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during backup'
    };
  }
};
