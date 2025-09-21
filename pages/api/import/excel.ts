import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to find a column by pattern
function findColumnByPattern(columns: string[], pattern: RegExp): string | null {
  for (const col of columns) {
    if (pattern.test(col)) {
      return col;
    }
  }
  return null;
}

// Dynamic Field mapping from Turkish Excel headers to database fields
// Will be initialized with actual column names from the Excel file
let FIELD_MAPPING: Record<string, string> = {};

// Static field patterns to match against actual Excel headers
const FIELD_PATTERNS = {
  'customer_name': /^Müşteri Adı Soyadı$/i,
  'sales_person': /^Satış Personeli$/i,
  'activity_no': /^Aktivite No/i,
  'payment_date': /^Tarih$/i,
  'payment_method': /^Tahsilat Şekli$/i,
  'account_name': /^Hesap Adı$/i,
  'amount_due': /^Alacak Tutarı/i,
  'currency_due': /^Alacak Dovizi$/i,
  'amount_paid': /^Ödenen Tutar/i,
  'currency_paid': /^Ödenen Döviz$/i,
  'exchange_rate': /^Ödenen Kur/i,
  'is_deposit': /^Kapora Mı/i,
  'year': /^Yıl$/i,
  'month': /^Ay$/i,
  'description': /^Açıklama$/i,
  'property_units': /^Blok No/i,
  'project_name': /^Proje Adı$/i,
  'account_description': /^Hesap Açıklama$/i,
  'check_due_date': /^Çek Vade Tarihi$/i,
  'agency_name': /^Acenta Adı$/i,
  'status': /^Durum$/i
};

// Payment method mapping
const PAYMENT_METHOD_MAPPING = {
  'Nakit': 'Cash',
  'Banka Havalesi': 'Bank Transfer', 
  'Çek': 'Check',
  'Kredi Kartı': 'Credit Card'
};

// Helper function to convert Excel serial date to JavaScript Date
function excelSerialDateToJSDate(serial: number): Date {
  // Excel dates: Days since 1900-01-01 (or 1904-01-01 for Mac)
  const EXCEL_EPOCH_OFFSET = 25569; // Days from 1900-01-01 to 1970-01-01
  const DAY_MS = 24 * 60 * 60 * 1000;
  
  // Convert serial number to JavaScript timestamp
  // Excel stores dates as days since 1/1/1900, JavaScript uses milliseconds since 1/1/1970
  const utcDays = serial - EXCEL_EPOCH_OFFSET;
  const utcValue = utcDays * DAY_MS;
  const date = new Date(utcValue);
  
  return date;
}

