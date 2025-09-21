import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Get unique customers and projects for the week
    const customersProjects = await db.all(`
      SELECT DISTINCT 
        customer_name,
        project_name
      FROM payments 
      WHERE payment_date BETWEEN ? AND ?
      ORDER BY customer_name, project_name
    `, [start_date, end_date]);

    // Get daily payments for each customer-project combination
    const weeklyReport = [];
    let serialNo = 1;

    for (const { customer_name, project_name } of customersProjects) {
      // Get payments for each day of the week for this customer-project
      const dailyPayments = await db.all(`
        SELECT 
          payment_date,
          currency_paid,
          SUM(amount_paid) as daily_amount,
          SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as daily_amount_usd
        FROM payments 
        WHERE payment_date BETWEEN ? AND ? 
          AND customer_name = ? 
          AND project_name = ?
        GROUP BY payment_date, currency_paid
        ORDER BY payment_date
      `, [start_date, end_date, customer_name, project_name]);

      // Process daily data into weekly structure
      const weekData = {
        sira_no: serialNo++,
        musteri_adi: customer_name,
        proje: project_name,
        pazartesi: { tl: 0, usd: 0 },
        sali: { tl: 0, usd: 0 },
        carsamba: { tl: 0, usd: 0 },
        persembe: { tl: 0, usd: 0 },
        cuma: { tl: 0, usd: 0 },
        cumartesi: { tl: 0, usd: 0 },
        pazar: { tl: 0, usd: 0 },
        genel_toplam: { tl: 0, usd: 0 }
      };

      // Map day names in Turkish
      const dayNames = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];

      dailyPayments.forEach(payment => {
        const paymentDate = parseTurkishDate(payment.payment_date);
        const dayIndex = paymentDate.getDay();
        const dayName = dayNames[dayIndex];

        if (payment.currency_paid === 'TRY' || payment.currency_paid === 'TL') {
          (weekData as any)[dayName].tl += payment.daily_amount;
        } else if (payment.currency_paid === 'USD') {
          (weekData as any)[dayName].usd += payment.daily_amount;
        }

        // Add to total
        weekData.genel_toplam.tl += payment.currency_paid === 'TRY' || payment.currency_paid === 'TL' ? payment.daily_amount : 0;
        weekData.genel_toplam.usd += payment.daily_amount_usd;
      });

      weeklyReport.push(weekData);
    }

    // Calculate week totals
    const weekTotals = {
      sira_no: 'TOPLAM',
      musteri_adi: '',
      proje: '',
      pazartesi: { tl: 0, usd: 0 },
      sali: { tl: 0, usd: 0 },
      carsamba: { tl: 0, usd: 0 },
      persembe: { tl: 0, usd: 0 },
      cuma: { tl: 0, usd: 0 },
      cumartesi: { tl: 0, usd: 0 },
      pazar: { tl: 0, usd: 0 },
      genel_toplam: { tl: 0, usd: 0 }
    };

    weeklyReport.forEach(row => {
      ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].forEach(day => {
        (weekTotals as any)[day].tl += (row as any)[day].tl;
        (weekTotals as any)[day].usd += (row as any)[day].usd;
      });
      weekTotals.genel_toplam.tl += row.genel_toplam.tl;
      weekTotals.genel_toplam.usd += row.genel_toplam.usd;
    });

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        weekly_report: weeklyReport,
        week_totals: weekTotals,
        period: {
          start_date,
          end_date,
          week_number: getWeekNumber(new Date(start_date as string))
        }
      }
    });

  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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