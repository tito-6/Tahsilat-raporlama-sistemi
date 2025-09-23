import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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

  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const startDate = start_date as string;
  const endDate = end_date as string;

  console.log('Turkish Weekly Report - Date Range:', startDate, 'to', endDate);

  let db: any = null;

  try {
    // Open database connection
    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Get all individual payment records - NOT grouped by customer-project
    const individualPayments = await db.all(`
      SELECT 
        id,
        customer_name,
        project_name
      FROM payments 
      WHERE date(
        CASE 
          WHEN payment_date LIKE '%/%/%' THEN 
            substr(payment_date, 7, 4) || '-' || 
            substr('0' || substr(payment_date, 4, 2), -2, 2) || '-' || 
            substr('0' || substr(payment_date, 1, 2), -2, 2)
          ELSE payment_date
        END
      ) BETWEEN date(?) AND date(?)
      ORDER BY customer_name, project_name, id
    `, [startDate, endDate]);

    // Get daily payments for each individual payment record
    const weeklyReport = [];
    let serialNo = 1;

    // Create date map for the week
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const dayMap = getDayMapForWeek(startDateObj, endDateObj);

    // Check which payment methods are used in this week
    const paymentMethods = await db.all(`
      SELECT DISTINCT payment_method
      FROM payments
      WHERE date(
        CASE 
          WHEN payment_date LIKE '%/%/%' THEN 
            substr(payment_date, 7, 4) || '-' || 
            substr('0' || substr(payment_date, 4, 2), -2, 2) || '-' || 
            substr('0' || substr(payment_date, 1, 2), -2, 2)
          ELSE payment_date
        END
      ) BETWEEN date(?) AND date(?)
      AND payment_method IS NOT NULL AND payment_method != ''
    `, [startDate, endDate]);

    // The default payment method to display if multiple are found
    const paymentMethodLabel = paymentMethods.length === 1 
      ? translatePaymentMethod(paymentMethods[0].payment_method)
      : "Banka Havalesi-Nakit"; // Default to Bank Transfer-Cash if multiple methods

    // Get payment methods count
    const paymentMethodCount: Record<string, number> = {};
    for (const method of paymentMethods) {
      const count = await db.get(`
        SELECT COUNT(*) as count
        FROM payments
        WHERE date(
          CASE 
            WHEN payment_date LIKE '%/%/%' THEN 
              substr(payment_date, 7, 4) || '-' || 
              substr('0' || substr(payment_date, 4, 2), -2, 2) || '-' || 
              substr('0' || substr(payment_date, 1, 2), -2, 2)
            ELSE payment_date
          END
        ) BETWEEN date(?) AND date(?)
        AND payment_method = ?
      `, [startDate, endDate, method.payment_method]);
      
      paymentMethodCount[method.payment_method] = count.count;
    }

    for (const { id, customer_name, project_name } of individualPayments) {
      // Get payments for this specific payment record ID
      const dailyPayments = await db.all(`
        SELECT 
          payment_date,
          currency_paid,
          amount_paid,
          exchange_rate,
          payment_method
        FROM payments 
        WHERE id = ?
      `, [id]);

      // Process daily data into weekly structure with Turkish day names
      const weekData = {
        sira_no: serialNo++,
        musteri_adi: customer_name,
        proje: project_name,
        pazartesi: { tl: 0, usd: 0, original_currency: '', date: dayMap.pazartesi },
        sali: { tl: 0, usd: 0, original_currency: '', date: dayMap.sali },
        carsamba: { tl: 0, usd: 0, original_currency: '', date: dayMap.carsamba },
        persembe: { tl: 0, usd: 0, original_currency: '', date: dayMap.persembe },
        cuma: { tl: 0, usd: 0, original_currency: '', date: dayMap.cuma },
        cumartesi: { tl: 0, usd: 0, original_currency: '', date: dayMap.cumartesi },
        pazar: { tl: 0, usd: 0, original_currency: '', date: dayMap.pazar },
        genel_toplam: { tl: 0, usd: 0, original_currencies: [] as string[] }
      };

      // Map day names in Turkish
      const dayNames = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];

      dailyPayments.forEach((payment: any) => {
        const paymentDate = parseTurkishDate(payment.payment_date);
        const dayIndex = paymentDate.getDay();
        const dayName = dayNames[dayIndex];

        if (weekData[dayName as keyof typeof weekData] && dayName !== 'sira_no' && dayName !== 'musteri_adi' && dayName !== 'proje' && dayName !== 'genel_toplam') {
          const dayData = (weekData as any)[dayName];

          // Convert amounts based on currency
          if (payment.currency_paid === 'TRY' || payment.currency_paid === 'TL') {
            dayData.tl += payment.amount_paid;
            dayData.usd += payment.amount_paid / (payment.exchange_rate || 50);
          } else if (payment.currency_paid === 'USD') {
            dayData.usd += payment.amount_paid;
            dayData.tl += payment.amount_paid * (payment.exchange_rate || 50);
          } else if (payment.currency_paid === 'EUR') {
            dayData.usd += payment.amount_paid * 1.1;
            dayData.tl += payment.amount_paid * 1.1 * (payment.exchange_rate || 50);
          }

          dayData.original_currency = payment.currency_paid;

          // Update totals
          weekData.genel_toplam.tl += payment.currency_paid === 'TRY' || payment.currency_paid === 'TL' ? payment.amount_paid : payment.amount_paid * (payment.exchange_rate || 50);
          weekData.genel_toplam.usd += payment.currency_paid === 'USD' ? payment.amount_paid : payment.amount_paid / (payment.exchange_rate || 50);
          weekData.genel_toplam.original_currencies.push(payment.currency_paid);
        }
      });

      weeklyReport.push(weekData);
    }

    // Calculate week totals
    const weekTotals = calculateWeekTotals(weeklyReport);

    // Get company name from settings or use default
    const companyName = getCompanyName();
    console.log('Using default company name');

    // Get check payments (payments with method = 'Check')
    const checkPayments = await getCheckPayments(db, startDate, endDate);
    const checkTotals = calculateCheckTotals(checkPayments);

    const response = {
      success: true,
      data: {
        report_title: `${companyName} TAHSİLATLAR TABLOSU`,
        date_range: `${format(startDateObj, 'dd.MM', { locale: tr })}-${format(endDateObj, 'dd.MM.yyyy', { locale: tr })}`,
        payment_method: paymentMethodLabel,
        payment_methods: paymentMethodCount,
        weekly_report: weeklyReport,
        week_totals: weekTotals,
        check_payments: checkPayments,
        check_totals: checkTotals,
        period: {
          start_date: startDate,
          end_date: endDate,
          week_number: getWeekNumber(startDateObj)
        },
        day_map: dayMap
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error generating Turkish weekly report:', error);
    return res.status(500).json({ 
      error: 'Failed to generate Turkish weekly report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (db) {
      await db.close();
    }
  }
}

// Helper functions (these would be the same as in the original file)
function getDayMapForWeek(startDate: Date, endDate: Date) {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const map: any = {};
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayIndex = d.getDay();
    const dayName = days[dayIndex].toLowerCase();
    map[dayName] = format(d, 'dd.MM.yyyy', { locale: tr });
  }
  
  return map;
}

