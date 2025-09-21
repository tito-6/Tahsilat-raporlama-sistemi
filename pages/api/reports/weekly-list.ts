import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set a longer timeout for this request
  res.setHeader('Connection', 'keep-alive');
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  let db: any = null;
  
  try {
    // Call auto-generate endpoint if force parameter is provided
    if (req.query.force === 'true') {
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : (req.headers.origin || 'http://localhost:3000');
        
        console.log('Regenerating reports from:', `${baseUrl}/api/reports/auto-generate`);
        
        const regenerateRes = await fetch(`${baseUrl}/api/reports/auto-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ force: true })
        });
        
        if (!regenerateRes.ok) {
          console.warn('Auto-generate response was not successful:', await regenerateRes.text());
        }
      } catch (error) {
        console.error('Error forcing report generation:', error);
        // Continue execution even if regeneration fails
      }
    }

    // Get date range of all payments
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Add timeout to the database connection
    await db.run('PRAGMA busy_timeout = 5000');
    
    // First check if we have any payments
    const paymentCount = await db.get('SELECT COUNT(*) as count FROM payments WHERE payment_date IS NOT NULL AND payment_date != ""');
    
    if (!paymentCount || paymentCount.count === 0) {
      await db.close();
      return res.status(200).json({
        success: true,
        data: {
          weekly_reports: []
        },
        message: 'No payment data found in the database'
      });
    }

    const dateRange = await db.get(`
      SELECT 
        MIN(payment_date) as first_payment,
        MAX(payment_date) as last_payment
      FROM payments
      WHERE payment_date IS NOT NULL AND payment_date != ''
    `);

    console.log('Weekly-list dateRange:', dateRange);

    if (!dateRange || !dateRange.first_payment || !dateRange.last_payment) {
      await db.close();
      return res.status(200).json({
        success: true,
        data: {
          weekly_reports: []
        },
        message: 'No valid payment dates found'
      });
    }

    // Parse dates using our Turkish date parsing helper
    const firstPaymentDate = parseTurkishDate(dateRange.first_payment);
    const lastPaymentDate = parseTurkishDate(dateRange.last_payment);

    console.log('Weekly-list parsing dates:', {
      first_raw: dateRange.first_payment,
      last_raw: dateRange.last_payment,
      first_parsed: firstPaymentDate,
      last_parsed: lastPaymentDate,
      first_valid: !isNaN(firstPaymentDate.getTime()),
      last_valid: !isNaN(lastPaymentDate.getTime()),
      first_iso: firstPaymentDate.toISOString(),
      last_iso: lastPaymentDate.toISOString()
    });

    // Validate parsed dates
    if (isNaN(firstPaymentDate.getTime()) || isNaN(lastPaymentDate.getTime())) {
      await db.close();
      return res.status(200).json({
        success: true,
        data: {
          weekly_reports: []
        },
        message: 'Invalid payment dates in database'
      });
    }

    // Generate week ranges
    const weekRanges = [];
    let currentDate = getMonday(firstPaymentDate);
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    // Only include weeks from last year and current year for performance
    while (currentDate <= lastPaymentDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // Only include recent years for performance reasons
      if (weekStart.getFullYear() >= lastYear) {
        // Add month value (1-12) based on the week's start date
        const weekMonth = weekStart.getMonth() + 1;
        
        weekRanges.push({
          week_number: getWeekNumber(weekStart),
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          year: weekStart.getFullYear(),
          month: weekMonth, // Add month information (1-12 format)
          formatted_date: formatWeekRange(weekStart, weekEnd),
          has_data: false
        });
      }

      // Add month information for each week (based on start date)
      const weekMonth = currentDate.getMonth() + 1; // 1-12 format
      const monthName = getMonthName(weekMonth);
      
      console.log(`Week ${weekRanges[weekRanges.length-1].week_number}: month=${weekMonth} (${monthName}), week_start=${weekRanges[weekRanges.length-1].week_start}`);
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    // For performance, use a single query to get counts for all week ranges
    if (weekRanges.length > 0) {
      const placeholders = weekRanges.map(() => '(?,?)').join(',');
      const params = weekRanges.flatMap(week => [week.week_start, week.week_end]);
      
      // Build a query that converts payment dates to ISO format for comparison
      const query = `
        WITH ranges(start_date, end_date) AS (
          VALUES ${placeholders}
        )
        SELECT 
          ranges.start_date,
          ranges.end_date,
          COUNT(payments.id) as count
        FROM ranges
        LEFT JOIN payments ON 
          date(
            CASE 
              WHEN payment_date LIKE '%/%/%' THEN 
                substr(payment_date, 7, 4) || '-' || 
                substr('0' || substr(payment_date, 4, 2), -2, 2) || '-' || 
                substr('0' || substr(payment_date, 1, 2), -2, 2)
              ELSE payment_date
            END
          ) BETWEEN date(ranges.start_date) AND date(ranges.end_date)
        GROUP BY ranges.start_date, ranges.end_date
      `;
      
      const results = await db.all(query, ...params);
      
      // Update the has_data flag for each week range
      for (const result of results) {
        const weekRange = weekRanges.find(
          w => w.week_start === result.start_date && w.week_end === result.end_date
        );
        if (weekRange) {
          weekRange.has_data = result.count > 0;
        }
      }
    }

    await db.close();
    db = null;

    res.status(200).json({
      success: true,
      data: {
        weekly_reports: weekRanges,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Weekly reports list error:', error);
    
    // Close DB connection if still open
    if (db) {
      try {
        await db.close();
      } catch (closeErr) {
        console.error('Error closing database connection:', closeErr);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly reports',
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}

// Helper function to get Monday of the week for a given date
function getMonday(date: Date): Date {
  const monday = new Date(date);
  const dayOfWeek = monday.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
  monday.setDate(monday.getDate() - daysToSubtract);
  return monday;
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to format week range (DD.MM-DD.MM.YYYY)
function formatWeekRange(startDate: Date, endDate: Date): string {
  const startDay = startDate.getDate().toString().padStart(2, '0');
  const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');
  
  const endDay = endDate.getDate().toString().padStart(2, '0');
  const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
  const endYear = endDate.getFullYear();
  
  return `${startDay}.${startMonth}-${endDay}.${endMonth}.${endYear}`;
}

// Parse Turkish date format (DD/MM/YYYY) correctly
function parseTurkishDate(dateString: string): Date {
  if (!dateString) return new Date(0);
  
  // Handle YYYY-MM-DD format (stored in DB)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }
  
  // Handle DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-based
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Fallback to standard parsing
  return new Date(dateString);
}

// Helper function to get month name from numeric value (1-12)
function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Convert 1-based month (1-12) to 0-based index (0-11)
  const monthIndex = month - 1;
  
  if (monthIndex >= 0 && monthIndex < 12) {
    return monthNames[monthIndex];
  }
  
  return `Invalid month: ${month}`;
}