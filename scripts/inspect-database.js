/**
 * Node.js Database Inspector - matches your Next.js environment exactly
 * Usage: node scripts/inspect-database.js
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function inspectDatabase() {
  const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
  
  console.log('🔍 Database Inspector (Node.js)');
  console.log('=' .repeat(50));
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Get total count
    const totalResult = await db.get('SELECT COUNT(*) as count FROM payments');
    console.log(`\n📊 Total payment records: ${totalResult.count}`);

    if (totalResult.count === 0) {
      console.log('📭 No payment records found in database');
      await db.close();
      return;
    }

    // Get sample records
    const sampleRecords = await db.all(`
      SELECT 
        id,
        payment_date,
        customer_name,
        amount_paid,
        currency_paid,
        created_at
      FROM payments 
      ORDER BY id 
      LIMIT 10
    `);

    console.log('\n🔍 Sample payment records (first 10):');
    console.log('=' .repeat(80));
    
    sampleRecords.forEach((record, index) => {
      console.log(`Record ${index + 1} (ID: ${record.id}):`);
      console.log(`  payment_date: [${record.payment_date}] (Type: ${typeof record.payment_date})`);
      console.log(`  customer_name: [${record.customer_name}]`);
      console.log(`  amount_paid: [${record.amount_paid}]`);
      console.log(`  currency_paid: [${record.currency_paid}]`);
      console.log(`  created_at: [${record.created_at}]`);
      console.log('-' .repeat(40));
    });

    // Count NULL vs valid dates
    const nullDates = await db.get('SELECT COUNT(*) as count FROM payments WHERE payment_date IS NULL');
    const validDates = await db.get('SELECT COUNT(*) as count FROM payments WHERE payment_date IS NOT NULL');

    console.log('\n📈 Payment Date Analysis:');
    console.log(`  ✅ Valid dates: ${validDates.count}`);
    console.log(`  ❌ NULL dates: ${nullDates.count}`);

    if (validDates.count > 0) {
      // Show unique date values
      const uniqueDates = await db.all('SELECT DISTINCT payment_date FROM payments WHERE payment_date IS NOT NULL LIMIT 10');
      console.log(`  📅 Sample valid dates: ${uniqueDates.map(row => row.payment_date).join(', ')}`);
      
      // Check for date format patterns
      const datePatterns = await db.all(`
        SELECT 
          payment_date,
          LENGTH(payment_date) as date_length,
          COUNT(*) as count
        FROM payments 
        WHERE payment_date IS NOT NULL
        GROUP BY payment_date, LENGTH(payment_date)
        ORDER BY count DESC
        LIMIT 5
      `);
      
      console.log('\n📊 Date format analysis:');
      datePatterns.forEach(pattern => {
        console.log(`  "${pattern.payment_date}" (length: ${pattern.date_length}, count: ${pattern.count})`);
      });
    }

    await db.close();
    
  } catch (error) {
    console.error('❌ Error inspecting database:', error);
  }
}

async function clearDatabase() {
  const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
  
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    const beforeCount = await db.get('SELECT COUNT(*) as count FROM payments');
    await db.run('DELETE FROM payments');
    
    console.log(`✅ Deleted ${beforeCount.count} payment records from database`);
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('⚠️  Are you sure you want to delete ALL payment records? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        await clearDatabase();
      } else {
        console.log('❌ Operation cancelled');
      }
      rl.close();
    });
  } else {
    await inspectDatabase();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { inspectDatabase, clearDatabase };