function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    'Bank Transfer': 'Banka Havalesi',
    'Cash': 'Nakit',
    'Check': 'Çek',
    'Credit Card': 'Kredi Kartı'
  };
  return translations[method] || method;
}

function calculateWeekTotals(weeklyReport: any[]) {
  const totals: any = {
    sira_no: 'TOPLAM',
    musteri_adi: '',
    proje: '',
    pazartesi: { tl: 0, usd: 0, original_currency: '', date: '' },
    sali: { tl: 0, usd: 0, original_currency: '', date: '' },
    carsamba: { tl: 0, usd: 0, original_currency: '', date: '' },
    persembe: { tl: 0, usd: 0, original_currency: '', date: '' },
    cuma: { tl: 0, usd: 0, original_currency: '', date: '' },
    cumartesi: { tl: 0, usd: 0, original_currency: '', date: '' },
    pazar: { tl: 0, usd: 0, original_currency: '', date: '' },
    genel_toplam: { tl: 0, usd: 0, original_currencies: '' }
  };

  weeklyReport.forEach(row => {
    ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].forEach(day => {
      totals[day].tl += row[day].tl || 0;
      totals[day].usd += row[day].usd || 0;
      if (!totals[day].date) totals[day].date = row[day].date;
    });
    
    totals.genel_toplam.tl += row.genel_toplam.tl || 0;
    totals.genel_toplam.usd += row.genel_toplam.usd || 0;
  });

  return totals;
}

