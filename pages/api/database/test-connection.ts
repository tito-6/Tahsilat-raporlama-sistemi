// database test-connection API route
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get database path
      const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
      
      // Open SQLite database connection
      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
      
      // Query SQLite version
      const version = await db.get('SELECT sqlite_version() as version');
      
      // Close connection
      await db.close();
      
      res.status(200).json({
        status: 'success',
        message: 'Database connection successful',
        sqlite_version: version?.version || 'Unknown'
      });
    } catch (error) {
      console.error('Database connection failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}