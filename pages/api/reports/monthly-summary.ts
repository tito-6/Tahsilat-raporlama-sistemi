import { NextApiRequest, NextApiResponse } from 'next';
import { getDbConnection, initializeDatabase } from '../../../lib/utils/database';

// Helper function to convert currency to USD using TCMB rates
async function convertToUSD(amount: number, currency: string): Promise<number> {
  // Use STANDARD exchange rate logic - same as payments and reports
  const STANDARD_TL_TO_USD_RATE = 0.029;
  const STANDARD_EUR_TO_USD_RATE = 1.1;
  
  if (currency === 'USD') {
    return amount;
  } else if (currency === 'TL' || currency === 'TRY') {
    return amount * STANDARD_TL_TO_USD_RATE;
  } else if (currency === 'EUR') {
    return amount * STANDARD_EUR_TO_USD_RATE;
  } else {
    // Fallback for any other currency - treat as TL
    return amount * STANDARD_TL_TO_USD_RATE;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const dbPath = process.cwd();
    
    // Initialize PostgreSQL database
    await initializeDatabase();
    const client = await getDbConnection();

    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString();

    console.log(`Fetching monthly summary for ${monthStr}/${yearStr}`);

    // Get all payments for the specified month using PostgreSQL
    const paymentsResult = await client.query(`
      SELECT 
        payment_method,
        currency_paid,
        amount_paid,
        exchange_rate,
        account_type as account_name,
        CASE 
          WHEN currency_paid = 'USD' THEN amount_paid::numeric
          ELSE amount_paid::numeric * exchange_rate::numeric
        END as amount_usd
      FROM payments 
      WHERE EXTRACT(YEAR FROM payment_date) = $1 
        AND EXTRACT(MONTH FROM payment_date) = $2
    `, [year, month]);

    const payments = paymentsResult.rows;
    console.log(`Found ${payments.length} payments for ${monthStr}/${yearStr}`);

    // Group payments by payment method and project type
    const mkm_summary: Record<string, { tl: number; usd: number }> = {
      'Banka Havalesi': { tl: 0, usd: 0 },
      'Nakit': { tl: 0, usd: 0 },
      'Çek': { tl: 0, usd: 0 },
      'Genel Toplam': { tl: 0, usd: 0 }
    };

    const msm_summary: Record<string, { tl: number; usd: number }> = {
      'Banka Havalesi': { tl: 0, usd: 0 },
      'Nakit': { tl: 0, usd: 0 },
      'Çek': { tl: 0, usd: 0 },
      'Genel Toplam': { tl: 0, usd: 0 }
    };

    const general_summary: Record<string, { tl: number; usd: number }> = {
      'Banka Havalesi': { tl: 0, usd: 0 },
      'Nakit': { tl: 0, usd: 0 },
      'Çek': { tl: 0, usd: 0 },
      'Toplam': { tl: 0, usd: 0 }
    };

    // Process each payment
    for (const payment of payments) {
      const currency = payment.currency_paid || 'TL';
      const originalAmount = payment.amount_paid || 0;
      const usdAmount = await convertToUSD(originalAmount, currency);
      
      // Determine payment method label
      let methodLabel = 'Nakit'; // Default
      if (payment.payment_method === 'Bank Transfer') {
        methodLabel = 'Banka Havalesi';
      } else if (payment.payment_method === 'Check') {
        methodLabel = 'Çek';
      } else if (payment.payment_method === 'Cash') {
        methodLabel = 'Nakit';
      }

      // Determine if MKM or MSM based on account name
      const accountName = payment.account_name || '';
      const isMSM = accountName.toLowerCase().includes('kapakli');
      const isMKM = !isMSM; // Default to MKM if not MSM

      // Add to appropriate summaries
      if (isMKM) {
        mkm_summary[methodLabel].tl += originalAmount;
        mkm_summary[methodLabel].usd += usdAmount;
        mkm_summary['Genel Toplam'].tl += originalAmount;
        mkm_summary['Genel Toplam'].usd += usdAmount;
      } else {
        msm_summary[methodLabel].tl += originalAmount;
        msm_summary[methodLabel].usd += usdAmount;
        msm_summary['Genel Toplam'].tl += originalAmount;
        msm_summary['Genel Toplam'].usd += usdAmount;
      }

      // Add to general summary
      general_summary[methodLabel].tl += originalAmount;
      general_summary[methodLabel].usd += usdAmount;
      general_summary['Toplam'].tl += originalAmount;
      general_summary['Toplam'].usd += usdAmount;
    }

    client.release();

    const monthNames = [
      '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    res.status(200).json({
      success: true,
      data: {
        mkm_summary,
        msm_summary,
        general_summary,
        month_name: monthNames[parseInt(month as string)],
        year: parseInt(year as string),
        total_payments: payments.length
      }
    });

  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly summary',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}