function parseDate(dateValue: any): string | null {
  // Handle empty values
  if (dateValue === undefined || dateValue === null || dateValue === '') {
    console.log('DEBUG: Empty date value, returning null');
    return null;
  }
  
  try {
    console.log(`DEBUG: Raw date value:`, dateValue, typeof dateValue);
    
    // If it's already a JavaScript Date object, format it directly
    if (dateValue instanceof Date) {
      // Check if it's a valid date (not Invalid Date)
      if (isNaN(dateValue.getTime())) {
        console.error('DEBUG: Invalid JavaScript Date object, returning null');
        return null;
      }
      const result = dateValue.toISOString().split('T')[0]; // YYYY-MM-DD format
      console.log(`DEBUG: Formatted JS Date: ${result}`);
      return result;
    }
    
    // For numeric values (Excel date serial numbers)
    if (typeof dateValue === 'number' || (!isNaN(Number(dateValue)) && String(dateValue).trim() !== '')) {
      try {
        const numericValue = Number(dateValue);
        
        // Sanity check for reasonable Excel date range (roughly 1900 to 2100)
        if (numericValue < 1 || numericValue > 73000) {
          console.error(`DEBUG: Excel date value out of reasonable range: ${numericValue}, returning null`);
          return null;
        }
        
        // Try multiple conversion methods for Excel dates
        
        // Method 1: Standard conversion with leap year bug fix
        let date = new Date((numericValue - 1) * 24 * 60 * 60 * 1000 + new Date(1900, 0, 1).getTime());
        
        // Fix for Excel leap year bug (1900 is not a leap year, but Excel thinks it is)
        if (numericValue > 59) {
          date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
        }
        
        // If method 1 fails, try method 2
        if (isNaN(date.getTime())) {
          console.log(`DEBUG: Method 1 failed, trying alternative Excel date conversion for ${numericValue}`);
          date = excelSerialDateToJSDate(numericValue);
        }
        
        // Verify the date is valid after all attempts
        if (isNaN(date.getTime())) {
          console.error(`DEBUG: All Excel date conversion methods failed for: ${numericValue}, returning null`);
          return null;
        }
        
        // Format in YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const result = `${year}-${month}-${day}`;
        
        console.log(`DEBUG: Converted Excel numeric date ${dateValue} → ${result}`);
        return result;
      } catch (e) {
        console.error(`DEBUG: Error converting numeric date: ${e}`);
      }
    }
    
    // Handle string values - convert to string if not already
    const dateString = String(dateValue).trim();
    if (dateString === '') {
      return null;
    }
    
    // Try multiple date formats
    
    // First check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.log(`DEBUG: Date already in YYYY-MM-DD format: ${dateString}`);
      return dateString;
    }
    
    // Helper function to try parsing a date string with multiple formats
    const tryParse = (str: string, formats: string[]): Date | null => {
      for (const format of formats) {
        try {
          let parts: string[] = [];
          let year = 0, month = 0, day = 0;
          
          switch (format) {
            case 'DD/MM/YYYY':
              parts = str.split('/');
              if (parts.length === 3) {
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                  return new Date(year, month - 1, day);
                }
              }
              break;
              
            case 'DD.MM.YYYY':
              parts = str.split('.');
              if (parts.length === 3) {
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                  return new Date(year, month - 1, day);
                }
              }
              break;
              
            case 'DD-MM-YYYY':
              parts = str.split('-');
              if (parts.length === 3) {
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                  return new Date(year, month - 1, day);
                }
              }
              break;
              
            case 'MM/DD/YYYY':  // US format
              parts = str.split('/');
              if (parts.length === 3) {
                month = parseInt(parts[0], 10);
                day = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                  return new Date(year, month - 1, day);
                }
              }
              break;
              
            case 'YYYY/MM/DD':
              parts = str.split('/');
              if (parts.length === 3) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
                if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
                  return new Date(year, month - 1, day);
                }
              }
              break;
          }
        } catch (e) {
          // Try next format
        }
      }
      return null;
    };
    
    // Direct check for DD/MM/YYYY format strings
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Basic validation
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        console.log(`DEBUG: Parsed DD/MM/YYYY date directly: ${dateString} → ${result}`);
        return result;
      }
    }
    
    // Try parsing with various formats - Turkish formats first
    const formats = ['DD/MM/YYYY', 'DD.MM.YYYY', 'DD-MM-YYYY', 'YYYY/MM/DD', 'MM/DD/YYYY'];
    const parsedDate = tryParse(dateString, formats);
    
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;
      console.log(`DEBUG: Parsed string date ${dateString} → ${result}`);
      return result;
    }
    
    // Last resort: try to fix Excel date that might have been incorrectly parsed
    // If the string looks like a number, try Excel date conversion
    if (/^\d+(\.\d+)?$/.test(dateString)) {
      try {
        const numericValue = parseFloat(dateString);
        // Excel dates typically start around 40000 for recent years
        if (numericValue > 1000) {
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch);
          date.setDate(date.getDate() + Math.floor(numericValue));
          
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const result = `${year}-${month}-${day}`;
            console.log(`DEBUG: Last resort Excel conversion ${dateString} → ${result}`);
            return result;
          }
        }
      } catch (e) {
        // Ignore errors in last resort attempt
      }
    }
    
    console.error(`DEBUG: Failed to parse date value: ${dateString}, returning null`);
    return null;
  } catch (error) {
    console.error('DEBUG: Date parsing error:', error, 'for value:', dateValue, 'returning null');
    return null;
  }
}

