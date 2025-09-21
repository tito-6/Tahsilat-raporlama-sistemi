// backup-database.js - API route for database backup
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

// Database path helper
function getDatabasePath() {
  return path.join(process.cwd(), 'tahsilat_data.db');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const dbPath = getDatabasePath();
      if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ error: 'Database file not found' });
      }
      
      // Create backups directory if it doesn't exist
      const backupsDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `tahsilat_data_backup_${timestamp}.db`;
      const backupPath = path.join(backupsDir, backupFilename);
      
      // Copy the database file
      fs.copyFileSync(dbPath, backupPath);
      
      res.status(200).json({
        success: true,
        backupPath,
        timestamp
      });
    } catch (error) {
      console.error('Error creating database backup:', error);
      res.status(500).json({ 
        error: 'Failed to create database backup',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}