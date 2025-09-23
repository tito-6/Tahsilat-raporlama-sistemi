import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initializeDatabase();
    const client = await getDbConnection();

    // Fix the payment_date column to be proper DATE type
    await client.query(`
      ALTER TABLE payments 
      ALTER COLUMN payment_date TYPE DATE 
      USING payment_date::DATE
    `);

    // Also fix exchange_rate_date
    await client.query(`
      ALTER TABLE payments 
      ALTER COLUMN exchange_rate_date TYPE DATE 
      USING exchange_rate_date::DATE
    `);

    client.release();

    res.status(200).json({
      success: true,
      message: 'Successfully fixed date column types from VARCHAR to DATE'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}