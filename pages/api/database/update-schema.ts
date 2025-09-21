import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Add is_duplicate_confirmed column to the payments table if it doesn't exist
    await db.exec(`
      PRAGMA table_info(payments);
    `).then(async () => {
      // Check if column exists
      const columns = await db.all(`PRAGMA table_info(payments);`);
      const isDuplicateConfirmedExists = columns.some(column => column.name === 'is_duplicate_confirmed');
      
      if (!isDuplicateConfirmedExists) {
        await db.exec(`
          ALTER TABLE payments ADD COLUMN is_duplicate_confirmed INTEGER DEFAULT 0;
        `);
        console.log('Added is_duplicate_confirmed column to payments table');
      }
    });

    await db.close();

    res.status(200).json({
      success: true,
      message: 'Database schema updated successfully'
    });

  } catch (error) {
    console.error('Database update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update database schema',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}