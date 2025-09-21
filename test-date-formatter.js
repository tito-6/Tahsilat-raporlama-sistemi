// Test the dateFormatter functions with actual database values/**

 * Test file to verify the dateFormatter utility works correctly

// Since this is a .js file, we need to use require and handle TypeScript import differently * Run this with: node test-date-formatter.js

// Let's test the logic directly */



function parseDate(dateValue) {// Simulated version of the date formatter for testing in Node.js

  if (!dateValue || typeof dateValue !== 'string') {function parseDate(dateValue) {

    return null;  if (!dateValue || typeof dateValue !== 'string') {

  }    return null;

  }

  const dateString = dateValue.trim();

    const dateString = dateValue.trim();

  try {  

    // Handle ISO format (YYYY-MM-DD)  try {

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {    // Handle ISO format (YYYY-MM-DD)

      const date = new Date(dateString + 'T00:00:00.000Z');    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {

      return isNaN(date.getTime()) ? null : date;      const date = new Date(dateString + 'T00:00:00.000Z');

    }      return isNaN(date.getTime()) ? null : date;

    }

    // Handle DD/MM/YYYY format (Turkish format from database)

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {    // Handle DD/MM/YYYY format (Turkish format from database)

      const parts = dateString.split('/');    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {

      if (parts.length === 3) {      const parts = dateString.split('/');

        const day = parseInt(parts[0], 10);      if (parts.length === 3) {

        const month = parseInt(parts[1], 10);        const day = parseInt(parts[0], 10);

        const year = parseInt(parts[2], 10);        const month = parseInt(parts[1], 10);

                const year = parseInt(parts[2], 10);

        // Validate ranges        

        if (year >= 1900 && year <= 2100 &&         if (year >= 1900 && year <= 2100 && 

            month >= 1 && month <= 12 &&             month >= 1 && month <= 12 && 

            day >= 1 && day <= 31) {            day >= 1 && day <= 31) {

          // Create date with explicit values (month is 0-indexed in JavaScript)          // Create date with explicit values (month is 0-indexed in JavaScript)

          const date = new Date(year, month - 1, day);          const date = new Date(year, month - 1, day);

          return isNaN(date.getTime()) ? null : date;          return isNaN(date.getTime()) ? null : date;

        }        }

      }      }

    }    }



    return null;    return null;

  } catch (error) {  } catch (error) {

    console.error('Date parsing error:', error, 'for value:', dateValue);    console.error('Date parsing error:', error, 'for value:', dateValue);

    return null;    return null;

  }  }

}}



function formatDate(dateValue, locale = 'tr-TR') {function formatDate(dateValue, locale = 'tr-TR') {

  if (!dateValue) {  if (!dateValue) {

    return 'N/A';    return 'N/A';

  }  }



  const date = parseDate(dateValue);  const date = parseDate(dateValue);

  if (!date) {  if (!date) {

    return 'Invalid Date';    return 'Invalid Date';

  }  }



  try {  try {

    // Format with Turkish locale by default    return date.toLocaleDateString(locale, {

    return date.toLocaleDateString(locale, {      year: 'numeric',

      year: 'numeric',      month: '2-digit',

      month: '2-digit',      day: '2-digit'

      day: '2-digit'    });

    });  } catch (error) {

  } catch (error) {    // Fallback to basic formatting

    // Fallback to basic formatting    const day = date.getDate().toString().padStart(2, '0');

    const day = date.getDate().toString().padStart(2, '0');    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const month = (date.getMonth() + 1).toString().padStart(2, '0');    const year = date.getFullYear();

    const year = date.getFullYear();    return `${day}/${month}/${year}`;

    return `${day}/${month}/${year}`;  }

  }}

}

// Test cases based on your actual database data

// Test cases from your actual databaseconsole.log('🧪 Testing Frontend Date Parsing');

const testDates = [console.log('=' .repeat(50));

  '01/09/2025',

  '02/09/2025', const testCases = [

  '03/09/2025',  '01/09/2025', // Should work - September 1st

  '16/09/2025',  '15/09/2025', // Should work - September 15th  

  '04/09/2025',  '31/12/2025', // Should work - December 31st

  null,  '12/09/2025', // Should work - September 12th

  undefined,  '2025-09-19', // Should work - ISO format

  '',  '99/99/9999', // Should fail - invalid date

  'invalid'  null,         // Should return N/A

];  '',           // Should return N/A

  'invalid',    // Should fail

console.log('🧪 Testing Date Formatter with Database Values:');];

console.log('=' .repeat(60));

testCases.forEach(testCase => {

testDates.forEach(dateValue => {  const result = formatDate(testCase);

  console.log(`Input: [${dateValue}]`);  console.log(`Input: "${testCase}" -> Output: "${result}"`);

  });

  const parsed = parseDate(dateValue);

  console.log(`  Parsed: ${parsed ? parsed.toISOString() : 'null'}`);console.log('\n✅ Expected behavior:');

  console.log('• DD/MM/YYYY dates should be parsed correctly');

  const formatted = formatDate(dateValue);console.log('• Invalid dates should show "Invalid Date"');

  console.log(`  Formatted: ${formatted}`);console.log('• Null/empty values should show "N/A"');

  console.log('• All valid dates should format consistently');
  console.log('-' .repeat(40));
});

console.log('\n✅ Expected results:');
console.log('01/09/2025 should show as 01.09.2025 (September 1st)');
console.log('16/09/2025 should show as 16.09.2025 (September 16th)');
console.log('null/invalid should show as "N/A" or "Invalid Date"');