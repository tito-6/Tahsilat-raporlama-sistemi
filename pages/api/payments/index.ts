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
  
  // Try ISO format as fallback
  try {
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      console.log(`Parsed ISO: ${dateStr} -> ${parsedDate.toISOString()}`);
      return parsedDate;
    }
  } catch (e) {
    console.log(`Failed to parse date: ${dateStr}`);
  }
  
  console.log(`Falling back to current date for: ${dateStr}`);
  return new Date();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Initialize database
    await initializeDatabase();

    const {
      page = '1',
      limit = '50',
      search = '',
      payment_method = '',
      currency = '',
      project = '',
      customer = '',
      start_date = '', 
      end_date = '',
      sort_by = 'payment_date',
      sort_order = 'DESC'
    } = req.query;

    const client = await getDbConnection();

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(customer_name ILIKE $${paramIndex} OR project_name ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (payment_method) {
      conditions.push(`payment_method ILIKE $${paramIndex}`);
      params.push(`%${payment_method}%`);
      paramIndex++;
    }

    if (currency) {
      conditions.push(`currency_paid = $${paramIndex}`);
      params.push(currency);
      paramIndex++;
    }

    if (project) {
      conditions.push(`project_name ILIKE $${paramIndex}`);
      params.push(`%${project}%`);
      paramIndex++;
    }

    if (customer) {
      conditions.push(`customer_name ILIKE $${paramIndex}`);
      params.push(`%${customer}%`);
      paramIndex++;
    }

    if (start_date) {
      // For PostgreSQL, we'll store dates as text initially for compatibility
      conditions.push(`payment_date >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`payment_date <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM payments ${whereClause}`;
    const countResult = await client.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    // Calculate pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Get payments with pagination and calculate USD amounts
    const orderClause = `ORDER BY ${sort_by} ${sort_order}`;
    const paymentsQuery = `
      SELECT *, 
        CASE 
          WHEN currency_paid = 'USD' THEN amount_paid::numeric 
          ELSE amount_paid::numeric * exchange_rate::numeric 
        END as amount_usd
      FROM payments 
      ${whereClause} 
      ${orderClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const paymentsResult = await client.query(paymentsQuery, [...params, limitNum, offset]);
    const payments = paymentsResult.rows;

    // Get filter options
    const paymentMethodsResult = await client.query(`
      SELECT DISTINCT payment_method 
      FROM payments 
      WHERE payment_method IS NOT NULL AND payment_method != ''
      ORDER BY payment_method
    `);

    const currenciesResult = await client.query(`
      SELECT DISTINCT currency_paid 
      FROM payments 
      WHERE currency_paid IS NOT NULL AND currency_paid != ''
      ORDER BY currency_paid
    `);

    const projectsResult = await client.query(`
      SELECT DISTINCT project_name 
      FROM payments 
      WHERE project_name IS NOT NULL AND project_name != ''
      ORDER BY project_name
    `);

    const customersResult = await client.query(`
      SELECT DISTINCT customer_name 
      FROM payments 
      WHERE customer_name IS NOT NULL AND customer_name != ''
      ORDER BY customer_name
    `);

    client.release();

    res.status(200).json({
      success: true,
      data: {
        payments: payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total_records: totalRecords,
          total_pages: totalPages,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        },
        filters: {
          payment_methods: paymentMethodsResult.rows.map(p => p.payment_method),
          currencies: currenciesResult.rows.map(c => c.currency_paid),
          projects: projectsResult.rows.map(p => p.project_name),
          customers: customersResult.rows.map(c => c.customer_name)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}