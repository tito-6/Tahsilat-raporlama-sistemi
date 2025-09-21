/**
 * Date utility functions for handling Turkish date formats in the frontend
 */

/**
 * Parses a date string in DD/MM/YYYY format or ISO YYYY-MM-DD format
 * @param dateValue - Date string in DD/MM/YYYY or YYYY-MM-DD format
 * @returns Date object or null if parsing fails
 */
export function parseDate(dateValue: string | null | undefined): Date | null {
  if (!dateValue || typeof dateValue !== 'string') {
    return null;
  }

  const dateString = dateValue.trim();
  
  try {
    // Handle ISO format (YYYY-MM-DD) - can use native Date parsing
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString + 'T00:00:00.000Z'); // Ensure UTC to avoid timezone issues
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle DD/MM/YYYY format (Turkish format from database)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        // Validate ranges
        if (year >= 1900 && year <= 2100 && 
            month >= 1 && month <= 12 && 
            day >= 1 && day <= 31) {
          // Create date with explicit values (month is 0-indexed in JavaScript)
          const date = new Date(year, month - 1, day);
          return isNaN(date.getTime()) ? null : date;
        }
      }
    }

    // Handle DD.MM.YYYY format (alternative Turkish format)
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateString)) {
      const parts = dateString.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        if (year >= 1900 && year <= 2100 && 
            month >= 1 && month <= 12 && 
            day >= 1 && day <= 31) {
          const date = new Date(year, month - 1, day);
          return isNaN(date.getTime()) ? null : date;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Date parsing error:', error, 'for value:', dateValue);
    return null;
  }
}

/**
 * Formats a date for display in Turkish locale
 * @param dateValue - Date string in DD/MM/YYYY or YYYY-MM-DD format
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted date string or 'Invalid Date' / 'N/A'
 */
export function formatDate(dateValue: string | null | undefined, locale: string = 'tr-TR'): string {
  if (!dateValue) {
    return 'N/A';
  }

  const date = parseDate(dateValue);
  if (!date) {
    return 'Invalid Date';
  }

  try {
    // Format with Turkish locale by default
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    // Fallback to basic formatting
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

/**
 * Formats a date for display in a more readable format
 * @param dateValue - Date string in DD/MM/YYYY or YYYY-MM-DD format
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted date string like "1 Eylül 2025"
 */
export function formatDateLong(dateValue: string | null | undefined, locale: string = 'tr-TR'): string {
  if (!dateValue) {
    return 'N/A';
  }

  const date = parseDate(dateValue);
  if (!date) {
    return 'Invalid Date';
  }

  try {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    // Fallback to short format
    return formatDate(dateValue, locale);
  }
}

/**
 * Converts a date to ISO format (YYYY-MM-DD) for API calls
 * @param dateValue - Date string in DD/MM/YYYY or YYYY-MM-DD format
 * @returns ISO date string or null
 */
export function toISODate(dateValue: string | null | undefined): string | null {
  const date = parseDate(dateValue);
  if (!date) {
    return null;
  }

  try {
    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

/**
 * Checks if a date string is valid
 * @param dateValue - Date string to validate
 * @returns true if the date can be parsed successfully
 */
export function isValidDate(dateValue: string | null | undefined): boolean {
  return parseDate(dateValue) !== null;
}