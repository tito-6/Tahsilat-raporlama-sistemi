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
    const { project_name } = req.query;
    
    if (!project_name) {
      return res.status(400).json({ error: 'project_name is required' });
    }

    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Project payment history
    const paymentHistory = await db.all(`
      SELECT 
        payment_date,
        customer_name,
        payment_method,
        amount_paid,
        currency_paid,
        CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END as amount_usd,
        note,
        department
      FROM payments 
      WHERE project_name = ?
      ORDER BY payment_date DESC
    `, [project_name]);

    // Project summary statistics
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_amount_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT payment_method) as payment_methods_used,
        MIN(payment_date) as first_payment_date,
        MAX(payment_date) as last_payment_date,
        AVG(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as avg_payment_usd
      FROM payments 
      WHERE project_name = ?
    `, [project_name]);

    // Monthly collection trend
    const monthlyTrend = await db.all(`
      SELECT 
        year,
        month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd
      FROM payments 
      WHERE project_name = ?
      GROUP BY year, month
      ORDER BY year DESC, month DESC
    `, [project_name]);

    // Top customers for this project
    const topCustomers = await db.all(`
      SELECT 
        customer_name,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        MAX(payment_date) as last_payment_date
      FROM payments 
      WHERE project_name = ?
      GROUP BY customer_name
      ORDER BY total_usd DESC
      LIMIT 10
    `, [project_name]);

    // Payment method distribution
    const paymentMethodDistribution = await db.all(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        ROUND(
          100.0 * COUNT(*) / (SELECT COUNT(*) FROM payments WHERE project_name = ?), 
          2
        ) as percentage
      FROM payments 
      WHERE project_name = ?
      GROUP BY payment_method
      ORDER BY total_usd DESC
    `, [project_name, project_name]);

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        project_name,
        payment_history: paymentHistory,
        summary,
        monthly_trend: monthlyTrend,
        top_customers: topCustomers,
        payment_method_distribution: paymentMethodDistribution
      }
    });

  } catch (error) {
    console.error('Project detail report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate project detail report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}