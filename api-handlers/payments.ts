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
    const { 
      page = 1, 
      limit = 50, 
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

    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Build WHERE clause for filtering
    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(`(customer_name LIKE ? OR project_name LIKE ? OR payment_method LIKE ?)`);
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (payment_method) {
      whereConditions.push(`payment_method = ?`);
      params.push(payment_method);
    }

    if (currency) {
      whereConditions.push(`currency_paid = ?`);
      params.push(currency);
    }

    if (project) {
      whereConditions.push(`project_name = ?`);
      params.push(project);
    }

    if (customer) {
      whereConditions.push(`customer_name = ?`);
      params.push(customer);
    }

    if (start_date) {
      // Convert ISO date (YYYY-MM-DD) to Turkish format (DD/MM/YYYY) for comparison
      const startDate = new Date(start_date as string);
      const startDateTurkish = `${startDate.getDate().toString().padStart(2, '0')}/${(startDate.getMonth() + 1).toString().padStart(2, '0')}/${startDate.getFullYear()}`;
      whereConditions.push(`
        DATE(
          substr(payment_date, 7, 4) || '-' || 
          substr(payment_date, 4, 2) || '-' || 
          substr(payment_date, 1, 2)
        ) >= DATE(?)
      `);
      params.push(start_date);
      console.log(`Filtering payments from date: ${start_date} (${startDateTurkish})`);
    }

    if (end_date) {
      // Convert ISO date (YYYY-MM-DD) to Turkish format (DD/MM/YYYY) for comparison
      const endDate = new Date(end_date as string);
      const endDateTurkish = `${endDate.getDate().toString().padStart(2, '0')}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}/${endDate.getFullYear()}`;
      whereConditions.push(`
        DATE(
          substr(payment_date, 7, 4) || '-' || 
          substr(payment_date, 4, 2) || '-' || 
          substr(payment_date, 1, 2)
        ) <= DATE(?)
      `);
      params.push(end_date);
      console.log(`Filtering payments to date: ${end_date} (${endDateTurkish})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort parameters
    const validSortColumns = ['payment_date', 'customer_name', 'project_name', 'amount_paid', 'payment_method'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'payment_date';
    const sortDirection = validSortOrders.includes((sort_order as string).toUpperCase()) ? 
      (sort_order as string).toUpperCase() : 'DESC';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM payments ${whereClause}`;
    const countResult = await db.get(countQuery, params);
    const totalRecords = countResult.total;

    // Calculate pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(totalRecords / limitNum);

    // Get paginated payments
    const paymentsQuery = `
      SELECT 
        id,
        payment_date,
        customer_name,
        project_name,
        amount_paid,
        currency_paid,
        payment_method,
        exchange_rate,
        payment_date as exchange_rate_date, -- Using payment_date as exchange_rate_date
        year,
        month,
        CASE 
          WHEN currency_paid = 'USD' THEN amount_paid 
          WHEN currency_paid = 'TL' OR currency_paid = 'TRY' THEN amount_paid * 0.029
          WHEN currency_paid = 'EUR' THEN amount_paid * 1.1
          ELSE amount_paid * 0.029
        END as amount_usd
      FROM payments 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `;

    const payments = await db.all(paymentsQuery, [...params, limitNum, offset]);

    // Get filter options for dropdowns
    const paymentMethods = await db.all(`
      SELECT DISTINCT payment_method 
      FROM payments 
      WHERE payment_method IS NOT NULL AND payment_method != ''
      ORDER BY payment_method
    `);

    const currencies = await db.all(`
      SELECT DISTINCT currency_paid 
      FROM payments 
      WHERE currency_paid IS NOT NULL AND currency_paid != ''
      ORDER BY currency_paid
    `);

    const projects = await db.all(`
      SELECT DISTINCT project_name 
      FROM payments 
      WHERE project_name IS NOT NULL AND project_name != ''
      ORDER BY project_name
    `);

    const customers = await db.all(`
      SELECT DISTINCT customer_name 
      FROM payments 
      WHERE customer_name IS NOT NULL AND customer_name != ''
      ORDER BY customer_name
    `);

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total_records: totalRecords,
          total_pages: totalPages,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1
        },
        filters: {
          payment_methods: paymentMethods.map(p => p.payment_method),
          currencies: currencies.map(c => c.currency_paid),
          projects: projects.map(p => p.project_name),
          customers: customers.map(c => c.customer_name)
        }
      }
    });

  } catch (error) {
    console.error('Payments API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}