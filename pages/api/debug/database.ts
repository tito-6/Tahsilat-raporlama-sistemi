import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, executeQuery, initializeDatabase } from '../../../lib/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test database connection
    const client = await getDbConnection();
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    // Initialize database tables
    await initializeDatabase();
    
    // Check if payments table exists and get row count
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'payments'
    `);
    
    let paymentCount = 0;
    if (tableCheck.rows.length > 0) {
      const countResult = await client.query('SELECT COUNT(*) as count FROM payments');
      paymentCount = parseInt(countResult.rows[0].count);
    }
    
    client.release();
    
    res.status(200).json({
      success: true,
      database: {
        connected: true,
        currentTime: result.rows[0].current_time,
        postgresVersion: result.rows[0].pg_version,
        paymentsTableExists: tableCheck.rows.length > 0,
        paymentCount: paymentCount,
        databaseUrl: process.env.NETLIFY_DATABASE_URL ? 'Connected via NETLIFY_DATABASE_URL' : 'No database URL'
      }
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