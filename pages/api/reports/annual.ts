import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year } = req.query;
    
    if (!year) {
      return res.status(400).json({ error: 'year is required' });
    }

    const dbPath = path.join(process.cwd(), 'tahsilat_data.db');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Monthly breakdown for the year
    const monthlyBreakdown = await db.all(`
      SELECT 
        month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT project_name) as unique_projects
      FROM payments 
      WHERE year = ?
      GROUP BY month
      ORDER BY month ASC
    `, [year]);

    // Quarterly summary
    const quarterlySummary = await db.all(`
      SELECT 
        CASE 
          WHEN month IN (1,2,3) THEN 'Q1'
          WHEN month IN (4,5,6) THEN 'Q2'
          WHEN month IN (7,8,9) THEN 'Q3'
          WHEN month IN (10,11,12) THEN 'Q4'
        END as quarter,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT project_name) as unique_projects
      FROM payments 
      WHERE year = ?
      GROUP BY quarter
      ORDER BY quarter ASC
    `, [year]);

    // Annual summary
    const annualSummary = await db.get(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_amount_usd,
        COUNT(DISTINCT customer_name) as unique_customers,
        COUNT(DISTINCT project_name) as unique_projects,
        COUNT(DISTINCT payment_method) as payment_methods_used,
        AVG(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as avg_payment_usd
      FROM payments 
      WHERE year = ?
    `, [year]);

    // Top customers for the year
    const topCustomers = await db.all(`
      SELECT 
        customer_name,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd
      FROM payments 
      WHERE year = ?
      GROUP BY customer_name
      ORDER BY total_usd DESC
      LIMIT 15
    `, [year]);

    // Top projects for the year
    const topProjects = await db.all(`
      SELECT 
        project_name,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        COUNT(DISTINCT customer_name) as unique_customers
      FROM payments 
      WHERE year = ?
      GROUP BY project_name
      ORDER BY total_usd DESC
      LIMIT 15
    `, [year]);

    // Payment method analysis
    const paymentMethodAnalysis = await db.all(`
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN currency_paid = 'USD' THEN amount_paid ELSE amount_paid * exchange_rate END) as total_usd,
        ROUND(
          100.0 * COUNT(*) / (SELECT COUNT(*) FROM payments WHERE year = ?), 
          2
        ) as percentage
      FROM payments 
      WHERE year = ?
      GROUP BY payment_method
      ORDER BY total_usd DESC
    `, [year, year]);

    await db.close();

    res.status(200).json({
      success: true,
      data: {
        monthly_breakdown: monthlyBreakdown,
        quarterly_summary: quarterlySummary,
        annual_summary: annualSummary,
        top_customers: topCustomers,
        top_projects: topProjects,
        payment_method_analysis: paymentMethodAnalysis
      },
      year: parseInt(year as string)
    });

  } catch (error) {
    console.error('Annual report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate annual report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}