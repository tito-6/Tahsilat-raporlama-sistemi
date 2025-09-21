import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Monthly channel report
    const channelReport = await db.all(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        AVG(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as avg_usd
      FROM payments 
      WHERE year = ? AND month = ?
      GROUP BY payment_method
      ORDER BY total_usd DESC
    `, [year, month]);

    // Daily breakdown for the month
    const dailyBreakdown = await db.all(`
      SELECT 
        payment_date,
        payment_method,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd
      FROM payments 
      WHERE year = ? AND month = ?
      GROUP BY payment_date, payment_method
      ORDER BY payment_date ASC, total_usd DESC
    `, [year, month]);

    // Monthly summary
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_amount_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT payment_method) as payment_methods_used
      FROM payments 
      WHERE year = ? AND month = ?
    `, [year, month]);

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        channel_report: channelReport,
        daily_breakdown: dailyBreakdown,
        summary
      },
      period: {
        year: parseInt(year as string),
        month: parseInt(month as string)
      }
    });

  } catch (error) {
    console.error('Monthly channel report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly channel report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}