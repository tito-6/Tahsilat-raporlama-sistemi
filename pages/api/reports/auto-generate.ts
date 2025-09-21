import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // First check if we have any payments at all
    const paymentCount = await db.get('SELECT COUNT(*) as count FROM payments');
    
    if (!paymentCount || paymentCount.count === 0) {
      await db.close();
      return res.status(400).json({
        success: false,
        error: 'No payment data found to generate reports'
      });
    }

    // Get date range of all payments
    const dateRange = await db.get(`
      SELECT 
        MIN(payment_date) as first_payment,
        MAX(payment_date) as last_payment,
        COUNT(*) as total_payments
      FROM payments
      WHERE payment_date IS NOT NULL AND payment_date != ''
    `);

    console.log('Date range query result:', dateRange);

    if (!dateRange || !dateRange.first_payment || !dateRange.last_payment || dateRange.total_payments === 0) {
      await db.close();
      return res.status(400).json({
        success: false,
        error: 'No valid payment dates found to generate reports',
        debug_info: {
          dateRange,
          total_payments: dateRange?.total_payments || 0
        }
      });
    }

    // Use Turkish date parsing
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

    // Generate weekly reports by checking which weeks have data
    const weeklyReports = [];
    let currentDate = getMonday(firstPaymentDate);

    while (currentDate <= lastPaymentDate) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const startDate = weekStart.toISOString().split('T')[0];
      const endDate = weekEnd.toISOString().split('T')[0];

      // Check if this week has any payments
      const weekPaymentCount = await db.get(`
        SELECT COUNT(*) as count 
        FROM payments 
        WHERE payment_date >= ? AND payment_date <= ?
      `, [startDate, endDate]);

      if (weekPaymentCount && weekPaymentCount.count > 0) {
        // Get the month value (1-12) from the week's start date
        const weekMonth = weekStart.getMonth() + 1;
        
        // Create the weekly report entry
        const weekReport = {
          week_number: getWeekNumber(weekStart),
          week_start: startDate,
          week_end: endDate,
          year: weekStart.getFullYear(),
          month: weekMonth,
          formatted_date: formatWeekRange(weekStart, weekEnd),
          has_data: true,
          payment_count: weekPaymentCount.count
        };
        
        // Log details for debugging
        console.log(`Generated week report: Week ${weekReport.week_number}, Month: ${weekMonth} (${getMonthName(weekMonth)}), Year: ${weekReport.year}`);
        
        weeklyReports.push(weekReport);
      }

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        total_weeks_with_data: weeklyReports.length,
        total_payments: dateRange.total_payments,
        date_range: {
          first_payment: dateRange.first_payment,
          last_payment: dateRange.last_payment
        },
        weekly_reports: weeklyReports
      },
      message: `Found ${weeklyReports.length} weeks with payment data (${dateRange.total_payments} total payments)`
    });

  } catch (error) {
    console.error('Auto-generate reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-generate weekly reports',
      message: error instanceof Error ? error.message : String(error)
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