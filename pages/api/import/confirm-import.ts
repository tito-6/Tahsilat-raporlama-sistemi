import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as XLSX from 'xlsx';
import fs from 'fs';

// Field mapping from Turkish Excel headers to database fields
const FIELD_MAPPING = {
  'Müşteri Adı Soyadı': 'customer_name',
  'Satış Personeli': 'sales_person',
  'Aktivite No(87)': 'activity_no',
  'Tarih': 'payment_date',
  'Tahsilat Şekli': 'payment_method',
  'Hesap Adı': 'account_name',
  'Alacak Tutarı(Σ:1,662,805.42)': 'amount_due',
  'Alacak Dovizi': 'currency_due',
  'Ödenen Tutar(Σ:12,438,088.23)': 'amount_paid',
  'Ödenen Döviz': 'currency_paid',
  'Ödenen Kur(Σ:57.25)': 'exchange_rate',
  'Kapora Mı ?': 'is_deposit',
  'Yıl': 'year',
  'Ay': 'month',
  'Açıklama': 'description',
  'Blok No - Daire No': 'property_units',
  'Proje Adı': 'project_name',
  'Hesap Açıklama': 'account_description',
  'Çek Vade Tarihi': 'check_due_date',
  'Acenta Adı': 'agency_name',
  'Durum': 'status'
};

// Payment method mapping
const PAYMENT_METHOD_MAPPING = {
  'Nakit': 'Cash',
  'Banka Havalesi': 'Bank Transfer', 
  'Çek': 'Check',
  'Kredi Kartı': 'Credit Card'
};

// NOTE: This parseAmount function may also be redundant if the Python backend
// already normalizes numeric values. Consider removing once Python backend
// handles all numeric parsing.
function parseAmount(amountStr: string | number): number {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  
  const cleanAmount = amountStr.toString().replace(/[^\d.,]/g, '');
  return parseFloat(cleanAmount.replace(',', '.')) || 0;
}

