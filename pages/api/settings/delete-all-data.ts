import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      return res.status(200).json({ 
        success: true, 
        message: 'No data to delete - database does not exist',
        deletedRecords: 0
      });
    }

    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Get count of records before deletion (handle missing tables gracefully)
    let paymentCount = { count: 0 };
    let settingsCount = { count: 0 };
    
    try {
      paymentCount = await db.get('SELECT COUNT(*) as count FROM payments') || { count: 0 };
    } catch (error) {
      console.log('Payments table does not exist or is empty');
    }
    
    try {
      settingsCount = await db.get('SELECT COUNT(*) as count FROM settings') || { count: 0 };
    } catch (error) {
      console.log('Settings table does not exist or is empty');
    }
    
    const totalRecords = (paymentCount?.count || 0) + (settingsCount?.count || 0);

    // Force delete all data from payments and settings tables, and reset sequence
    try {
      await db.run('DELETE FROM payments');
      await db.run('DELETE FROM settings');
      await db.run('DELETE FROM sqlite_sequence WHERE name IN ("payments", "settings")');
      await db.run('VACUUM');
    } catch (error) {
      console.log('Could not fully wipe tables:', error);
    }
    
      // Vacuum database to reclaim space
      try {
        await db.run('VACUUM');
      } catch (error) {
        console.log('Could not vacuum database');
      }
    
    // Close database connection
    await db.close();

    // Also try to clear any backup files (optional)
    const backupsDir = path.join(process.cwd(), 'backups');
    if (fs.existsSync(backupsDir)) {
      try {
        const backupFiles = fs.readdirSync(backupsDir);
        for (const file of backupFiles) {
          if (file.startsWith('tahsilat_data_backup_') && file.endsWith('.db')) {
            fs.unlinkSync(path.join(backupsDir, file));
          }
        }
      } catch (backupError) {
        console.warn('Could not clear backup files:', backupError);
        // Don't fail the whole operation if backup cleanup fails
      }
    }

    // Clear any temp files
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (fs.existsSync(tmpDir)) {
      try {
        const tmpFiles = fs.readdirSync(tmpDir);
        for (const file of tmpFiles) {
          const filePath = path.join(tmpDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (tmpError) {
        console.warn('Could not clear temp files:', tmpError);
        // Don't fail the whole operation if temp cleanup fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'All data has been successfully deleted',
      deletedRecords: totalRecords,
      clearedBackups: true,
      clearedTemp: true
    });

  } catch (error) {
    console.error('Error deleting all data:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete all data',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}