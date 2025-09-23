import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

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
        message: `PostgreSQL already has ${existingCount} records. Migration not needed.`,
        existingRecords: existingCount
      });
    }

    // Try to read from SQLite database
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    let sqliteData: any[] = [];

    try {
      const sqliteDb = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // Get all payments from SQLite
      sqliteData = await sqliteDb.all('SELECT * FROM payments ORDER BY id');
      await sqliteDb.close();
      
      console.log(`Found ${sqliteData.length} records in SQLite database`);
    } catch (sqliteError) {
      console.log('Could not read SQLite database:', sqliteError);
      pgClient.release();
      return res.status(200).json({
        success: true,
        message: 'SQLite database not found or empty. Starting with clean PostgreSQL database.',
        migratedRecords: 0
      });
    }

    // Migrate data to PostgreSQL
    let migratedCount = 0;
    
    for (const payment of sqliteData) {
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
        migratedCount++;
      } catch (insertError) {
        console.error('Error inserting payment:', insertError, payment);
      }
    }

    pgClient.release();

    res.status(200).json({
      success: true,
      message: `Successfully migrated ${migratedCount} records from SQLite to PostgreSQL`,
      migratedRecords: migratedCount,
      totalFound: sqliteData.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}