function parseAmount(amountStr: string | number): number {
  // Debug the incoming amount
  console.log('DEBUG parseAmount input:', amountStr, typeof amountStr);
  
  // If it's already a number, return it directly
  if (typeof amountStr === 'number') {
    console.log('DEBUG parseAmount (number):', amountStr);
    return amountStr;
  }
  
  // Handle null/undefined/empty
  if (!amountStr) return 0;
  
  // Convert to string and trim
  const inputStr = String(amountStr).trim();
  console.log('DEBUG parseAmount (as string):', inputStr);
  
  // Handle Turkish number format (1.234,56 → 1234.56)
  // Step 1: Remove any currency symbols and spaces
  let cleanAmount = inputStr.replace(/[^\d.,\-]/g, '');
  
  // Step 2: Handle Turkish number format (if there are both commas and periods)
  if (cleanAmount.includes(',') && cleanAmount.includes('.')) {
    // In Turkish format, thousands separator is . and decimal is ,
    cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
  } else if (cleanAmount.includes(',')) {
    // If only comma exists, treat it as decimal point
    cleanAmount = cleanAmount.replace(',', '.');
  }
  
  // Convert to number
  const result = parseFloat(cleanAmount);
  console.log('DEBUG parseAmount result:', result);
  
  return isNaN(result) ? 0 : result;
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
        // Check if "Tarih" column exists - this is critical
        if (!row['Tarih']) {
          const errorMsg = `Row ${results.inserted + results.errors.length + 1}: Missing required "Tarih" field`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
          continue;
        }
        
        // Parse the date field first and try to extract year/month
        const originalDateValue = row['Tarih'];
        const parsedDate = parseDate(originalDateValue);
        
        // Get year and month from raw date or system date as fallback
        let year = new Date().getFullYear();
        let month = new Date().getMonth() + 1;
        
        // If we have a valid date, use it. Otherwise try to extract info from original date
        if (parsedDate) {
          // Extract year/month from the parsed date
          const dateParts = parsedDate.split('-');
          if (dateParts.length === 3) {
            year = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]);
          }
        } else {
          // If date is invalid but we can extract month and year info from the original value
          if (originalDateValue instanceof Date && !isNaN(originalDateValue.getTime())) {
            // Extract info from JS Date
            year = originalDateValue.getFullYear();
            month = originalDateValue.getMonth() + 1;
            
            // Create a valid ISO date string
            const day = originalDateValue.getDate();
            const parsedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            console.log(`Recovered date from JS Date object: ${parsedDate}`);
          } else {
            // Could not parse date at all - log error but continue with default date
            const errorMsg = `Row ${results.inserted + results.errors.length + 1}: Invalid date format in "Tarih" field: ${originalDateValue}. Using current date.`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
            
            // Use current date as fallback
            const now = new Date();
            const currentISODate = now.toISOString().split('T')[0];
            console.log(`Using current date as fallback: ${currentISODate}`);
          }
        }
        
        // Create a mapping of DB fields to values from the Excel row
        const mappedData: Record<string, any> = {
          payment_date: parsedDate || new Date().toISOString().split('T')[0], // Use validated date or today as fallback
          year: year,  // Use extracted or default year
          month: month // Use extracted or default month
        };
        
        // Find payment method column
        let paymentMethodCol = Object.keys(FIELD_MAPPING).find(col => FIELD_MAPPING[col] === 'payment_method');
        let paymentMethod = paymentMethodCol ? (row[paymentMethodCol] as string) : '';
        
        // Find amount columns 
        let amountPaidCol = Object.keys(FIELD_MAPPING).find(col => FIELD_MAPPING[col] === 'amount_paid');
        let currencyPaidCol = Object.keys(FIELD_MAPPING).find(col => FIELD_MAPPING[col] === 'currency_paid');
        
        // Debug what's happening with key fields
        console.log(`Row processing - Payment method column: ${paymentMethodCol}, value: ${paymentMethod}`);
        console.log(`Row processing - Amount column: ${amountPaidCol}, value:`, row[amountPaidCol || '']);
        
        // Map fields from Excel columns to database fields
        for (const [excelCol, dbField] of Object.entries(FIELD_MAPPING)) {
          if (row[excelCol] !== undefined) {
            // Special handling for certain fields
            if (dbField === 'amount_paid' || dbField === 'amount_due' || dbField === 'exchange_rate') {
              mappedData[dbField] = parseAmount(row[excelCol]);
              console.log(`Parsing amount for ${dbField}: ${row[excelCol]} -> ${mappedData[dbField]}`);
            } 
            else if (dbField === 'payment_method') {
              mappedData[dbField] = PAYMENT_METHOD_MAPPING[row[excelCol] as keyof typeof PAYMENT_METHOD_MAPPING] || row[excelCol] || '';
            }
            else if (dbField === 'is_deposit') {
              mappedData[dbField] = row[excelCol] === 'TRUE' ? 1 : 0;
            }
            else if (dbField === 'check_due_date') {
              mappedData[dbField] = parseDate(row[excelCol]);
            }
            else if (dbField === 'year' || dbField === 'month') {
              mappedData[dbField] = parseInt(row[excelCol]) || (dbField === 'year' ? new Date().getFullYear() : new Date().getMonth() + 1);
            }
            else {
              // Default handling for text fields
              mappedData[dbField] = row[excelCol] || '';
            }
          } else {
            // Set defaults for missing fields
            if (dbField === 'amount_paid' || dbField === 'amount_due' || dbField === 'exchange_rate') {
              mappedData[dbField] = 0;
            } 
            else if (dbField === 'currency_paid' || dbField === 'currency_due') {
              mappedData[dbField] = 'TRY';
            }
            else if (dbField === 'year') {
              mappedData[dbField] = new Date().getFullYear();
            }
            else if (dbField === 'month') {
              mappedData[dbField] = new Date().getMonth() + 1;
            }
            else {
              mappedData[dbField] = '';
            }
          }
        }
        
        // Ensure all required fields are present with defaults
        const requiredFields = [
          'customer_name', 'sales_person', 'activity_no', 'payment_date', 'payment_method',
          'account_name', 'amount_due', 'currency_due', 'amount_paid', 'currency_paid',
          'exchange_rate', 'is_deposit', 'year', 'month', 'description', 'property_units',
          'project_name', 'account_description', 'check_due_date', 'agency_name', 'status'
        ];
        
        for (const field of requiredFields) {
          if (mappedData[field] === undefined) {
            if (['amount_paid', 'amount_due', 'exchange_rate'].includes(field)) {
              mappedData[field] = 0;
            } else if (['currency_paid', 'currency_due'].includes(field)) {
              mappedData[field] = 'TRY';
            } else if (field === 'is_deposit') {
              mappedData[field] = 0;
            } else if (field === 'year') {
              mappedData[field] = new Date().getFullYear();
            } else if (field === 'month') {
              mappedData[field] = new Date().getMonth() + 1;
            } else {
              mappedData[field] = '';
            }
          }
        }
        
        // Log the mapped data for debugging
        console.log(`Row ${results.inserted + 1} - Mapped Data:`, {
          payment_date: mappedData.payment_date,
          amount_paid: mappedData.amount_paid,
          currency_paid: mappedData.currency_paid
        });

        // Insert into payments table
        await db.run(`
          INSERT INTO payments (
            customer_name, sales_person, activity_no, payment_date, payment_method,
            account_name, amount_due, currency_due, amount_paid, currency_paid,
            exchange_rate, is_deposit, year, month, description, property_units,
            project_name, account_description, check_due_date, agency_name, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          mappedData.customer_name, mappedData.sales_person, mappedData.activity_no,
          mappedData.payment_date, mappedData.payment_method, mappedData.account_name,
          mappedData.amount_due, mappedData.currency_due, mappedData.amount_paid,
          mappedData.currency_paid, mappedData.exchange_rate, mappedData.is_deposit,
          mappedData.year, mappedData.month, mappedData.description,
          mappedData.property_units, mappedData.project_name, mappedData.account_description,
          mappedData.check_due_date, mappedData.agency_name, mappedData.status
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

  // Add deprecation notice
  console.warn('DEPRECATED: Using legacy import endpoint without duplicate detection.');

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

    // Read the Excel file - Use raw mode first to see exactly what's in the file
    const workbookRaw = XLSX.readFile(file.filepath, { 
      raw: true  // Get raw values without any conversion
    });
    
    console.log("DEBUG: Excel file read in raw mode to analyze content");
    
    // Now read with proper date conversion and enhanced Turkish date format support
    const workbook = XLSX.readFile(file.filepath, { 
      cellDates: true,       // This tells XLSX to convert Excel dates to JS Date objects
      dateNF: 'dd/mm/yyyy',  // Turkish date format for parsing
      cellNF: true,          // Keep number formats
      WTF: true              // Show more detailed errors with Excel parsing
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with careful options specifically for Turkish date formats
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false,            // Don't use raw values
      dateNF: 'dd/mm/yyyy',  // Turkish date format for parsing
      defval: '',            // Default value for empty cells
      blankrows: false       // Skip blank rows
    });

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in Excel file' });
    }
    
    // Debug logging for column names and first few rows
    const firstRow = jsonData[0] as Record<string, any>;
    const excelColumns = Object.keys(firstRow);
    console.log('Excel Import - Detected columns:', excelColumns.join(', '));
    
    // We're not actually using the 'header: A' option since we need column names
    // Log data format
    console.log('Excel data structure check:', {
      firstRowKeys: Object.keys(firstRow),
      isFirstRowObject: firstRow !== null && typeof firstRow === 'object'
    });
    
    // Build the dynamic field mapping based on actual Excel columns
    FIELD_MAPPING = {}; // Reset mapping
    Object.entries(FIELD_PATTERNS).forEach(([dbField, pattern]) => {
      const matchedColumn = findColumnByPattern(excelColumns, pattern);
      if (matchedColumn) {
        FIELD_MAPPING[matchedColumn] = dbField;
        console.log(`Mapped column "${matchedColumn}" to field "${dbField}"`);
      } else {
        console.log(`No match found for field "${dbField}"`);
      }
    });
    
    // Debug ALL column names and types in detail
    console.log('Excel Import - Column details:');
    Object.entries(firstRow).forEach(([key, value]) => {
      console.log(`- ${key}: ${typeof value}, Sample value: ${JSON.stringify(value)}`);
    });
    
    // Check if "Tarih" column exists
    if (!firstRow.hasOwnProperty('Tarih')) {
      console.error('Critical error: "Tarih" column not found in the Excel file');
      return res.status(400).json({ 
        error: 'Missing required column "Tarih"', 
        availableColumns: Object.keys(firstRow),
        message: 'The "Tarih" column is required for payment dates. Please make sure this column exists in your Excel file.'
      });
    }
    
    // Debug payment amount column specifically - this is critical
    const amountColumnName = 'Ödenen Tutar(Σ:12,767,688.23)';
    const alternateAmountColumn = 'Ödenen Tutar(Σ:12,438,088.23)';
    
    console.log('Excel Import - Payment Amount Details:');
    const actualAmountColumn = firstRow.hasOwnProperty(amountColumnName) ? amountColumnName : 
                             (firstRow.hasOwnProperty(alternateAmountColumn) ? alternateAmountColumn : null);
    
    if (actualAmountColumn) {
      console.log(`Found amount column: ${actualAmountColumn}`);
      // Check first 3 rows amounts
      jsonData.slice(0, 3).forEach((row: any, index) => {
        const rawAmount = row[actualAmountColumn];
        console.log(`Row ${index + 1} amount:`, {
          raw: rawAmount,
          type: typeof rawAmount,
          parsed: parseAmount(rawAmount)
        });
      });
    } else {
      console.error('WARNING: Amount column not found. Available columns:', Object.keys(firstRow));
    }
    
    // Debug log first few Tarih values
    console.log('Excel Import - First 3 Tarih values:', jsonData.slice(0, 3).map((row: any) => {
      const rawDate = row['Tarih'];
      const parsedDate = parseDate(rawDate);
      return {
        raw: rawDate,
        type: typeof rawDate,
        parsed: parsedDate,
        valueProperties: Object.getOwnPropertyNames(rawDate)
      };
    }));
    
    // Try to better understand the Excel date format by looking at all properties
    if (jsonData.length > 0) {
      const sampleDate = (jsonData[0] as any)['Tarih'];
      console.log('Excel Import - Sample date value details:');
      console.log('- Type:', typeof sampleDate);
      console.log('- Raw value:', sampleDate);
      console.log('- Is numeric:', !isNaN(Number(sampleDate)));
      console.log('- As number:', Number(sampleDate));
    }

    // Insert data into database
    const results = await insertPaymentData(jsonData);

    // Clean up uploaded file
    fs.unlinkSync(file.filepath);

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

    // Return results with notice about new import page
    res.status(200).json({
      success: true,
      message: `Import completed. Inserted ${results.inserted} records. Weekly reports auto-generated.`,
      inserted: results.inserted,
      errors: results.errors,
      totalRows: jsonData.length,
      notice: 'Consider using the new import page with duplicate detection for better results.'
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