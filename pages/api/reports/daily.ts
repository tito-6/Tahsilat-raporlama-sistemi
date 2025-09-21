import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Helper function to parse Turkish date format (DD/MM/YYYY)
function parseTurkishDate(dateStr: string | Date): Date {
  if (!dateStr) return new Date(); // Return current date as fallback
  
  // Check if it's already a Date object
  if (dateStr instanceof Date) return dateStr;
  
  console.log(`Parsing date: ${dateStr}`);
  
  // Try parsing as Turkish format (DD/MM/YYYY or DD.MM.YYYY)
  // Handle DD/MM/YYYY format
  const formatRegex1 = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match1 = dateStr.match(formatRegex1);
  if (match1) {
    const [, day, month, year] = match1;
    const parsedDate = new Date(`${year}-${month}-${day}`);
    console.log(`Parsed DD/MM/YYYY: ${dateStr} -> ${parsedDate.toISOString()}`);
    return parsedDate;
  }
  
  // Handle DD.MM.YYYY format
  const formatRegex2 = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match2 = dateStr.match(formatRegex2);
  if (match2) {
    const [, day, month, year] = match2;
    const parsedDate = new Date(`${year}-${month}-${day}`);
    console.log(`Parsed DD.MM.YYYY: ${dateStr} -> ${parsedDate.toISOString()}`);
    return parsedDate;
  }
  
  // Fallback to standard JS Date parsing
  const parsedDate = new Date(dateStr);
  if (!isNaN(parsedDate.getTime())) {
    console.log(`Standard date parse: ${dateStr} -> ${parsedDate.toISOString()}`);
    return parsedDate;
  }
  
  console.error(`Failed to parse date: ${dateStr}`);
  return new Date(); // Return current date if parsing fails
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }
    
    console.log(`Daily Report - Date Range: ${start_date} to ${end_date}`);

    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Daily USD report query
    const dailyReports = await db.all(`
      SELECT 
        payment_date,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(*) as transaction_count,
        GROUP_CONCAT(DISTINCT payment_method) as payment_methods
      FROM payments 
      WHERE payment_date BETWEEN ? AND ?
      GROUP BY payment_date
      ORDER BY payment_date ASC
    `, [start_date, end_date]);

    // Summary statistics
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT project_name) as unique_projects,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) / 
        (julianday(?) - julianday(?) + 1) as average_usd_per_day
      FROM payments 
      WHERE payment_date BETWEEN ? AND ?
    `, [end_date, start_date, start_date, end_date]);

    // Top customers
    const topCustomers = await db.all(`
      SELECT 
        customer_name,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(*) as transaction_count
      FROM payments 
      WHERE payment_date BETWEEN ? AND ?
      GROUP BY customer_name
      ORDER BY total_usd DESC
      LIMIT 10
    `, [start_date, end_date]);

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        daily_reports: dailyReports,
        summary,
        top_customers: topCustomers
      },
      period: {
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}