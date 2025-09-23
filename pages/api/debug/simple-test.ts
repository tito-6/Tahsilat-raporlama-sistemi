import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await initializeDatabase();
    const client = await getDbConnection();

    // Test 1: Check table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'payments'
      ORDER BY ordinal_position
    `);

    // Test 2: Simple query without complex operations
    const simpleCount = await client.query('SELECT COUNT(*) as count FROM payments');

    // Test 3: Basic date range query
    const dateTest = await client.query(`
      SELECT payment_date, amount_paid, currency_paid 
      FROM payments 
      WHERE payment_date BETWEEN '2024-01-15' AND '2024-01-25'
      LIMIT 5
    `);

    // Test 4: Test the problematic part - date arithmetic
    let dateArithmeticResult = null;
    try {
      dateArithmeticResult = await client.query(`
        SELECT '2024-01-25'::date - '2024-01-15'::date as date_diff
      `);
    } catch (err) {
      dateArithmeticResult = { error: err instanceof Error ? err.message : String(err) };
    }

    client.release();

    res.status(200).json({
      success: true,
      tests: {
        tableStructure: tableInfo.rows,
        simpleCount: simpleCount.rows[0],
        dateRangeData: dateTest.rows,
        dateArithmetic: dateArithmeticResult
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}