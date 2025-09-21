import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as XLSX from 'xlsx';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Similar parsing functions as in excel.ts
function parseDate(dateValue: any): string | null {
  if (!dateValue) return null;
  
  try {
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) {
        return null;
      }
      return dateValue.toISOString().split('T')[0];
    }
    
    const dateString = String(dateValue);
    
    if (!dateString.trim()) return null;
    
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
          return `${parsedYear}-${parsedMonth.toString().padStart(2, '0')}-${parsedDay.toString().padStart(2, '0')}`;
        }
      }
    }
    
    if (!isNaN(Number(dateString))) {
      const excelEpoch = new Date(1899, 11, 30);
      const daysSinceEpoch = Number(dateString);
      if (daysSinceEpoch > 1000) {
        const date = new Date(excelEpoch);
        date.setDate(date.getDate() + daysSinceEpoch);
        if (!isNaN(date.getTime())) {
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

function parseAmount(amountStr: string | number): number {
  if (typeof amountStr === 'number') return amountStr;
  if (!amountStr) return 0;
  
  const cleanAmount = amountStr.toString().replace(/[^\d.,]/g, '');
  return parseFloat(cleanAmount.replace(',', '.')) || 0;
}

// Define the threshold for fuzzy matching dates and amounts
const DATE_RANGE_DAYS = 2;  // Consider payments within 2 days as potential duplicates
const AMOUNT_THRESHOLD = 0.05; // 5% difference in amount is considered a potential duplicate

interface PaymentData {
  customer_name: string;
  payment_date: string;
  amount_paid: number;
  currency_paid: string;
  project_name?: string;
}

async function checkDuplicates(importData: any[]): Promise<{
  potentialDuplicates: Array<{
    importRow: any;
    existingPayment: any;
    similarityReasons: string[];
  }>;
  nonDuplicates: any[];
}> {
  const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  const result = {
    potentialDuplicates: [] as Array<{
      importRow: any;
      existingPayment: any;
      similarityReasons: string[];
    }>,
    nonDuplicates: [] as any[]
  };

  try {
    // Process each row and check for potential duplicates
    for (const row of importData) {
      const paymentDate = parseDate(row['Tarih']);
      const amount = parseAmount(row['Ödenen Tutar(Σ:12,438,088.23)']);
      const currency = row['Ödenen Döviz'] || 'TRY';
      const customerName = row['Müşteri Adı Soyadı'] || '';
      const projectName = row['Proje Adı'] || '';
      
      // Skip if critical data is missing
      if (!paymentDate || !amount || !customerName) {
        result.nonDuplicates.push(row);
        continue;
      }

      // Calculate date range for fuzzy matching
      const paymentDateObj = new Date(paymentDate);
      const startDate = new Date(paymentDateObj);
      startDate.setDate(paymentDateObj.getDate() - DATE_RANGE_DAYS);
      const endDate = new Date(paymentDateObj);
      endDate.setDate(paymentDateObj.getDate() + DATE_RANGE_DAYS);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Calculate amount range for fuzzy matching
      const minAmount = amount * (1 - AMOUNT_THRESHOLD);
      const maxAmount = amount * (1 + AMOUNT_THRESHOLD);

      // Query for potential duplicates
      const potentialDuplicates = await db.all(`
        SELECT 
          id,
          payment_date,
          customer_name,
          project_name,
          amount_paid,
          currency_paid,
          payment_method,
          description
        FROM payments
        WHERE 
          customer_name = ? AND
          payment_date BETWEEN ? AND ? AND
          currency_paid = ? AND
          amount_paid BETWEEN ? AND ?
      `, [customerName, startDateStr, endDateStr, currency, minAmount, maxAmount]);

      if (potentialDuplicates.length > 0) {
        for (const duplicate of potentialDuplicates) {
          const similarityReasons = [];
          
          // Check why it's considered a duplicate
          if (duplicate.customer_name === customerName) {
            similarityReasons.push('Same customer name');
          }
          
          if (duplicate.payment_date === paymentDate) {
            similarityReasons.push('Exact same payment date');
          } else {
            similarityReasons.push('Similar payment date (within 2 days)');
          }
          
          if (Math.abs(duplicate.amount_paid - amount) < 0.01) {
            similarityReasons.push('Exact same amount');
          } else {
            similarityReasons.push('Similar amount (within 5%)');
          }
          
          if (projectName && duplicate.project_name === projectName) {
            similarityReasons.push('Same project name');
          }
          
          result.potentialDuplicates.push({
            importRow: row,
            existingPayment: duplicate,
            similarityReasons
          });
        }
      } else {
        result.nonDuplicates.push(row);
      }
    }
  } catch (error) {
    console.error('Error checking duplicates:', error);
  } finally {
    await db.close();
  }
  
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'tmp'),
      keepExtensions: true,
    });

    // Create tmp directory if it doesn't exist
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the Excel file
    const workbook = XLSX.readFile(file.filepath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in Excel file' });
    }

    // Check for potential duplicates
    const duplicateCheckResult = await checkDuplicates(jsonData);

    // Store the file path for later use during actual import
    const sessionId = Date.now().toString();
    const result = {
      sessionId,
      filePath: file.filepath,
      totalRows: jsonData.length,
      potentialDuplicates: duplicateCheckResult.potentialDuplicates,
      nonDuplicates: duplicateCheckResult.nonDuplicates,
      hasDuplicates: duplicateCheckResult.potentialDuplicates.length > 0
    };

    // Return the result (don't delete the file yet, we'll need it for actual import)
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Duplicate check error:', error);
    res.status(500).json({
      success: false,
      error: 'Duplicate check failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}