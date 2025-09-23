import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    
    console.log('Attempting to open database at:', dbPath);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Database opened successfully');
    
    // Test a simple query
    const result = await db.get('SELECT COUNT(*) as count FROM payments LIMIT 1');
    
    console.log('Query result:', result);
    
    await db.close();
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      paymentCount: result?.count || 0
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}