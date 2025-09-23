import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Initialize PostgreSQL database
    await initializeDatabase();
    const pgClient = await getDbConnection();

    // Check if we already have data in PostgreSQL
    const existingData = await pgClient.query('SELECT COUNT(*) as count FROM payments');
    const existingCount = parseInt(existingData.rows[0].count);

    if (existingCount > 0) {
      pgClient.release();
      return res.status(200).json({
        success: true,
        message: `PostgreSQL already has ${existingCount} records. Database initialized successfully.`,
        existingRecords: existingCount
      });
    }

    // Add some sample data for testing
    const samplePayments = [
      {
        customer_name: 'Test Customer 1',
        payment_date: '2024-01-15',
        amount_paid: 50000,
        currency_paid: 'TRY',
        exchange_rate: 1.0,
        exchange_rate_date: '2024-01-15',
        payment_method: 'Bank Transfer',
        account_type: 'TRY Account',
        project_name: 'Test Project',
        notes: 'Sample payment for testing'
      },
      {
        customer_name: 'Test Customer 2',
        payment_date: '2024-01-20',
        amount_paid: 1500,
        currency_paid: 'EUR',
        exchange_rate: 32.5,
        exchange_rate_date: '2024-01-20',
        payment_method: 'Cash',
        account_type: 'EUR Account',
        project_name: 'Test Project 2',
        notes: 'Another sample payment'
      }
    ];

    let insertedCount = 0;
    
    for (const payment of samplePayments) {
      try {
        await pgClient.query(`
          INSERT INTO payments (
            customer_name, payment_date, amount_paid, currency_paid, 
            exchange_rate, exchange_rate_date, payment_method, 
            account_type, project_name, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          payment.customer_name,
          payment.payment_date,
          payment.amount_paid,
          payment.currency_paid,
          payment.exchange_rate,
          payment.exchange_rate_date,
          payment.payment_method,
          payment.account_type,
          payment.project_name,
          payment.notes
        ]);
        insertedCount++;
      } catch (insertError) {
        console.error('Error inserting payment:', insertError, payment);
      }
    }

    pgClient.release();

    res.status(200).json({
      success: true,
      message: `Successfully initialized PostgreSQL database with ${insertedCount} sample records`,
      insertedRecords: insertedCount,
      totalRecords: insertedCount
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}