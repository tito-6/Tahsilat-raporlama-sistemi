import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Testing daily reports endpoint...');
    
    // Initialize PostgreSQL database
    await initializeDatabase();
    const client = await getDbConnection();

    // Test basic query first
    const testResult = await client.query('SELECT COUNT(*) as count FROM payments');
    console.log('Basic query result:', testResult.rows[0]);

    // Test date range query
    const start_date = '2025-09-16';
    const end_date = '2025-09-23';
    
    const dateRangeResult = await client.query(`
      SELECT COUNT(*) as count FROM payments 
      WHERE payment_date BETWEEN $1 AND $2
    `, [start_date, end_date]);
    
    console.log('Date range query result:', dateRangeResult.rows[0]);
    
    // Test the problematic query step by step
    try {
      const simpleDaily = await client.query(`
        SELECT 
          payment_date,
          SUM(amount_paid) as total_amount,
          COUNT(*) as transaction_count
        FROM payments 
        WHERE payment_date BETWEEN $1 AND $2
        GROUP BY payment_date
        ORDER BY payment_date ASC
      `, [start_date, end_date]);
      
      console.log('Simple daily query result:', simpleDaily.rows);
    } catch (simpleDailyError) {
      console.error('Simple daily query error:', simpleDailyError);
    }

    // Release the database connection
    client.release();

    res.status(200).json({
      success: true,
      message: 'Daily reports test completed',
      results: {
        total_payments: testResult.rows[0],
        date_range_count: dateRangeResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Test daily report error:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}