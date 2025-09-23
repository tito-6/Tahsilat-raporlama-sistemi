import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

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

    // Initialize PostgreSQL database
    await initializeDatabase();
    const client = await getDbConnection();

    let dailyReportsResult, summaryResult, topCustomersResult;
    try {
      dailyReportsResult = await client.query(`
        SELECT 
          payment_date,
          SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
          COUNT(*) as transaction_count,
          STRING_AGG(DISTINCT payment_method, ', ') as payment_methods
        FROM payments 
        WHERE payment_date BETWEEN $1 AND $2
        GROUP BY payment_date
        ORDER BY payment_date ASC
      `, [start_date, end_date]);
    } catch (err) {
      console.error('Error in dailyReports query:', err);
      client.release();
      return res.status(500).json({ success: false, error: 'dailyReports query failed', message: err instanceof Error ? err.message : String(err) });
    }

    try {
      summaryResult = await client.query(`
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
          COUNT(DISTINCT customer_name) as unique_customers,
          COUNT(DISTINCT project_name) as unique_projects,
          CASE 
            WHEN ($2::date - $1::date + 1) > 0 
            THEN SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END)::numeric / 
                 ($2::date - $1::date + 1)::numeric
            ELSE 0
          END as average_usd_per_day
        FROM payments 
        WHERE payment_date BETWEEN $1 AND $2
      `, [start_date, end_date]);
    } catch (err) {
      console.error('Error in summary query:', err);
      client.release();
      return res.status(500).json({ success: false, error: 'summary query failed', message: err instanceof Error ? err.message : String(err) });
    }

    try {
      topCustomersResult = await client.query(`
        SELECT 
          customer_name,
          SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
          COUNT(*) as transaction_count
        FROM payments 
        WHERE payment_date BETWEEN $1 AND $2
        GROUP BY customer_name
        ORDER BY total_usd DESC
        LIMIT 10
      `, [start_date, end_date]);
    } catch (err) {
      console.error('Error in topCustomers query:', err);
      client.release();
      return res.status(500).json({ success: false, error: 'topCustomers query failed', message: err instanceof Error ? err.message : String(err) });
    }

    client.release();

    res.status(200).json({
      success: true,
      data: {
        daily_reports: dailyReportsResult.rows,
        summary: summaryResult.rows[0] || {},
        top_customers: topCustomersResult.rows
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