// Date parsing function to handle Excel date formats and convert to ISO format
function parseDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  try {
    // If it's already a string in ISO format (YYYY-MM-DD), use it directly
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        return null;
      }
      // Convert to ISO format (YYYY-MM-DD) for consistency
      return dateValue.toISOString().split('T')[0];
    }
    
    const dateString = String(dateValue);
    
    if (!dateString.trim()) return null;
    
    // Handle DD/MM/YYYY format (Turkish format from Excel)
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const parsedYear = parseInt(year);
        const parsedMonth = parseInt(month);
        const parsedDay = parseInt(day);
        
        if (parsedYear >= 1900 && parsedYear <= 2100 && 
            parsedMonth >= 1 && parsedMonth <= 12 && 
            parsedDay >= 1 && parsedDay <= 31) {
          // Convert to ISO format (YYYY-MM-DD)
          return `${parsedYear}-${parsedMonth.toString().padStart(2, '0')}-${parsedDay.toString().padStart(2, '0')}`;
        }
      }
    }
    
    // Handle Excel numeric dates
    if (!isNaN(Number(dateString))) {
      const excelEpoch = new Date(1899, 11, 30);
      const daysSinceEpoch = Number(dateString);
      if (daysSinceEpoch > 1000) {
        const date = new Date(excelEpoch);
        date.setDate(date.getDate() + daysSinceEpoch);
        if (!isNaN(date.getTime())) {
          // Convert to ISO format (YYYY-MM-DD)
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    console.error('Failed to parse date:', dateValue);
    return null;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
}

async function insertPaymentData(data: any[]) {
  const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const results: {
    inserted: number;
    errors: string[];
  } = {
    inserted: 0,
    errors: []
  };

  try {
    await db.exec('BEGIN TRANSACTION');

    for (const row of data) {
      try {
        // DEBUG: Log the raw row data to understand what we're receiving
        console.log('DEBUG: Raw row data keys:', Object.keys(row));
        console.log('DEBUG: Raw payment_date value:', row['payment_date'], 'Type:', typeof row['payment_date']);
        console.log('DEBUG: Raw Tarih value:', row['Tarih'], 'Type:', typeof row['Tarih']);

        // Map the fields
        const paymentMethod = row['payment_method'] || row['Tahsilat Şekli'] as string;
        const mappedData = {
          customer_name: row['customer_name'] || row['Müşteri Adı Soyadı'] || '',
          sales_person: row['sales_person'] || row['Satış Personeli'] || '',
          activity_no: row['activity_no'] || row['Aktivite No(87)'] || '',
          // Process date from either Python backend (payment_date) or raw Excel (Tarih)
          payment_date: parseDate(row['payment_date'] || row['Tarih']) || null,
          payment_method: PAYMENT_METHOD_MAPPING[paymentMethod as keyof typeof PAYMENT_METHOD_MAPPING] || paymentMethod || '',
          account_name: row['account_name'] || row['Hesap Adı'] || '',
          amount_due: parseAmount(row['amount_due'] || row['Alacak Tutarı(Σ:1,662,805.42)']),
          currency_due: row['currency_due'] || row['Alacak Dovizi'] || 'TRY',
          amount_paid: parseAmount(row['amount_paid'] || row['Ödenen Tutar(Σ:12,438,088.23)']),
          currency_paid: row['currency_paid'] || row['Ödenen Döviz'] || 'TRY',
          exchange_rate: parseAmount(row['exchange_rate'] || row['Ödenen Kur(Σ:57.25)']),
          is_deposit: (row['is_deposit'] === true || row['is_deposit'] === 1 || row['Kapora Mı ?'] === 'TRUE') ? 1 : 0,
          year: parseInt(row['year'] || row['Yıl']) || new Date().getFullYear(),
          month: parseInt(row['month'] || row['Ay']) || new Date().getMonth() + 1,
          description: row['description'] || row['Açıklama'] || '',
          property_units: row['property_units'] || row['Blok No - Daire No'] || '',
          project_name: row['project_name'] || row['Proje Adı'] || '',
          account_description: row['account_description'] || row['Hesap Açıklama'] || '',
          // Process check due date from either normalized data or raw Excel
          check_due_date: parseDate(row['check_due_date'] || row['Çek Vade Tarihi']) || null,
          agency_name: row['agency_name'] || row['Acenta Adı'] || '',
          status: row['status'] || row['Durum'] || '',
          is_duplicate_confirmed: row._isDuplicateConfirmed ? 1 : 0,  // Flag for confirmed duplicates
        };

        // CRITICAL DEBUG: Log the final mapped data before database insertion
        console.log(`DEBUG: About to insert into DB. Row ${results.inserted + 1}:`);
        console.log(`  payment_date: [${mappedData.payment_date}], Type: ${typeof mappedData.payment_date}`);
        console.log(`  customer_name: [${mappedData.customer_name}]`);
        console.log(`  amount_paid: [${mappedData.amount_paid}]`);

        // Insert into payments table
        await db.run(`
          INSERT INTO payments (
            customer_name, sales_person, activity_no, payment_date, payment_method,
            account_name, amount_due, currency_due, amount_paid, currency_paid,
            exchange_rate, is_deposit, year, month, description, property_units,
            project_name, account_description, check_due_date, agency_name, status,
            is_duplicate_confirmed
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          mappedData.customer_name, mappedData.sales_person, mappedData.activity_no,
          mappedData.payment_date, mappedData.payment_method, mappedData.account_name,
          mappedData.amount_due, mappedData.currency_due, mappedData.amount_paid,
          mappedData.currency_paid, mappedData.exchange_rate, mappedData.is_deposit,
          mappedData.year, mappedData.month, mappedData.description,
          mappedData.property_units, mappedData.project_name, mappedData.account_description,
          mappedData.check_due_date, mappedData.agency_name, mappedData.status,
          mappedData.is_duplicate_confirmed
        ]);

        results.inserted++;
      } catch (error) {
        console.error('Error inserting payment:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`Row ${results.inserted + results.errors.length + 1}: ${errorMessage}`);
      }
    }

    await db.exec('COMMIT');
    console.log(`Successfully inserted ${results.inserted} payment records`);
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('Transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.errors.push(`Transaction failed: ${errorMessage}`);
  } finally {
    await db.close();
  }

  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, filePath, rowsToImport } = req.body;

    if (!sessionId || !filePath || !rowsToImport || !Array.isArray(rowsToImport)) {
      return res.status(400).json({ error: 'Invalid request. Missing required parameters.' });
    }

    // Verify the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File not found. The upload session may have expired.' });
    }

    // Insert data into database
    const results = await insertPaymentData(rowsToImport);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Auto-generate weekly reports after successful import
    try {
      const autoGenerateResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/reports/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (autoGenerateResponse.ok) {
        const autoGenerateData = await autoGenerateResponse.json();
        console.log(`Auto-generated ${autoGenerateData.data?.total_weeks || 0} weekly reports`);
      }
    } catch (autoGenError) {
      console.warn('Auto-generation of reports failed:', autoGenError);
      // Don't fail the import if report generation fails
    }

    // Return results
    res.status(200).json({
      success: true,
      message: `Import completed. Inserted ${results.inserted} records. Weekly reports auto-generated.`,
      inserted: results.inserted,
      errors: results.errors,
      totalRows: rowsToImport.length
    });

  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      error: 'Import failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}