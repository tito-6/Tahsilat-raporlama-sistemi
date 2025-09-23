import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await initializeDatabase();
    const client = await getDbConnection();

    // Add amount_usd calculated column to existing payments
    await client.query(`
      UPDATE payments 
      SET amount_paid = amount_paid::numeric
      WHERE amount_paid IS NOT NULL
    `);

    await client.query(`
      UPDATE payments 
      SET exchange_rate = exchange_rate::numeric
      WHERE exchange_rate IS NOT NULL
    `);

    client.release();

    res.status(200).json({
      success: true,
      message: 'Successfully updated payment amount types'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}