function getCompanyName(): string {
  return "MODEL KUYUM-MODEL SANAYİ MERKEZİ";
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

async function getCheckPayments(db: any, startDate: string, endDate: string) {
  const checkPayments = await db.all(`
    SELECT 
      id,
      customer_name,
      project_name
    FROM payments 
    WHERE date(
      CASE 
        WHEN payment_date LIKE '%/%/%' THEN 
          substr(payment_date, 7, 4) || '-' || 
          substr('0' || substr(payment_date, 4, 2), -2, 2) || '-' || 
          substr('0' || substr(payment_date, 1, 2), -2, 2)
        ELSE payment_date
      END
    ) BETWEEN date(?) AND date(?)
    AND payment_method = 'Check'
    ORDER BY customer_name, project_name, id
  `, [startDate, endDate]);

  const result = [];
  let serialNo = 1;
  const dayMap = getDayMapForWeek(new Date(startDate), new Date(endDate));

  for (const { id, customer_name, project_name } of checkPayments) {
    const payment = await db.get(`
      SELECT 
        payment_date,
        currency_paid,
        amount_paid,
        exchange_rate
      FROM payments 
      WHERE id = ?
    `, [id]);

    if (payment) {
      const weekData = {
        sira_no: serialNo++,
        musteri_adi: customer_name,
        proje: project_name,
        pazartesi: { tl: 0, usd: 0, original_currency: '' },
        sali: { tl: 0, usd: 0, original_currency: '' },
        carsamba: { tl: 0, usd: 0, original_currency: '' },
        persembe: { tl: 0, usd: 0, original_currency: '' },
        cuma: { tl: 0, usd: 0, original_currency: '' },
        cumartesi: { tl: 0, usd: 0, original_currency: '' },
        pazar: { tl: 0, usd: 0, original_currency: '' },
        genel_toplam: { tl: 0, usd: 0, original_currencies: [] as string[] }
      };

      const dayNames = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
      const paymentDate = parseTurkishDate(payment.payment_date);
      const dayIndex = paymentDate.getDay();
      const dayName = dayNames[dayIndex];

      if (weekData[dayName as keyof typeof weekData] && dayName !== 'sira_no' && dayName !== 'musteri_adi' && dayName !== 'proje' && dayName !== 'genel_toplam') {
        const dayData = (weekData as any)[dayName];

        if (payment.currency_paid === 'TRY' || payment.currency_paid === 'TL') {
          dayData.tl = payment.amount_paid;
          dayData.usd = payment.amount_paid / (payment.exchange_rate || 50);
        } else if (payment.currency_paid === 'USD') {
          dayData.usd = payment.amount_paid;
          dayData.tl = payment.amount_paid * (payment.exchange_rate || 50);
        }

        dayData.original_currency = payment.currency_paid;

        weekData.genel_toplam.tl = dayData.tl;
        weekData.genel_toplam.usd = dayData.usd;
        weekData.genel_toplam.original_currencies = [payment.currency_paid];
      }

      result.push(weekData);
    }
  }

  return result;
}

function calculateCheckTotals(checkPayments: any[]) {
  const totals: any = {
    sira_no: 'TOPLAM',
    musteri_adi: '',
    proje: '',
    pazartesi: { tl: 0, usd: 0, original_currency: '', date: '' },
    sali: { tl: 0, usd: 0, original_currency: '', date: '' },
    carsamba: { tl: 0, usd: 0, original_currency: '', date: '' },
    persembe: { tl: 0, usd: 0, original_currency: '', date: '' },
    cuma: { tl: 0, usd: 0, original_currency: '', date: '' },
    cumartesi: { tl: 0, usd: 0, original_currency: '', date: '' },
    pazar: { tl: 0, usd: 0, original_currency: '', date: '' },
    genel_toplam: { tl: 0, usd: 0, original_currencies: '' }
  };

  checkPayments.forEach(row => {
    ['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].forEach(day => {
      totals[day].tl += row[day].tl || 0;
      totals[day].usd += row[day].usd || 0;
    });
    
    totals.genel_toplam.tl += row.genel_toplam.tl || 0;
    totals.genel_toplam.usd += row.genel_toplam.usd || 0;
  });

  return totals;
}