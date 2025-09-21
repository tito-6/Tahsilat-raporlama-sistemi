/**
 * Date parsing utilities for the Tahsilat Raporu application
 * Handles both Excel date format and Turkish date format (DD/MM/YYYY)
 */

/**
 * Converts Excel date value to JavaScript Date
 * Excel dates are stored as number of days since 1/1/1900
 * Needs to handle the Excel leap year bug (Excel assumes 1900 was a leap year)
 */
export function excelDateToJSDate(excelDate: number): Date {
  // Excel uses 1/1/1900 as day 1 (serial number 1)
  // JavaScript dates are milliseconds from 1/1/1970
  // Need to convert and handle the Excel leap year bug
  
  // Create a new date starting from Excel's 1/1/1900
  const jsDate = new Date(Date.UTC(1900, 0, 0));
  
  // Add days, but handle the leap year bug
  // Excel incorrectly assumes 1900 was a leap year, so for dates after 2/28/1900,
  // we need to subtract a day
  if (excelDate < 60) {
    // Dates before the "leap day" (2/29/1900) are fine
    jsDate.setUTCDate(jsDate.getUTCDate() + Math.floor(excelDate));
  } else {
    // Dates on or after the non-existent 2/29/1900 need to be adjusted
    jsDate.setUTCDate(jsDate.getUTCDate() + Math.floor(excelDate) - 1);
  }
  
  return jsDate;
}

/**
 * Parse Turkish date format (DD/MM/YYYY or DD.MM.YYYY)
 * Also handles standard date strings and Excel numeric dates
 */
export function parseTurkishDate(dateStr: string | Date | number): Date {
  // If null or undefined, return current date as fallback
  if (dateStr === null || dateStr === undefined) return new Date();
  
  // Check if it's already a Date object
  if (dateStr instanceof Date) return dateStr;
  
  // Check if it's a numeric Excel date
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(Number(dateStr)))) {
    const numValue = typeof dateStr === 'string' ? Number(dateStr) : dateStr;
    // Typical Excel dates are between 1 (1/1/1900) and ~45000 (current dates)
    if (numValue > 0 && numValue < 50000) {
      return excelDateToJSDate(numValue);
    }
  }
  
  // For string processing
  if (typeof dateStr === 'string') {
    console.log(`Parsing date string: ${dateStr}`);
    
    // Handle DD/MM/YYYY format
    const formatRegex1 = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match1 = dateStr.match(formatRegex1);
    if (match1) {
      const [, day, month, year] = match1;
      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsedDate.getTime())) {
        console.log(`Parsed DD/MM/YYYY: ${dateStr} -> ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    }
    
    // Handle DD.MM.YYYY format
    const formatRegex2 = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match2 = dateStr.match(formatRegex2);
    if (match2) {
      const [, day, month, year] = match2;
      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsedDate.getTime())) {
        console.log(`Parsed DD.MM.YYYY: ${dateStr} -> ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    }
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

/**
 * Format a date as DD/MM/YYYY (Turkish format)
 */
export function formatTurkishDate(date: Date | string | number): string {
  const dateObj = parseTurkishDate(date);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format a date as YYYY-MM-DD (ISO format)
 */
export function formatISODate(date: Date | string | number): string {
  const dateObj = parseTurkishDate(date);
  return dateObj.toISOString().split('T')[0];
}